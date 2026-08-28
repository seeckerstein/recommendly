-- Allow authenticated users to insert notifications where they are the actor.
-- This is needed so the API can create notifications when subscription events occur.
-- RLS still ensures users can only READ and UPDATE their own notifications.

CREATE POLICY "authenticated users can create notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (actor_user_id = auth.uid());
