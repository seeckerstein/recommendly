create or replace function public.cancel_subscription_request(p_subscription_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.subscriptions;
begin
  if auth.uid() is null then
    raise exception 'invalid subscription request cancellation';
  end if;

  select * into target
  from public.subscriptions
  where id = p_subscription_id
  for update;

  if target.id is null
     or target.subscriber_id <> auth.uid()
     or target.status <> 'PENDING' then
    raise exception 'invalid subscription request cancellation';
  end if;

  delete from public.notifications
  where user_id = target.publisher_id
    and type = 'subscription_request'
    and actor_user_id = target.subscriber_id
    and reference_type = 'subscription'
    and reference_id = target.id;

  delete from public.subscriptions
  where id = target.id;
end;
$$;

revoke all on function public.cancel_subscription_request(uuid)
  from public, anon, service_role;
grant execute on function public.cancel_subscription_request(uuid)
  to authenticated;