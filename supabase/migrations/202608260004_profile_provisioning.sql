-- Every authenticated user must have an application-level profile row.
-- This trigger runs on user signup and creates the matching public.profiles
-- record so recommendation inserts do not fail the FK to profiles.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'username', ''),
      'user_' || right(replace(new.id::text, '-', ''), 25)
    ),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      split_part(coalesce(new.email, 'user'), '@', 1)
    )
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- One-time idempotent backfill: provision profiles for any pre-existing auth.users
-- rows created before this migration. Existing profiles are left untouched.
insert into public.profiles (id, username, display_name)
select
  u.id,
  coalesce(
    nullif(u.raw_user_meta_data ->> 'username', ''),
    'user_' || right(replace(u.id::text, '-', ''), 25)
  ),
  coalesce(
    nullif(u.raw_user_meta_data ->> 'display_name', ''),
    split_part(coalesce(u.email, 'user'), '@', 1)
  )
from auth.users u
where not exists (
  select 1 from public.profiles p where p.id = u.id
);
