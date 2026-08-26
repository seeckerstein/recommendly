begin;
create extension if not exists pgtap;
select plan(7);

-- This test is run against a clean local database. The IDs represent owner, approved, and unapproved users.
insert into auth.users (id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'owner@example.test'),
  ('00000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'approved@example.test'),
  ('00000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'other@example.test');
insert into public.profiles (id, username, display_name, profile_visibility) values
  ('00000000-0000-0000-0000-000000000001', 'owner', 'Owner', 'PRIVATE'),
  ('00000000-0000-0000-0000-000000000002', 'approved', 'Approved', 'PRIVATE'),
  ('00000000-0000-0000-0000-000000000003', 'other', 'Other', 'PRIVATE');
insert into public.recommendations (id, user_id, category_id, comment) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', (select id from public.categories where slug='book'), 'private note');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select is((select count(*) from public.recommendations), 1::bigint, 'owner sees private recommendation');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', true);
select is((select count(*) from public.recommendations), 0::bigint, 'unapproved user cannot read private recommendation');
reset role;
insert into public.subscriptions (subscriber_id, publisher_id, status) values ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'PENDING');
set local role authenticated;
select is((select count(*) from public.recommendations), 0::bigint, 'pending request grants no access');
reset role;
update public.subscriptions set status = 'APPROVED', approved_at = now() where subscriber_id = '00000000-0000-0000-0000-000000000003';
set local role authenticated;
select is((select count(*) from public.recommendations), 1::bigint, 'approved subscription grants access');
reset role;
update public.subscriptions set status = 'REVOKED', approved_at = null where subscriber_id = '00000000-0000-0000-0000-000000000003';
set local role authenticated;
select is((select count(*) from public.recommendations), 0::bigint, 'revocation removes access immediately');
reset role;
update public.profiles set profile_visibility = 'PUBLIC' where id = '00000000-0000-0000-0000-000000000001';
set local role authenticated;
select is((select count(*) from public.recommendations), 1::bigint, 'public profile grants access');
select ok(not exists (select 1 from public.comments), 'no child records leak before access is granted');
select * from finish();
rollback;
