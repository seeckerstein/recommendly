begin;
create extension if not exists pgtap;
select plan(13);

insert into auth.users (id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000201', 'authenticated', 'authenticated', 'requester@example.test'),
  ('00000000-0000-0000-0000-000000000202', 'authenticated', 'authenticated', 'publisher@example.test'),
  ('00000000-0000-0000-0000-000000000203', 'authenticated', 'authenticated', 'other@example.test');

-- Include an unrelated publisher notification and the independent reverse direction.
insert into public.notifications (user_id, type, actor_user_id, reference_type, reference_id)
values ('00000000-0000-0000-0000-000000000202', 'comment', '00000000-0000-0000-0000-000000000203', 'recommendation', '10000000-0000-0000-0000-000000000201');
insert into public.subscriptions (subscriber_id, publisher_id, status)
values ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000201', 'PENDING');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000201', true);
select is(
  (select status from public.request_subscription('00000000-0000-0000-0000-000000000202')),
  'PENDING'::public.subscription_status,
  '[cancel] normal request flow creates a pending subscription'
);
reset role;
select is(
  (select count(*) from public.notifications
   where user_id = '00000000-0000-0000-0000-000000000202'
     and type = 'subscription_request'
     and actor_user_id = '00000000-0000-0000-0000-000000000201'
     and reference_type = 'subscription'
     and reference_id = (select id from public.subscriptions
       where subscriber_id = '00000000-0000-0000-0000-000000000201'
         and publisher_id = '00000000-0000-0000-0000-000000000202')),
  1::bigint,
  '[cancel] normal request flow creates the matching publisher notification'
);

-- The publisher cannot cancel the request addressed to them.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000202', true);
select throws_ok(
  $$select public.cancel_subscription_request((select id from public.subscriptions where subscriber_id = '00000000-0000-0000-0000-000000000201' and publisher_id = '00000000-0000-0000-0000-000000000202'))$$,
  'P0001',
  'invalid subscription request cancellation',
  '[cancel] publisher cannot cancel another user''s request'
);
reset role;

-- The requester cancels only their own pending direction.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000201', true);
select lives_ok(
  $$select public.cancel_subscription_request((select id from public.subscriptions where subscriber_id = '00000000-0000-0000-0000-000000000201' and publisher_id = '00000000-0000-0000-0000-000000000202'))$$,
  '[cancel] requester can cancel own pending request'
);
reset role;
select is(
  (select count(*) from public.subscriptions
   where subscriber_id = '00000000-0000-0000-0000-000000000201'
     and publisher_id = '00000000-0000-0000-0000-000000000202'),
  0::bigint,
  '[cancel] pending subscription is deleted'
);
select is(
  (select count(*) from public.notifications
   where user_id = '00000000-0000-0000-0000-000000000202'
     and type = 'subscription_request'
     and actor_user_id = '00000000-0000-0000-0000-000000000201'
     and reference_type = 'subscription'),
  0::bigint,
  '[cancel] matching request notification is deleted'
);
select is(
  (select count(*) from public.notifications
   where user_id = '00000000-0000-0000-0000-000000000202'
     and type = 'comment'
     and actor_user_id = '00000000-0000-0000-0000-000000000203'
     and reference_type = 'recommendation'),
  1::bigint,
  '[cancel] unrelated publisher notification remains'
);
select is(
  (select status from public.subscriptions
   where subscriber_id = '00000000-0000-0000-0000-000000000202'
     and publisher_id = '00000000-0000-0000-0000-000000000201'),
  'PENDING'::public.subscription_status,
  '[cancel] reverse-direction subscription remains unchanged'
);

insert into public.subscriptions (subscriber_id, publisher_id, status, approved_at)
values ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000203', 'APPROVED', now());
insert into public.subscriptions (subscriber_id, publisher_id, status)
values
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000203', 'REJECTED'),
  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000201', 'REVOKED');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000202', true);
select throws_ok(
  $$select public.cancel_subscription_request((select id from public.subscriptions where subscriber_id = '00000000-0000-0000-0000-000000000202' and publisher_id = '00000000-0000-0000-0000-000000000203'))$$,
  'P0001',
  'invalid subscription request cancellation',
  '[cancel] requester cannot cancel an approved subscription'
);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000201', true);
select throws_ok(
  $$select public.cancel_subscription_request((select id from public.subscriptions where subscriber_id = '00000000-0000-0000-0000-000000000201' and publisher_id = '00000000-0000-0000-0000-000000000203'))$$,
  'P0001',
  'invalid subscription request cancellation',
  '[cancel] requester cannot cancel a rejected subscription'
);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000203', true);
select throws_ok(
  $$select public.cancel_subscription_request((select id from public.subscriptions where subscriber_id = '00000000-0000-0000-0000-000000000203' and publisher_id = '00000000-0000-0000-0000-000000000201'))$$,
  'P0001',
  'invalid subscription request cancellation',
  '[cancel] requester cannot cancel a revoked subscription'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000201', true);
select is(
  (select status from public.request_subscription('00000000-0000-0000-0000-000000000202')),
  'PENDING'::public.subscription_status,
  '[cancel] requester can create a new request after cancellation'
);
reset role;
select is(
  (select count(*) from public.notifications
   where user_id = '00000000-0000-0000-0000-000000000202'
     and type = 'subscription_request'
     and actor_user_id = '00000000-0000-0000-0000-000000000201'
     and reference_type = 'subscription'
     and reference_id = (select id from public.subscriptions
       where subscriber_id = '00000000-0000-0000-0000-000000000201'
         and publisher_id = '00000000-0000-0000-0000-000000000202')),
  1::bigint,
  '[cancel] new request creates one matching notification'
);

select * from finish();
rollback;