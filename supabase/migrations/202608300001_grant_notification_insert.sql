-- Bug fix: authenticated role was never granted table-level INSERT on notifications.
-- RLS policy existed but was ineffective without the underlying GRANT.

GRANT INSERT ON public.notifications TO authenticated;

