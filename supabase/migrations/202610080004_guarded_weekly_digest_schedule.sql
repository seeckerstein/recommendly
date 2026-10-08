create or replace function public.weekly_digest_cron_schedule()
returns text
language sql
immutable
as $$
  select '0 16 * * 5'::text;
$$;

create or replace function public.enable_weekly_recommendations_email_schedule()
returns bigint
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  function_url text;
  cron_secret text;
  publishable_key text;
  job_id bigint;
begin
  select decrypted_secret into function_url
  from vault.decrypted_secrets where name = 'weekly_digest_function_url';
  select decrypted_secret into cron_secret
  from vault.decrypted_secrets where name = 'weekly_digest_cron_secret';
  select decrypted_secret into publishable_key
  from vault.decrypted_secrets where name = 'weekly_digest_publishable_key';

  if coalesce(btrim(function_url), '') = ''
     or coalesce(btrim(cron_secret), '') = ''
     or coalesce(btrim(publishable_key), '') = '' then
    raise exception 'Provision weekly_digest_function_url, weekly_digest_cron_secret, and weekly_digest_publishable_key in Vault before enabling the digest schedule';
  end if;

  perform cron.unschedule(jobid)
  from cron.job
  where jobname = 'weekly-recommendations-email';

  select cron.schedule(
    'weekly-recommendations-email',
    public.weekly_digest_cron_schedule(),
    $job$
      select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'weekly_digest_function_url'),
        headers := jsonb_build_object(
          'content-type', 'application/json',
          'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'weekly_digest_publishable_key'),
          'authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'weekly_digest_cron_secret')
        ),
        body := '{}'::jsonb
      );
    $job$
  ) into job_id;

  return job_id;
end;
$$;

revoke all on function public.enable_weekly_recommendations_email_schedule() from public, anon, authenticated, service_role;
grant execute on function public.enable_weekly_recommendations_email_schedule() to postgres;
