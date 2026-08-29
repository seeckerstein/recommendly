-- Checkpoint 5.3: add email column to profiles for email-based discovery.
-- Email is synced from auth.users via the existing handle_new_user trigger.
-- This allows email-based person search without exposing auth.users internals.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text;

-- Backfill from auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE u.id = p.id AND p.email IS NULL;

-- Add a unique constraint on email (matching auth.users uniqueness)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_key ON public.profiles (email);

-- Keep email synced with auth.users on insert/update
CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles SET email = NEW.email WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_email_sync
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_email();
