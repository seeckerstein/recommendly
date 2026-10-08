begin;
create extension if not exists pgtap;
select plan(12);

insert into auth.users (id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'owner@example.test'),
  ('00000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'subscriber@example.test'),
  ('00000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'other@example.test');

create or replace function pg_temp._as(uid text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid, true);
$$;

-- ============================================================
-- SECTION 1: OWNERSHIP / RLS
-- ============================================================
set local role authenticated;
select pg_temp._as('00000000-0000-0000-0000-000000000001');
select is(
  (select count(*) from public.push_subscriptions where user_id = '00000000-0000-0000-0000-000000000001'),
  0::bigint,
  '[push-rls] empty start'
);
insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values ('00000000-0000-0000-0000-000000000001', 'https://fcm.googleapis.com/fcm/send/own', 'k1', 'a1');
select is(
  (select count(*) from public.push_subscriptions where endpoint = 'https://fcm.googleapis.com/fcm/send/own'),
  1::bigint,
  '[push-rls] owner can insert own subscription'
);

select pg_temp._as('00000000-0000-0000-0000-000000000002');
select is(
  (select count(*) from public.push_subscriptions where endpoint = 'https://fcm.googleapis.com/fcm/send/own'),
  0::bigint,
  '[push-rls] other user cannot read another user subscription'
);

-- Cross-user insert targeting another user_id is rejected by RLS.
select throws_ok(
  $$insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
      values ('00000000-0000-0000-0000-000000000001', 'https://fcm.googleapis.com/fcm/send/cross', 'k2', 'a2')$$,
  null,
  null,
  '[push-rls] cannot insert subscription claiming another user id'
);

-- Duplicate endpoint upsert stays one row.
select pg_temp._as('00000000-0000-0000-0000-000000000001');
insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values ('00000000-0000-0000-0000-000000000001', 'https://fcm.googleapis.com/fcm/send/own', 'k1b', 'a1b')
  on conflict (endpoint) do update set p256dh = excluded.p256dh;
select is(
  (select count(*) from public.push_subscriptions where endpoint = 'https://fcm.googleapis.com/fcm/send/own'),
  1::bigint,
  '[push-rls] endpoint uniqueness is enforced on upsert'
);

-- Update/Delete only own rows.
select pg_temp._as('00000000-0000-0000-0000-000000000001');
update public.push_subscriptions set user_agent = 'test' where user_id = '00000000-0000-0000-0000-000000000001';
select is(
  (select user_agent from public.push_subscriptions where endpoint = 'https://fcm.googleapis.com/fcm/send/own'),
  'test',
  '[push-rls] owner can update own subscription'
);

select pg_temp._as('00000000-0000-0000-0000-000000000002');
delete from public.push_subscriptions where endpoint = 'https://fcm.googleapis.com/fcm/send/own';
reset role;
select is(
  (select count(*) from public.push_subscriptions where endpoint = 'https://fcm.googleapis.com/fcm/send/own'),
  1::bigint,
  '[push-rls] non-owner cannot delete another user subscription'
);

select pg_temp._as('00000000-0000-0000-0000-000000000001');
delete from public.push_subscriptions where endpoint = 'https://fcm.googleapis.com/fcm/send/own';
select is(
  (select count(*) from public.push_subscriptions where endpoint = 'https://fcm.googleapis.com/fcm/send/own'),
  0::bigint,
  '[push-rls] owner can delete own subscription'
);

-- ============================================================
-- SECTION 2: NOTIFICATION TRIGGER
-- ============================================================
set local role authenticated;
select pg_temp._as('00000000-0000-0000-0000-000000000001');
insert into public.notifications (user_id, type, actor_user_id, reference_type, reference_id)
  values ('00000000-0000-0000-0000-000000000002', 'subscription_request', '00000000-0000-0000-0000-000000000001', 'subscription', null);
reset role;
select is(
  (select count(*) from public.notifications where type = 'subscription_request'),
  1::bigint,
  '[push-dispatch] notification insert succeeds even without push dispatcher configured'
);
select is(
  (select count(*) from public.notifications where user_id = '00000000-0000-0000-0000-000000000002'),
  1::bigint,
  '[push-dispatch] existing email/activity behaviour untouched'
);

rollback;
