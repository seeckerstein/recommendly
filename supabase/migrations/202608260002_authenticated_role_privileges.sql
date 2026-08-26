-- RLS decides which rows are accessible; these grants allow authenticated clients
-- to perform only the operation classes covered by the corresponding policies.
grant select, insert, update on public.profiles to authenticated;
grant select on public.categories to authenticated;
grant select, insert, update, delete on public.recommendations to authenticated;
grant select, insert on public.subscriptions to authenticated;
grant select, insert, update, delete on public.recommendation_ratings to authenticated;
grant select, insert, update, delete on public.comments to authenticated;
grant select, update on public.notifications to authenticated;
