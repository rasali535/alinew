# Supabase Storage Setup — Ralion Release Bucket

To host multi-GB release installer binaries (`.exe`, `.dmg`, `.AppImage`) directly on Supabase Cloud Storage:

---

## 1. Create Public Storage Bucket in Supabase Dashboard

1. Log in to [Supabase Dashboard](https://supabase.com/dashboard/project/yidsfihagwttlmhfynmf).
2. Go to **Storage** -> **Buckets**.
3. Click **New Bucket**.
4. Set Bucket Name: `releases`
5. Enable **Public Bucket** (toggle to ON so binaries can be downloaded without auth tokens).
6. Click **Save Bucket**.

---

## 2. Set Storage Policy (SQL Query)

Alternatively, run the following SQL query in **Supabase SQL Editor**:

```sql
-- Create 'releases' bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('releases', 'releases', true)
ON CONFLICT (id) DO NOTHING;

-- Grant public read access to all users
CREATE POLICY "Public Access for Release Binaries"
ON storage.objects FOR SELECT
USING (bucket_id = 'releases');
```

---

## 3. Upload Production Binaries

Upload your built installer binaries:
- `ralion-desktop-2.4.1-setup.exe`
- `ralion-desktop-2.4.1.dmg`
- `ralion-desktop-2.4.1.AppImage`

Target Public URLs:
- `https://yidsfihagwttlmhfynmf.supabase.co/storage/v1/object/public/releases/ralion-desktop-2.4.1-setup.exe`
- `https://yidsfihagwttlmhfynmf.supabase.co/storage/v1/object/public/releases/ralion-desktop-2.4.1.dmg`
- `https://yidsfihagwttlmhfynmf.supabase.co/storage/v1/object/public/releases/ralion-desktop-2.4.1.AppImage`
