-- Add "series" and "other" recommendation categories (Checkpoint 5.7).

insert into public.categories (slug, name, sort_order, metadata_schema) values
  ('series', 'Series', 4, '{"fields":["creator","seasons","platform","genre","year","status"]}'),
  ('other', 'Other', 5, '{"fields":["type","details"]}')
on conflict (slug) do nothing;