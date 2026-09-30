-- Idempotent subscription transitions.
-- Repeated APPROVED -> APPROVED and REJECTED -> REJECTED are no-ops that return
-- the existing subscription. This fixes the Activity-page error when two unread
-- notifications reference the same subscription (re-request reuse).

create or replace function public.transition_subscription(subscription_id uuid, next_status public.subscription_status)
returns public.subscriptions language plpgsql security definer set search_path = public as $$
declare result public.subscriptions;
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
     set status = next_status, approved_at = case when next_status = 'APPROVED' then now() else null end
   where id = subscription_id returning * into result;
  return result;
end;
$$;