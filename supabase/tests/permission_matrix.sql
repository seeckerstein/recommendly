begin;
create extension if not exists pgtap;
select plan(18);

-- Seed users, profiles, and a private recommendation.
insert into auth.users (id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'owner@example.test'),
  ('00000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'subscriber@example.test'),
  ('00000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'other@example.test');
insert into public.profiles (id, username, display_name, profile_visibility) values
  ('00000000-0000-0000-0000-000000000001', 'owner', 'Owner', 'PRIVATE'),
  ('00000000-0000-0000-0000-000000000002', 'subscriber', 'Subscriber', 'PRIVATE'),
  ('00000000-0000-0000-0000-000000000003', 'other', 'Other', 'PRIVATE');
insert into public.recommendations (id, user_id, category_id, comment) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', (select id from public.categories where slug='book'), 'private note about a great book');

create or replace function pg_temp._as(uid text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid, true);
$$;

-- ============================================================
-- SECTION 1: PRIVATE RECOMMENDATION ACCESS
-- ============================================================

set local role authenticated;
select pg_temp._as('00000000-0000-0000-0000-000000000001');
select is((select count(*) from public.recommendations), 1::bigint, '[private] owner sees own recommendation');

select pg_temp._as('00000000-0000-0000-0000-000000000002');
select is((select count(*) from public.recommendations), 0::bigint, '[private] unauthorized user sees nothing');

reset role;
set local role anon;
select ok(not has_table_privilege('anon', 'public.recommendations', 'SELECT'), '[private] anon role denied SELECT on recommendations');
reset role;
-- ============================================================
-- SECTION 2: SUBSCRIPTION LIFECYCLE
-- ============================================================

insert into public.subscriptions (subscriber_id, publisher_id, status)
values ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'PENDING');
set local role authenticated;
select pg_temp._as('00000000-0000-0000-0000-000000000002');
select is((select count(*) from public.recommendations), 0::bigint, '[pending] subscriber cannot read');
reset role;

update public.subscriptions set status = 'REJECTED' where subscriber_id = '00000000-0000-0000-0000-000000000002';
set local role authenticated;
select pg_temp._as('00000000-0000-0000-0000-000000000002');
select is((select count(*) from public.recommendations), 0::bigint, '[rejected] subscriber cannot read');
reset role;

update public.subscriptions set status = 'APPROVED', approved_at = now() where subscriber_id = '00000000-0000-0000-0000-000000000002';
set local role authenticated;
select pg_temp._as('00000000-0000-0000-0000-000000000002');
select is((select count(*) from public.recommendations), 1::bigint, '[approved] subscriber can read');
reset role;

update public.subscriptions set status = 'REVOKED', approved_at = null where subscriber_id = '00000000-0000-0000-0000-000000000002';
set local role authenticated;
select pg_temp._as('00000000-0000-0000-0000-000000000002');
select is((select count(*) from public.recommendations), 0::bigint, '[revoked] subscriber loses access immediately');
reset role;

delete from public.subscriptions where subscriber_id = '00000000-0000-0000-0000-000000000002';
set local role authenticated;
select pg_temp._as('00000000-0000-0000-0000-000000000002');
select is((select count(*) from public.recommendations), 0::bigint, '[unsubscribed] no access after deletion');
reset role;

-- ============================================================
-- SECTION 3: CHILD-TABLE LEAKAGE (comments + ratings)
-- ============================================================

insert into public.comments (recommendation_id, user_id, text)
values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'my own private comment');
insert into public.recommendation_ratings (recommendation_id, user_id, rating)
values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 5);

-- Unapproved viewer: comments and ratings must be invisible.
set local role authenticated;
select pg_temp._as('00000000-0000-0000-0000-000000000002');
select is((select count(*) from public.comments), 0::bigint, '[child-leak] unapproved cannot see comments on private rec');
select is((select count(*) from public.recommendation_ratings), 0::bigint, '[child-leak] unapproved cannot see ratings on private rec');
reset role;

-- Approved viewer: can see child records.
-- Approved subscriber can see child records (tested in section 2 already via recommendations;
-- here we re-create the subscription with the check constraint satisfied).
insert into public.subscriptions (subscriber_id, publisher_id, status, approved_at)
values ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'APPROVED', now());
set local role authenticated;
select pg_temp._as('00000000-0000-0000-0000-000000000002');
select is((select count(*) from public.comments), 1::bigint, '[child-leak] approved subscriber can see comments');
select is((select count(*) from public.recommendation_ratings), 1::bigint, '[child-leak] approved subscriber can see ratings');
reset role;

delete from public.subscriptions where subscriber_id = '00000000-0000-0000-0000-000000000002';

-- ============================================================
-- SECTION 4: PUBLIC PROFILE
-- ============================================================

update public.profiles set profile_visibility = 'PUBLIC' where id = '00000000-0000-0000-0000-000000000001';
set local role authenticated;
select pg_temp._as('00000000-0000-0000-0000-000000000002');
select is((select count(*) from public.recommendations), 1::bigint, '[public] any authenticated user sees recommendations');

select pg_temp._as('00000000-0000-0000-0000-000000000003');
select is((select count(*) from public.recommendations), 1::bigint, '[public] unrelated authenticated user also sees them');
reset role;

-- ============================================================
-- SECTION 5: RE-RECOMMENDATION INDEPENDENCE
-- ============================================================

set local role authenticated;
select pg_temp._as('00000000-0000-0000-0000-000000000002');
insert into public.recommendations (user_id, category_id, comment)
values ('00000000-0000-0000-0000-000000000002', (select id from public.categories where slug='book'), 're-recommending this book');
select is((select count(*) from public.recommendations where user_id = '00000000-0000-0000-0000-000000000002'), 1::bigint, '[re-recommend] independent record created by different user');
select is((select count(*) from public.recommendations where id <> '10000000-0000-0000-0000-000000000001' and category_id = (select id from public.categories where slug='book')), 1::bigint, '[re-recommend] has correct category and distinct ID');
reset role;

-- ============================================================
-- SECTION 6: LLM AS USER â€” SAME AUTH MODEL
-- Note: these verify that setting the same JWT sub identity
-- produces the same RLS result. They do not test MCP transport.
-- ============================================================

set local role authenticated;
select pg_temp._as('00000000-0000-0000-0000-000000000002');
select is((select count(*) from public.recommendations), 2::bigint, '[llm-as-user] approved user sees both recs when owner profile is PUBLIC');

reset role;
delete from public.recommendations where user_id = '00000000-0000-0000-0000-000000000002';
update public.profiles set profile_visibility = 'PRIVATE' where id = '00000000-0000-0000-0000-000000000001';
set local role authenticated;
select pg_temp._as('00000000-0000-0000-0000-000000000002');
select is((select count(*) from public.recommendations), 0::bigint, '[llm-as-user] blocked after visibility reverts to PRIVATE and subscription removed');

reset role;
select * from finish();
rollback;


