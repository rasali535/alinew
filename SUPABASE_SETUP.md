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
   `postgresql://postgres.wctqmtwaoaugxlqkslhn:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres`
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
DATABASE_URL=postgresql://postgres.wctqmtwaoaugxlqkslhn:xOruveqI2UiOpBsX@aws-0-us-east-1.pooler.supabase.com:6543/postgres
DATABASE_SSL=true
```

## Troubleshooting

### "Tenant or user not found" Error

If you see this error in the Render logs:

1. **Check Project ID**: Ensure `wctqmtwaoaugxlqkslhn` is correct in your `DATABASE_URL`.
2. **Special Characters**: Nếu password của bạn có các ký tự đặc biệt như `@`, `#`, `:`, `/`, bạn **phải** mã hóa chúng (URL Encode). Ví dụ: `@` trở thành `%40`.
3. **Use Transaction Pooler**: Ensure you are using the **Pooler URI** (Port 6543) and not the direct connection (Port 5432).
4. **Project Status**: Verify your Supabase project is not "Paused".

*Note: For Render, ensure `DATABASE_SSL` is set to `true` to allow encrypted connections to Supabase.*
