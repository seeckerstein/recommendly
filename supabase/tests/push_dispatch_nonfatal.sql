begin;
create extension if not exists pgtap;
select plan(1);

insert into auth.users (id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000101', 'authenticated', 'authenticated', 'req@example.test'),
  ('00000000-0000-0000-0000-000000000102', 'authenticated', 'authenticated', 'pub@example.test');
update public.profiles set display_name = 'Publisher' where id = '00000000-0000-0000-0000-000000000102';

-- Provision the dispatcher with an unreachable URL so pg_net raises
-- synchronously during the trigger. Notification creation must survive it.
insert into vault.secrets (secret, name) values
  ('https://127.0.0.1:9/push', 'push_dispatcher_function_url'),
  ('test-dispatcher-secret', 'push_dispatcher_secret');

set local role authenticated;
select pg_temp._as('00000000-0000-0000-0000-000000000101');
select lives_ok(
  $$select public.request_subscription('00000000-0000-0000-0000-000000000102')$$,
  '[push-dispatch] notification creation succeeds when push dispatch fails'
);

rollback;
