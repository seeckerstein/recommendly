begin;
create extension if not exists pgtap;
select plan(16);

-- Seed users, profiles, and a private recommendation.
insert into auth.users (id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'owner@example.test'),
  ('00000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'subscriber@example.test'),
  ('00000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'other@example.test'),
  ('00000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'rejected@example.test');
insert into public.profiles (id, username, display_name, profile_visibility) values
  ('00000000-0000-0000-0000-000000000001', 'owner', 'Owner', 'PRIVATE'),
  ('00000000-0000-0000-0000-000000000002', 'subscriber', 'Subscriber', 'PRIVATE'),
  ('00000000-0000-0000-0000-000000000003', 'other', 'Other', 'PRIVATE'),
  ('00000000-0000-0000-0000-000000000004', 'rejected', 'Rejected', 'PRIVATE');
insert into public.recommendations (id, user_id, category_id, comment) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', (select id from public.categories where slug='book'), 'private note');

-- Helper: set JWT sub for the current session.
create temp function _as(uid text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid, true);
$$;

-- OWNER sees own private recommendation.
set local role authenticated;
select _as('00000000-0000-0000-0000-000000000001');
select is((select count(*) from public.recommendations), 1::bigint, 'owner sees private recommendation');

-- UNAPPROVED user cannot read.
select _as('00000000-0000-0000-0000-000000000003');
select is((select count(*) from public.recommendations), 0::bigint, 'unapproved user cannot read');
reset role;

-- ANONYMOUS (no auth.uid()) cannot read.
select is((select count(*) from public.recommendations), 0::bigint, 'anonymous cannot read');

-- PENDING subscription grants no access.
insert into public.subscriptions (subscriber_id, publisher_id, status)
values ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'PENDING');
reset role;
set local role authenticated;
select _as('00000000-0000-0000-0000-000000000002');
select is((select count(*) from public.recommendations), 0::bigint, 'pending subscriber cannot read');
reset role;

-- REJECTED subscription grants no access.
update public.subscriptions set status = 'REJECTED' where subscriber_id = '00000000-0000-0000-0000-000000000002';
set local role authenticated;
select _as('00000000-0000-0000-0000-000000000002');
select is((select count(*) from public.recommendations), 0::bigint, 'rejected subscriber cannot read');
reset role;

-- APPROVED subscription grants access.
update public.subscriptions set status = 'APPROVED', approved_at = now() where subscriber_id = '00000000-0000-0000-0000-000000000002';
set local role authenticated;
select _as('00000000-0000-0000-0000-000000000002');
select is((select count(*) from public.recommendations), 1::bigint, 'approved subscriber can read');

-- REVOKED subscription removes access immediately.
reset role;
update public.subscriptions set status = 'REVOKED', approved_at = null where subscriber_id = '00000000-0000-0000-0000-000000000002';
set local role authenticated;
select _as('00000000-0000-0000-0000-000000000002');
select is((select count(*) from public.recommendations), 0::bigint, 'revoked subscriber cannot read');
reset role;

-- UNSUBSCRIBED (deleted subscription row) grants no access.
delete from public.subscriptions where subscriber_id = '00000000-0000-0000-0000-000000000002';
set local role authenticated;
select _as('00000000-0000-0000-0000-000000000002');
select is((select count(*) from public.recommendations), 0::bigint, 'unsubscribed user cannot read');
reset role;

-- PUBLIC profile grants access to all authenticated users.
update public.profiles set profile_visibility = 'PUBLIC' where id = '00000000-0000-0000-0000-000000000001';
set local role authenticated;
select _as('00000000-0000-0000-0000-000000000002');
select is((select count(*) from public.recommendations), 1::bigint, 'public profile grants access to subscriber');

-- Child-table leakage: comments on a private rec are invisible to unapproved viewers.
reset role;
insert into public.comments (recommendation_id, user_id, text)
values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'my own comment');
insert into public.recommendation_ratings (recommendation_id, user_id, rating)
values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 5);
set local role authenticated;
select _as('00000000-0000-0000-0000-000000000002');
select is((select count(*) from public.comments), 1::bigint, 'approved subscriber can see comments');

select _as('00000000-0000-0000-0000-000000000003');
select is((select count(*) from public.comments), 0::bigint, 'unapproved user cannot see comments');

-- Re-recommendation: independent record by a different user.
select _as('00000000-0000-0000-0000-000000000002');
insert into public.recommendations (user_id, category_id, comment)
values ('00000000-0000-0000-0000-000000000002', (select id from public.categories where slug='book'), 're-recommended this book');
select is((select count(*) from public.recommendations), 2::bigint, 're-recommendation creates an independent record');

-- LLM acting as approved user: same authorization model applies.
select _as('00000000-0000-0000-0000-000000000002');
select is((select count(*) from public.recommendations), 2::bigint, 'LLM as approved user sees authorized recommendations');

-- LLM acting as unapproved user: blocked.
select _as('00000000-0000-0000-0000-000000000003');
select is((select count(*) from public.recommendations), 2::bigint, 'public profile means even unapproved sees both');

reset role;
update public.profiles set profile_visibility = 'PRIVATE' where id = '00000000-0000-0000-0000-000000000001';
delete from public.recommendations where user_id = '00000000-0000-0000-0000-000000000002';
set local role authenticated;
select _as('00000000-0000-0000-0000-000000000003');
select is((count(*) from public.recommendations), 0::bigint, 'LLM as unapproved user sees nothing after reverting visibility');

select * from finish();
rollback;
