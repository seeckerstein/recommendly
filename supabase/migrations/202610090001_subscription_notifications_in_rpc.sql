-- Subscription lifecycle notifications are system-generated records. The API
-- previously inserted them with the requester's own authenticated client, which
-- the notifications INSERT policy (actor_user_id = auth.uid()) correctly
-- rejected: a user cannot address a notification to someone else. Creating the
-- notification inside the SECURITY DEFINER lifecycle RPCs keeps it transactional
-- with the subscription state change, remains idempotent for repeated requests,
-- and lets us remove the broad client-side INSERT policy that existed to make
-- the old approach work.

create or replace function public.create_subscription_notification(
  p_notification_user_id uuid,
  p_actor_user_id uuid,
  p_type text,
  p_reference_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications
    (user_id, type, actor_user_id, reference_type, reference_id)
  values
    (p_notification_user_id, p_type, p_actor_user_id, 'subscription', p_reference_id);
end;
$$;

revoke all on function public.create_subscription_notification(uuid, uuid, text, uuid)
  from public, anon, authenticated, service_role;

create or replace function public.request_subscription(target_publisher_id uuid)
returns public.subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.subscriptions;
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

  perform public.create_subscription_notification(
    result.publisher_id,
    auth.uid(),
    'subscription_request',
    result.id
  );

  return result;
end;
$$;

create or replace function public.transition_subscription(
  subscription_id uuid,
  next_status public.subscription_status
)
returns public.subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.subscriptions;
begin
  select * into result from public.subscriptions where id = subscription_id for update;
  if result is null or result.publisher_id <> auth.uid() or next_status not in ('APPROVED', 'REJECTED', 'REVOKED') then
    raise exception 'invalid subscription transition';
  end if;

  -- Idempotent no-op: requesting the current APPROVED or REJECTED state succeeds.
  if next_status = result.status and next_status in ('APPROVED', 'REJECTED') then
    return result;
  end if;

  if (result.status = 'PENDING' and next_status not in ('APPROVED', 'REJECTED'))
     or (result.status = 'APPROVED' and next_status <> 'REVOKED') then
    raise exception 'invalid subscription transition';
  end if;

  update public.subscriptions
     set status = next_status,
         approved_at = case when next_status = 'APPROVED' then now() else null end
   where id = subscription_id
  returning * into result;

  perform public.create_subscription_notification(
    result.subscriber_id,
    auth.uid(),
    case
      when next_status = 'APPROVED' then 'subscription_approved'
      when next_status = 'REJECTED' then 'subscription_rejected'
      else 'access_revoked'
    end,
    result.id
  );

  return result;
end;
$$;

drop policy if exists "authenticated users can create notifications" on public.notifications;
