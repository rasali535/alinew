# Supabase Setup Guide

This project is compatible with Supabase as the PostgreSQL backend. Follow these steps to set up your Supabase project.

## 1. Create a Supabase Project

1. Log in to [Supabase](https://supabase.com/).
2. Create a new project.
3. Note your **Database Password**.

## 2. Get Connection String

1. Go to **Project Settings** > **Database**.
2. Find the **Connection string** section.
3. Select **URI** (not Transaction Pooler for initial setup/migrations).
4. Copy the URL. It should look like:
   `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@[HOST]:6543/postgres`
5. Replace `[PASSWORD]` with your actual database password only in your secure runtime environment. Never commit it to Git.

## 3. Enable Extensions

You can enable extensions via the Supabase Dashboard:

1. Go to **Database** > **Extensions**.
2. Search for and enable:
   - `vector` (for pgvector semantic search)
   - `uuid-ossp` (for UUID generation)

*Note: The migration scripts will also try to run `CREATE EXTENSION IF NOT EXISTS`, but enabling them via the UI is a safe first step.*

## 4. Environment Variables

Set the connection string in your local/server environment only. Keep production credentials out of source control.

```env
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@[HOST]:6543/postgres
DATABASE_SSL=true
```

## Troubleshooting

### "Tenant or user not found" Error

If you see this error in the Render logs:

1. **Check Project ID**: Ensure the project reference in `DATABASE_URL` matches the intended Supabase project.
2. **Special Characters**: If the password contains characters such as `@`, `#`, `:`, or `/`, URL-encode them before placing the value in the runtime secret store. For example, `@` becomes `%40`.
3. **Use Transaction Pooler**: Ensure you are using the **Pooler URI** (Port 6543) and not the direct connection (Port 5432), when that is the deployment's configured connection mode.
4. **Project Status**: Verify your Supabase project is not paused.

*Note: For Render, ensure `DATABASE_SSL` is set to `true` to allow encrypted connections to Supabase.*
