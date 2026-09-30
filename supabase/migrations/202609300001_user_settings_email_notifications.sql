create table public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  email_contact_requests boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger user_settings_updated_at
  before update on public.user_settings
  for each row execute procedure public.set_updated_at();

alter table public.user_settings enable row level security;

create policy "users read own settings"
  on public.user_settings for select
  to authenticated
  using (user_id = auth.uid());

create policy "users create own settings"
  on public.user_settings for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "users update own settings"
  on public.user_settings for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
