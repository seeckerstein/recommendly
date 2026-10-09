begin;
create extension if not exists pgtap;
select plan(63);

-- Seed users, profiles, and a private recommendation.
insert into auth.users (id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'owner@example.test'),
  ('00000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'subscriber@example.test'),
  ('00000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'other@example.test');
insert into public.recommendations (id, user_id, category_id, comment) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', (select id from public.categories where slug='book'), 'private note about a great book');

select is(
  (select count(*) from public.weekly_digest_recommendations('00000000-0000-0000-0000-000000000001')),
  1::bigint,
  '[weekly-email] digest query includes recommendations visible to its recipient'
);
select is(
  (select count(*) from public.weekly_digest_recommendations('00000000-0000-0000-0000-000000000002')),
  0::bigint,
  '[weekly-email] digest query excludes recommendations the recipient cannot access'
);
select is(
  (select count(*) from cron.job where jobname = 'weekly-recommendations-email'),
  0::bigint,
  '[weekly-email] schedule stays disabled until its Vault secrets exist'
);
select is(
  public.weekly_digest_cron_schedule(),
  '0 16 * * 5'::text,
  '[weekly-email] guarded schedule targets Fridays at 16:00 UTC'
);

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

-- ============================================================
-- SECTION: AUTH USER PROFILE PROVISIONING
-- Reproduces fresh Auth signup without manual profile creation.
-- ============================================================

insert into auth.users (id, aud, role, email)
values ('44444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated', 'fresh@example.test');

select is(
  (select email_weekly_recommendations from public.user_settings where user_id = '44444444-4444-4444-4444-444444444444'),
  true,
  '[weekly-email] new users receive the enabled default'
);
select is(
  (select email_weekly_recommendations from public.user_settings where user_id = '00000000-0000-0000-0000-000000000001'),
  true,
  '[weekly-email] existing users are backfilled enabled'
);
set local role authenticated;
select pg_temp._as('00000000-0000-0000-0000-000000000001');
update public.user_settings set email_weekly_recommendations = false where user_id = '00000000-0000-0000-0000-000000000001';
select is(
  (select email_weekly_recommendations from public.user_settings where user_id = '00000000-0000-0000-0000-000000000001'),
  false,
  '[weekly-email] opting out disables digest delivery'
);
reset role;
set local role authenticated;
select pg_temp._as('00000000-0000-0000-0000-000000000002');
update public.user_settings set email_weekly_recommendations = true where user_id = '00000000-0000-0000-0000-000000000001';
reset role;
select is(
  (select email_weekly_recommendations from public.user_settings where user_id = '00000000-0000-0000-0000-000000000001'),
  false,
  '[weekly-email] another user cannot change the preference'
);
set local role authenticated;
select pg_temp._as('00000000-0000-0000-0000-000000000001');
update public.user_settings set email_weekly_recommendations = true where user_id = '00000000-0000-0000-0000-000000000001';
select is(
  (select email_weekly_recommendations from public.user_settings where user_id = '00000000-0000-0000-0000-000000000001'),
  true,
  '[weekly-email] opting back in enables digest delivery'
);
reset role;

select is(
  (select count(*) from public.profiles where id = '44444444-4444-4444-4444-444444444444'),
  1::bigint,
  '[signup] fresh auth users row is provisioned into profiles'
);

-- Simulate a pre-existing auth user without a profile: temporarily create it
-- as if the trigger had not existed. This cannot use ALTER TABLE on auth.users
-- without ownership, so instead: create a fresh user via the normal trigger,
-- then DELETE its profile row to reproduce the pre-backfill state.
insert into auth.users (id, aud, role, email)
values ('55555555-5555-5555-5555-555555555555', 'authenticated', 'authenticated', 'legacy@example.test');
delete from public.profiles where id = '55555555-5555-5555-5555-555555555555';

select is(
  (select count(*) from public.profiles where id = '55555555-5555-5555-5555-555555555555'),
  0::bigint,
  '[backfill] pre-existing auth user has no profile before backfill'
);

-- Execute the identical backfill statement defined in the migration.
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

select is(
  (select count(*) from public.profiles where id = '55555555-5555-5555-5555-555555555555'),
  1::bigint,
  '[backfill] missing profile is provisioned exactly once'
);

-- Re-run proves idempotency: no new rows inserted.
insert into public.profiles (id, username, display_name)
select u.id,
  'user_' || right(replace(u.id::text, '-', ''), 25),
  split_part(coalesce(u.email,'user'),'@',1)
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

select is(
  (select count(*) from public.profiles where id = '55555555-5555-5555-5555-555555555555'),
  1::bigint,
  '[backfill] second run inserts nothing (idempotent)'
);

insert into public.categories (slug, name) values ('provision-test', 'Provision Test') returning id as category_id \gset

set local role authenticated;
select pg_temp._as('44444444-4444-4444-4444-444444444444');
insert into public.recommendations (user_id, category_id, comment) values
  ('44444444-4444-4444-4444-444444444444', :'category_id', 'created by freshly signed-up user');
select is(
  (select count(*) from public.recommendations where comment = 'created by freshly signed-up user'),
  1::bigint,
  '[signup] fresh auth users can create a recommendation'
);
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

-- ============================================================
-- SECTION 7: NOTIFICATION RECIPIENT ISOLATION (RLS)
-- Notifications are system-generated. Users cannot insert them
-- for one another; lifecycle RPCs create them server-side.
-- ============================================================

insert into public.notifications (user_id, type, actor_user_id, reference_type, reference_id)
values
   ('00000000-0000-0000-0000-000000000001', 'subscription_request', '00000000-0000-0000-0000-000000000002', 'subscription', '00000000-0000-0000-0000-000000000099'),
  ('00000000-0000-0000-0000-000000000002', 'subscription_approved', '00000000-0000-0000-0000-000000000001', 'subscription', '00000000-0000-0000-0000-000000000099');

set local role authenticated;
select pg_temp._as('00000000-0000-0000-0000-000000000001');
select is(
  (select count(*) from public.notifications),
  1::bigint,
  '[notif-rls] User A sees exactly own notification'
);
select is(
  (select count(*) from public.notifications where user_id <> '00000000-0000-0000-0000-000000000001'),
  0::bigint,
  '[notif-rls] User A cannot see User B notifications'
);

select pg_temp._as('00000000-0000-0000-0000-000000000002');
select is(
  (select count(*) from public.notifications),
  1::bigint,
  '[notif-rls] User B sees exactly own notification'
);
select is(
  (select count(*) from public.notifications where user_id <> '00000000-0000-0000-0000-000000000002'),
  0::bigint,
  '[notif-rls] User B cannot see User A notifications'
);

-- User A cannot create a notification addressed to User B
select pg_temp._as('00000000-0000-0000-0000-000000000001');
select is(
  (select count(*) from public.notifications where user_id = '00000000-0000-0000-0000-000000000002' and actor_user_id = '00000000-0000-0000-0000-000000000001'),
  0::bigint,
  '[notif-rls] no cross-user notification before attempted insert'
);
select throws_ok(
  $$insert into public.notifications (user_id, type, actor_user_id, reference_type, reference_id) values ('00000000-0000-0000-0000-000000000002', 'subscription_request', '00000000-0000-0000-0000-000000000001', 'subscription', '00000000-0000-0000-0000-000000000100')$$
);
select is(
  (select count(*) from public.notifications where user_id = '00000000-0000-0000-0000-000000000002' and actor_user_id = '00000000-0000-0000-0000-000000000001'),
  0::bigint,
  '[notif-rls] User A cannot insert notification addressed to User B'
);

-- User A cannot modify User B notification
update public.notifications set read_at = now() where user_id = '00000000-0000-0000-0000-000000000002';
select is(
  (select count(*) from public.notifications where user_id = '00000000-0000-0000-0000-000000000002' and read_at is not null),
  0::bigint,
  '[notif-rls] User A cannot modify User B notification'
);

reset role;

-- ============================================================
-- SECTION 8: SUBSCRIPTION LIFECYCLE NOTIFICATIONS VIA RPC (DIRECTIONAL)
-- Access is directional: approving A -> B does not create B -> A.
-- ============================================================

-- A requests B: A -> B = PENDING, notification for B.
set local role authenticated;
select pg_temp._as('00000000-0000-0000-0000-000000000001');
select is(
  (select count(*) from public.notifications where user_id = '00000000-0000-0000-0000-000000000002'),
  0::bigint,
  '[sub-notif] no notification for B before request'
);
select is(
  (select status from public.request_subscription('00000000-0000-0000-0000-000000000002')),
  'PENDING'::public.subscription_status,
  '[sub-notif] request creates PENDING subscription'
);
select pg_temp._as('00000000-0000-0000-0000-000000000002');
select is(
  (select count(*) from public.notifications
    where user_id = '00000000-0000-0000-0000-000000000002'
      and actor_user_id = '00000000-0000-0000-0000-000000000001'
      and type = 'subscription_request'
      and reference_type = 'subscription'),
  1::bigint,
  '[sub-notif] request creates subscription_request notification for publisher'
);
select is(
  (select count(*) from public.notifications
    where user_id = '00000000-0000-0000-0000-000000000002'
      and type = 'subscription_request'),
  1::bigint,
  '[sub-notif] repeated PENDING request does not duplicate notification'
);
select pg_temp._as('00000000-0000-0000-0000-000000000002');
select pg_temp._as('00000000-0000-0000-0000-000000000002');
select is(
  (select count(*) from public.notifications where user_id = '00000000-0000-0000-0000-000000000002' and type = 'subscription_request'),
  1::bigint,
  '[sub-notif] publisher sees exactly one notification'
);
select pg_temp._as('00000000-0000-0000-0000-000000000001');
select is(
  (select count(*) from public.notifications where user_id = '00000000-0000-0000-0000-000000000002'),
  0::bigint,
  '[sub-notif] subscriber cannot read publisher notification'
);

-- B approves: A -> B = APPROVED, notification for A, B -> A absent.
select pg_temp._as('00000000-0000-0000-0000-000000000002');
select is(
  (select count(*) from public.notifications where user_id = '00000000-0000-0000-0000-000000000001' and type = 'subscription_approved'),
  0::bigint,
  '[sub-notif] no approval notification before transition'
);
select is(
  (select status from public.transition_subscription(
    (select id from public.subscriptions
      where subscriber_id = '00000000-0000-0000-0000-000000000001'
        and publisher_id = '00000000-0000-0000-0000-000000000002'),
    'APPROVED')),
  'APPROVED'::public.subscription_status,
  '[sub-notif] approval transitions A -> B to APPROVED'
);
select pg_temp._as('00000000-0000-0000-0000-000000000001');
select is(
  (select count(*) from public.notifications
    where user_id = '00000000-0000-0000-0000-000000000001'
      and actor_user_id = '00000000-0000-0000-0000-000000000002'
      and type = 'subscription_approved'
      and reference_type = 'subscription'),
  1::bigint,
  '[sub-notif] approval creates notification for subscriber'
);
select is(
  (select count(*) from public.notifications where user_id = '00000000-0000-0000-0000-000000000001' and type = 'subscription_approved'),
  1::bigint,
  '[sub-notif] repeated APPROVED does not duplicate notification'
);
select pg_temp._as('00000000-0000-0000-0000-000000000002');
select is(
  (select count(*) from public.subscriptions
    where subscriber_id = '00000000-0000-0000-0000-000000000002'
      and publisher_id = '00000000-0000-0000-0000-000000000001'),
  0::bigint,
  '[sub-dir] approving A -> B does not create B -> A'
);

-- B independently requests A: B -> A = PENDING.
select is(
  (select status from public.request_subscription('00000000-0000-0000-0000-000000000001')),
  'PENDING'::public.subscription_status,
  '[sub-dir] B independently requests A -> PENDING'
);
select is(
  (select status from public.subscriptions
    where subscriber_id = '00000000-0000-0000-0000-000000000002'
      and publisher_id = '00000000-0000-0000-0000-000000000001'),
  'PENDING'::public.subscription_status,
  '[sub-dir] B -> A is PENDING'
);
select pg_temp._as('00000000-0000-0000-0000-000000000001');
select is(
  (select count(*) from public.notifications
    where user_id = '00000000-0000-0000-0000-000000000001'
      and actor_user_id = '00000000-0000-0000-0000-000000000002'
      and type = 'subscription_request'
      and reference_type = 'subscription'
      and reference_id = (select id from public.subscriptions
        where subscriber_id = '00000000-0000-0000-0000-000000000002'
          and publisher_id = '00000000-0000-0000-0000-000000000001')),
  1::bigint,
  '[sub-dir] reverse request creates subscription_request notification for A'
);

-- A approves B -> A: both directions now independently APPROVED.
select pg_temp._as('00000000-0000-0000-0000-000000000001');
select is(
  (select status from public.transition_subscription(
    (select id from public.subscriptions
      where subscriber_id = '00000000-0000-0000-0000-000000000002'
        and publisher_id = '00000000-0000-0000-0000-000000000001'),
    'APPROVED')),
  'APPROVED'::public.subscription_status,
  '[sub-dir] A approves B -> A to APPROVED'
);
select pg_temp._as('00000000-0000-0000-0000-000000000002');
select is(
  (select count(*) from public.notifications
    where user_id = '00000000-0000-0000-0000-000000000002'
      and actor_user_id = '00000000-0000-0000-0000-000000000001'
      and type = 'subscription_approved'
      and reference_type = 'subscription'
      and reference_id = (select id from public.subscriptions
        where subscriber_id = '00000000-0000-0000-0000-000000000002'
          and publisher_id = '00000000-0000-0000-0000-000000000001')),
  1::bigint,
  '[sub-dir] reverse approval creates notification for B'
);
select pg_temp._as('00000000-0000-0000-0000-000000000001');
select is(
  (select status from public.subscriptions
    where subscriber_id = '00000000-0000-0000-0000-000000000001'
      and publisher_id = '00000000-0000-0000-0000-000000000002'),
  'APPROVED'::public.subscription_status,
  '[sub-dir] A -> B is APPROVED'
);
select is(
  (select status from public.subscriptions
    where subscriber_id = '00000000-0000-0000-0000-000000000002'
      and publisher_id = '00000000-0000-0000-0000-000000000001'),
  'APPROVED'::public.subscription_status,
  '[sub-dir] B -> A is APPROVED'
);

-- B revokes A -> B: REVOKED, notification for A.
select pg_temp._as('00000000-0000-0000-0000-000000000002');
select is(
  (select status from public.transition_subscription(
    (select id from public.subscriptions
      where subscriber_id = '00000000-0000-0000-0000-000000000001'
        and publisher_id = '00000000-0000-0000-0000-000000000002'),
    'REVOKED')),
  'REVOKED'::public.subscription_status,
  '[sub-lifecycle] B revokes A -> B to REVOKED'
);
select pg_temp._as('00000000-0000-0000-0000-000000000001');
select is(
  (select count(*) from public.notifications where user_id = '00000000-0000-0000-0000-000000000001' and type = 'access_revoked'),
  1::bigint,
  '[sub-lifecycle] revocation creates notification for subscriber'
);

-- A re-requests B from REVOKED: new PENDING; B rejects; notification for A.
select pg_temp._as('00000000-0000-0000-0000-000000000001');
select is(
  (select status from public.request_subscription('00000000-0000-0000-0000-000000000002')),
  'PENDING'::public.subscription_status,
  '[sub-lifecycle] re-request after REVOKED creates new PENDING'
);
select pg_temp._as('00000000-0000-0000-0000-000000000002');
select is(
  (select status from public.transition_subscription(
    (select id from public.subscriptions
      where subscriber_id = '00000000-0000-0000-0000-000000000001'
        and publisher_id = '00000000-0000-0000-0000-000000000002'),
    'REJECTED')),
  'REJECTED'::public.subscription_status,
  '[sub-lifecycle] rejection transitions A -> B to REJECTED'
);
select pg_temp._as('00000000-0000-0000-0000-000000000001');
select is(
  (select count(*) from public.notifications where user_id = '00000000-0000-0000-0000-000000000001' and type = 'subscription_rejected'),
  1::bigint,
  '[sub-lifecycle] rejection creates notification for subscriber'
);

reset role;
select * from finish();
rollback;
