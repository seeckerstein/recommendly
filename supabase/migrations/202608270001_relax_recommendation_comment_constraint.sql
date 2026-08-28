-- Checkpoint 4E: make the comment field optional for recommendations.
-- The original schema required a non-empty comment (1..5000 chars).
-- Now only the title is required; the comment is optional.

ALTER TABLE public.recommendations
  DROP CONSTRAINT IF EXISTS recommendations_comment_check;

ALTER TABLE public.recommendations
  ADD CONSTRAINT recommendations_comment_check
  CHECK (comment IS NULL OR (char_length(comment) >= 1 AND char_length(comment) <= 5000));

ALTER TABLE public.recommendations
  ALTER COLUMN comment DROP NOT NULL;
