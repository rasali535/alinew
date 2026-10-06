# Archived alternate migration versions

These eight SQL files previously lived in `supabase/migrations/` under timestamps different from the versions recorded by production. The active migration directory now uses the actual recorded versions and SQL, including previously missing migrations.

This directory preserves the original source for review. Supabase must replay only `supabase/migrations/`; do not copy these alternate versions back into the active stream or apply both copies.
