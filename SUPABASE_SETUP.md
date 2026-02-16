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
   `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`
5. Replace `[PASSWORD]` with your actual database password.

## 3. Enable Extensions

You can enable extensions via the Supabase Dashboard:

1. Go to **Database** > **Extensions**.
2. Search for and enable:
   - `vector` (for pgvector semantic search)
   - `uuid-ossp` (for UUID generation)

*Note: The migration scripts will also try to run `CREATE EXTENSION IF NOT EXISTS`, but enabling them via the UI is a safe first step.*

## 4. Environment Variables

Update your `.env` file (or Render Environment Variables) with the following:

```env
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
DATABASE_SSL=true
```

*Note: For Render, ensure `DATABASE_SSL` is set to `true` to allow encrypted connections to Supabase.*

## 5. Run Migrations

When you start the backend server (`npm start` or `npm run dev`), it will automatically attempt to run migrations if the database is connected.

Alternatively, you can copy the contents of `server/src/database/migrations/001_initial_schema.sql` and `002_create_leads_table.sql` and run them directly in the **Supabase SQL Editor**.
