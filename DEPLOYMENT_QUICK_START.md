# 🚀 Rasali Labs Hostinger Deployment — Quick Start

## Setup overview

```bash
# 1. SSH into the VPS
ssh root@YOUR_VPS_IP

# 2. Clone the repository
git clone https://github.com/YOUR_USERNAME/alinew.git /var/www/rasalilabs
cd /var/www/rasalilabs

# 3. Create the runtime environment file from the sanitized template
cp .env.production.example .env
chmod 600 .env
nano .env

# 4. Obtain the TLS certificate
certbot certonly --standalone \
  -d rasalilabs.com \
  -d www.rasalilabs.com \
  --agree-tos \
  --non-interactive \
  --email YOUR_EMAIL

# 5. Build and start containers
docker compose up -d --build

docker compose ps
```

## Runtime configuration

Public browser-safe values may be set directly from deployment configuration. Privileged values must come from the server runtime environment or the platform secret store and must never be committed to Git.

```bash
# Browser-safe configuration
NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
NEXT_PUBLIC_RASALI_PLATFORM_URL=https://rasalilabs.com
NEXT_PUBLIC_APP_URL=https://rasalilabs.com/ralion
VITE_API_URL=https://rasalilabs.com/api

# Privileged server-side configuration
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
DATABASE_URL=${DATABASE_URL}
JWT_SECRET=${JWT_SECRET}
OAUTH_ENCRYPTION_KEY=${OAUTH_ENCRYPTION_KEY}
FACEBOOK_APP_ID=${FACEBOOK_APP_ID}
FACEBOOK_APP_SECRET=${FACEBOOK_APP_SECRET}

DATABASE_SSL=true
```

Do not place real passwords, API keys, access tokens, private keys, OAuth secrets, or service-role credentials in this file, documentation, shell history, issue comments, screenshots, or Git commits.

## What gets deployed

| URL | Container | Internal Port | Purpose |
|---|---|---:|---|
| `https://rasalilabs.com` | `rasali-website` | 80 | Marketing site |
| `https://rasalilabs.com/ralion` | `rasali-ralion` | 3000 | Ralion dashboard |
| `https://rasalilabs.com/api` | `rasali-backend` | 4000 | Express API |
| 80/443 | `rasali-nginx` | — | Reverse proxy and TLS |

Routing is handled by `nginx/nginx.conf`. TLS certificates are managed by certbot.

## GitHub Actions deployment

Repository secrets should contain only the values required by the deployment workflow, such as the VPS host and SSH key. Never copy production application credentials into workflow files.

Typical repository secret names:

```text
VPS_HOST
VPS_USER
VPS_SSH_KEY
VPS_PORT
```

## Common VPS commands

```bash
ssh root@YOUR_VPS_IP
cd /var/www/rasalilabs

docker compose ps
docker compose logs -f
docker compose logs -f ralion
docker compose logs -f backend
docker compose logs -f nginx

git pull origin main
docker compose up -d --build --remove-orphans

docker compose restart backend
docker compose down
```

## Security checklist

- Keep `.env`, `.env.local`, `.env.production`, private keys, access tokens and database credentials out of Git.
- Set restrictive permissions on runtime secret files, for example `chmod 600 .env`.
- Expose only required public ports.
- Keep privileged variables unprefixed by `NEXT_PUBLIC_` or `VITE_`.
- Use server-side secret stores where available.
- Rotate any credential that has ever been committed to a public repository.
- Run `npm run security:secrets` before release.

## Troubleshooting

For deployment issues, inspect container status and logs first:

```bash
docker compose ps
docker compose logs --tail=200 backend
docker compose logs --tail=200 ralion
docker compose logs --tail=200 nginx
```

If the application reports a missing secret, configure it in the deployment environment. Do not add a hardcoded fallback in source code.
