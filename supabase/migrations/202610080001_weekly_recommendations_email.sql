alter table public.user_settings
  add column email_weekly_recommendations boolean not null default true;

-- Add the same setting to profiles that predate user_settings. The column default
-- also covers newly created settings rows.
insert into public.user_settings (user_id)
select id from public.profiles
on conflict (user_id) do nothing;

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

create or replace function public.provision_user_settings()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_settings (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists provision_user_settings_after_profile on public.profiles;
create trigger provision_user_settings_after_profile
  after insert on public.profiles
  for each row execute function public.provision_user_settings();

-- The digest uses the same visibility predicate as the application RLS policy.
-- This RPC is only callable by the scheduled service role and never returns
-- recommendations unless can_view_recommendation permits that recipient.
create or replace function public.weekly_digest_recommendations(recipient_id uuid)
returns table (
  id uuid,
  category_name text,
  title text,
  comment text,
  owner_name text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, c.name, r.title, r.comment, p.display_name, r.created_at
  from public.recommendations r
  join public.categories c on c.id = r.category_id and c.active
  join public.profiles p on p.id = r.user_id
  where r.deleted_at is null
    and public.can_view_recommendation(r.user_id, recipient_id)
  order by c.sort_order, c.name, r.created_at desc;
$$;

revoke all on function public.weekly_digest_recommendations(uuid) from public, anon, authenticated;
grant execute on function public.weekly_digest_recommendations(uuid) to service_role;

-- The weekly schedule is intentionally activated only after both required
-- Vault secrets have been provisioned.
