-- Re-recommendations are independent records with no V1 source foreign key.
-- The source_id column is intentionally omitted. A re-recommendation is a new
-- row in public.recommendations owned by the re-recommending user.

create index recommendations_feed_idx
  on public.recommendations (created_at desc)
  where deleted_at is null;

grant execute on function public.request_subscription(uuid) to authenticated;
