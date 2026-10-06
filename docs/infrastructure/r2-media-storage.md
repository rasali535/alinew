# Ralion Cloudflare R2 Media Storage

## Production bucket

- Bucket: `ralion-media-prod`
- Access: private
- S3 region: `auto`
- Activation: explicit via `RALION_ASSET_STORAGE_PROVIDER=R2`

## Required server environment

```text
RALION_ASSET_STORAGE_PROVIDER=R2
R2_BUCKET_NAME=ralion-media-prod
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=<server secret>
R2_SECRET_ACCESS_KEY=<server secret>
R2_REGION=auto
R2_SUPABASE_FALLBACK=true
```

The access key and secret are server-only. Never expose them with a `NEXT_PUBLIC_` prefix and never commit them.

## Rollout model

R2 is the primary write target for new creative assets. Supabase Storage remains the read fallback during migration so existing creative assets continue to work after the provider switch.

Canonical object paths remain tenant and workspace scoped:

```text
organizations/{organizationId}/workspaces/{workspaceId}/assets/{assetId}/...
```

This keeps the current Ralion tenant-isolation contract unchanged.

## Secure delivery

Buckets remain private. Authenticated Ralion delivery routes verify organization and workspace ownership before issuing short-lived signed URLs. R2 signed URLs use AWS Signature Version 4 and expire after the requested lifetime, capped at the S3/R2 seven-day maximum.

Do not attach a public custom domain to this bucket until the private delivery path has passed production acceptance.

## Acceptance gate

Before marking R2 production-ready:

1. Upload one test creative through Ralion.
2. Confirm the final object and metadata JSON exist in `ralion-media-prod`.
3. Confirm the stored SHA-256 matches the downloaded object.
4. Confirm the Ralion delivery endpoint returns a working short-lived R2 signed URL.
5. Confirm another tenant cannot resolve the asset.
6. Confirm a legacy Supabase creative still loads through fallback.
7. Reject a generated raw asset and confirm cleanup removes it from R2.
8. Confirm one click still produces one paid generation and one final asset.
9. Run monorepo build, Node CI, Playwright, and the R2 storage contract check.

After those gates are green, the custom asset domain/CDN phase can be enabled separately.
