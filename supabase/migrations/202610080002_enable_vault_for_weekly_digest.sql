-- The scheduled digest migration reads its URL and bearer token from Vault.
-- Install the extension through a migration so production and local schemas match.
create extension if not exists supabase_vault with schema vault;
