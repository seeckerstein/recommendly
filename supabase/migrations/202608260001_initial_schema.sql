create extension if not exists pgcrypto;

create type public.profile_visibility as enum ('PRIVATE', 'PUBLIC');
create type public.subscription_status as enum ('PENDING', 'APPROVED', 'REJECTED', 'REVOKED');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,30}$'),
  display_name text not null check (char_length(display_name) between 1 and 100),
  bio text check (char_length(bio) <= 500),
  profile_visibility public.profile_visibility not null default 'PRIVATE',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  metadata_schema jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  sort_order integer not null default 0
);

create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.categories(id),
  title text,
  comment text not null check (char_length(comment) between 1 and 5000),
  rating smallint check (rating between 1 and 5),
  tags text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references public.profiles(id) on delete cascade,
  publisher_id uuid not null references public.profiles(id) on delete cascade,
  status public.subscription_status not null default 'PENDING',
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (subscriber_id, publisher_id),
  check (subscriber_id <> publisher_id),
  check ((status = 'APPROVED') = (approved_at is not null))
);

create table public.recommendation_ratings (
  id uuid primary key default gen_random_uuid(),
  recommendation_id uuid not null references public.recommendations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (recommendation_id, user_id)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  recommendation_id uuid not null references public.recommendations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  text text not null check (char_length(text) between 1 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  actor_user_id uuid references public.profiles(id) on delete set null,
  reference_type text,
  reference_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index recommendations_authorized_search_idx on public.recommendations (user_id, category_id, created_at desc) where deleted_at is null;
create index subscriptions_lookup_idx on public.subscriptions (subscriber_id, publisher_id, status);
create index comments_recommendation_idx on public.comments (recommendation_id) where deleted_at is null;
create index recommendation_fts_idx on public.recommendations using gin (to_tsvector('simple', coalesce(title, '') || ' ' || comment));

create function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
create trigger recommendations_updated_at before update on public.recommendations for each row execute procedure public.set_updated_at();
create trigger subscriptions_updated_at before update on public.subscriptions for each row execute procedure public.set_updated_at();
create trigger ratings_updated_at before update on public.recommendation_ratings for each row execute procedure public.set_updated_at();
create trigger comments_updated_at before update on public.comments for each row execute procedure public.set_updated_at();

create function public.can_view_recommendation(recommendation_owner uuid, viewer uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select viewer = recommendation_owner
    or exists (select 1 from public.profiles p where p.id = recommendation_owner and p.profile_visibility = 'PUBLIC')
    or exists (select 1 from public.subscriptions s where s.subscriber_id = viewer and s.publisher_id = recommendation_owner and s.status = 'APPROVED');
$$;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.recommendations enable row level security;
alter table public.subscriptions enable row level security;
alter table public.recommendation_ratings enable row level security;
alter table public.comments enable row level security;
alter table public.notifications enable row level security;

create policy "authenticated users can discover profiles" on public.profiles for select to authenticated using (true);
create policy "users create own profile" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "users update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "active categories readable" on public.categories for select to authenticated using (active);
create policy "visible recommendations readable" on public.recommendations for select to authenticated using (deleted_at is null and public.can_view_recommendation(user_id));
create policy "owners create recommendations" on public.recommendations for insert to authenticated with check (user_id = auth.uid());
create policy "owners update recommendations" on public.recommendations for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owners delete recommendations" on public.recommendations for delete to authenticated using (user_id = auth.uid());
create policy "subscription parties can read" on public.subscriptions for select to authenticated using (subscriber_id = auth.uid() or publisher_id = auth.uid());
create policy "subscriber requests" on public.subscriptions for insert to authenticated with check (subscriber_id = auth.uid() and publisher_id <> auth.uid() and status = 'PENDING');
create policy "viewers read ratings" on public.recommendation_ratings for select to authenticated using (exists (select 1 from public.recommendations r where r.id = recommendation_id and public.can_view_recommendation(r.user_id)));
create policy "viewers rate" on public.recommendation_ratings for insert to authenticated with check (user_id = auth.uid() and exists (select 1 from public.recommendations r where r.id = recommendation_id and public.can_view_recommendation(r.user_id)));
create policy "raters update own rating" on public.recommendation_ratings for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "raters delete own rating" on public.recommendation_ratings for delete to authenticated using (user_id = auth.uid());
create policy "viewers read comments" on public.comments for select to authenticated using (deleted_at is null and exists (select 1 from public.recommendations r where r.id = recommendation_id and public.can_view_recommendation(r.user_id)));
create policy "viewers create comments" on public.comments for insert to authenticated with check (user_id = auth.uid() and exists (select 1 from public.recommendations r where r.id = recommendation_id and public.can_view_recommendation(r.user_id)));
create policy "authors update comments" on public.comments for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "authors delete comments" on public.comments for delete to authenticated using (user_id = auth.uid());
create policy "users read own notifications" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "users update own notifications" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

insert into public.categories (slug, name, sort_order, metadata_schema) values
  ('book', 'Books', 1, '{"fields":["author","isbn","publication_year","publisher","language"]}'),
  ('movie', 'Movies', 2, '{"fields":["director","release_year","runtime","language"]}'),
  ('restaurant', 'Restaurants', 3, '{"fields":["location","address","cuisine","price_level"]}');

-- Subscription status changes are workflow operations, not client-controlled updates.
create function public.request_subscription(target_publisher_id uuid)
returns public.subscriptions language plpgsql security definer set search_path = public as $$
declare result public.subscriptions;
begin
  if auth.uid() is null or auth.uid() = target_publisher_id then
    raise exception 'invalid subscription request';
  end if;
  insert into public.subscriptions (subscriber_id, publisher_id, status)
  values (auth.uid(), target_publisher_id, 'PENDING')
  on conflict (subscriber_id, publisher_id) do update
    set status = 'PENDING', requested_at = now(), approved_at = null
    where public.subscriptions.status in ('REJECTED', 'REVOKED')
  returning * into result;
  if result is null then raise exception 'subscription request already pending or approved'; end if;
  return result;
end;
$$;

create function public.transition_subscription(subscription_id uuid, next_status public.subscription_status)
returns public.subscriptions language plpgsql security definer set search_path = public as $$
declare result public.subscriptions;
begin
  select * into result from public.subscriptions where id = subscription_id for update;
  if result is null or result.publisher_id <> auth.uid() or next_status not in ('APPROVED', 'REJECTED', 'REVOKED') then
    raise exception 'invalid subscription transition';
  end if;
  if (result.status = 'PENDING' and next_status not in ('APPROVED', 'REJECTED'))
     or (result.status = 'APPROVED' and next_status <> 'REVOKED') then
    raise exception 'invalid subscription transition';
  end if;
  update public.subscriptions
     set status = next_status, approved_at = case when next_status = 'APPROVED' then now() else null end
   where id = subscription_id returning * into result;
  return result;
end;
$$;

create function public.unsubscribe(target_publisher_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.subscriptions where subscriber_id = auth.uid() and publisher_id = target_publisher_id;
end;
$$;

grant execute on function public.request_subscription(uuid) to authenticated;
grant execute on function public.transition_subscription(uuid, public.subscription_status) to authenticated;
grant execute on function public.unsubscribe(uuid) to authenticated;
