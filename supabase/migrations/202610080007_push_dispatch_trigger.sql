-- Fan out push delivery when an Activity notification is created.
-- The dispatcher runs asynchronously (pg_net); notification creation itself
-- never depends on push delivery succeeding. The dispatcher secret stays in
-- Vault and is fetched at dispatch time, following the weekly-digest pattern.

create extension if not exists pg_net with schema extensions;

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

  perform extensions.net.http_post(
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

  return new;
end;
$$;

create trigger push_dispatch_on_notification_insert
  after insert on public.notifications
  for each row
  execute function public.dispatch_push_for_notification();

revoke all on function public.dispatch_push_for_notification() from public, anon, authenticated, service_role;
grant execute on function public.dispatch_push_for_notification() to postgres;
