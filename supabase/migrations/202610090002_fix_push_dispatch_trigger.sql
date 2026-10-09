-- Corrective migration: the push dispatch trigger must not abort notification
-- creation when pg_net fails, and must reference net.http_post without the
-- invalid "extensions." prefix (which Postgres interprets as a cross-database
-- reference).

create or replace function public.dispatch_push_for_notification()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  dispatcher_url text;
  dispatcher_secret text;
  actor_name text;
begin
  select decrypted_secret into dispatcher_url
  from vault.decrypted_secrets where name = 'push_dispatcher_function_url';
  select decrypted_secret into dispatcher_secret
  from vault.decrypted_secrets where name = 'push_dispatcher_secret';

  -- Without Vault provisioning, push stays silently disabled: the
  -- notification row is still created and email behaviour is untouched.
  if coalesce(btrim(dispatcher_url), '') = ''
     or coalesce(btrim(dispatcher_secret), '') = '' then
    return new;
  end if;

  select display_name into actor_name
  from public.profiles where id = new.actor_user_id;

  begin
    perform net.http_post(
      url := dispatcher_url,
      headers := jsonb_build_object(
        'content-type', 'application/json',
        'authorization', 'Bearer ' || dispatcher_secret
      ),
      body := jsonb_build_object(
        'notification_id', new.id,
        'user_id', new.user_id,
        'type', new.type,
        'actor_display_name', actor_name,
        'actor_user_id', new.actor_user_id
      )
    );
  exception when others then
    -- Push delivery is best-effort: an http_post failure must never abort
    -- the notification transaction.
    null;
  end;

  return new;
end;
$$;
