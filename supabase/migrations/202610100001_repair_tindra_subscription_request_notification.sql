insert into public.notifications
  (user_id, type, actor_user_id, reference_type, reference_id)
select
  '159b928b-361a-4aa7-8877-5b2fd64af094'::uuid,
  'subscription_request',
  '03f37353-5200-4b5a-9289-a77aa59abdac'::uuid,
  'subscription',
  '4c026974-dd97-4390-8594-9eb2dfefeb7b'::uuid
from public.subscriptions s
where s.id = '4c026974-dd97-4390-8594-9eb2dfefeb7b'
  and s.subscriber_id = '03f37353-5200-4b5a-9289-a77aa59abdac'
  and s.publisher_id = '159b928b-361a-4aa7-8877-5b2fd64af094'
  and s.status = 'PENDING'
  and not exists (
    select 1
    from public.notifications n
    where n.user_id = '159b928b-361a-4aa7-8877-5b2fd64af094'
      and n.type = 'subscription_request'
      and n.actor_user_id = '03f37353-5200-4b5a-9289-a77aa59abdac'
      and n.reference_type = 'subscription'
      and n.reference_id = '4c026974-dd97-4390-8594-9eb2dfefeb7b'
  );