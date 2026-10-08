-- The Settings page writes this preference through the authenticated browser
-- client. RLS on user_settings still limits these grants to each user's row.
grant select, insert, update on public.user_settings to authenticated;
