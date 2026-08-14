# Rasali Labs Architecture & Network Flow

## High-Level Diagram

```
┌─────────────────────────────────────────────────────┐
│                     INTERNET                         │
│              (HTTPS Client Requests)                │
└────────────────────────┬────────────────────────────┘
                         │
                         │ :443 SSL/TLS
                         ▼
    ┌────────────────────────────────────────────┐
    │      HOSTINGER VPS (Docker Host)           │
    │      IP: 185.xxx.xxx.xxx                   │
    │                                            │
    │  ┌─ Docker Bridge Network: rasali-net ─┐  │
    │  │                                      │  │
    │  │  ┌──────────────────────────────┐   │  │
    │  │  │   nginx:443/80               │   │  │
    │  │  │   (Reverse Proxy)            │   │  │
    │  │  │   rasali-nginx               │   │  │
    │  │  └──────────────────────────────┘   │  │
    │  │      │                               │  │
    │  │      ├──→ /                          │  │
    │  │      │   ↓                           │  │
    │  │      │  website:80 (Vite)           │  │
    │  │      │  rasali-website              │  │
    │  │      │                              │  │
    │  │      ├──→ /ralion/                  │  │
    │  │      │   ↓                          │  │
    │  │      │  ralion:3000 (Next.js)       │  │
    │  │      │  rasali-ralion               │  │
    │  │      │                              │  │
    │  │      └──→ /api/                     │  │
    │  │          ↓                          │  │
    │  │         backend:4000 (Express)      │  │
    │  │         rasali-backend              │  │
    │  │                                     │  │
    │  │  ┌──────────────────────────────┐   │  │
    │  │  │   certbot                    │   │  │
    │  │  │   (SSL Cert Renewal)         │   │  │
    │  │  │   rasali-certbot             │   │  │
    │  │  └──────────────────────────────┘   │  │
    │  │     (runs every 12 hours)           │  │
    │  │                                     │  │
    │  └─────────────────────────────────────┘  │
    │                                           │
    │  Volumes:                                 │
    │  - certbot-conf → /etc/letsencrypt       │
    │  - certbot-www  → /var/www/certbot       │
    └───────────────────────────────────────────┘
                         │
                         │ (Outbound)
                         ▼
        ┌───────────────────────────────┐
        │   Supabase (PostgreSQL)       │
        │   External OAuth Providers    │
        │   Google Cloud Vertex AI      │
        └───────────────────────────────┘
```

---

## Container-to-Container Communication

All containers are on the **`rasali-net`** Docker bridge network. They communicate by hostname:

```
nginx → website:80     (Vite static files)
nginx → ralion:3000    (Next.js server)
nginx → backend:4000   (Express API)
```

**No port mapping needed** between containers—Docker's internal DNS resolves these.

---

## Data Flow Examples

### Example 1: User visits `https://rasalilabs.com`

```
1. Browser → rasalilabs.com (port 443, TLS)
2. VPS port 443 → rasali-nginx container (docker-compose.yml port mapping)
3. nginx reads nginx/nginx.conf
4. Matches location: "/" → proxies to website:80
5. website container serves /app/apps/website/dist/index.html (built Vite SPA)
6. Browser receives HTML + JS + CSS + logo + etc.
```

### Example 2: User navigates to `/ralion/` dashboard

```
1. Browser → https://rasalilabs.com/ralion/ (port 443, TLS)
2. VPS port 443 → rasali-nginx container
3. nginx reads nginx/nginx.conf
4. Matches location: "/ralion/" → proxies to ralion:3000
5. ralion container (Next.js server) receives request
6. Next.js renders page, calls Supabase API (outbound)
7. Browser receives HTML + JS bundles
```

### Example 3: Backend API call from frontend

```
1. Browser JS → POST /api/chat (relative URL, same origin)
2. Browser → https://rasalilabs.com/api/chat (TLS)
3. VPS port 443 → rasali-nginx container
4. nginx reads nginx/nginx.conf
5. Matches location: "/api/" → proxies to backend:4000
6. backend container (Express) receives POST request
7. Backend connects to Supabase + Vertex AI (outbound)
8. Returns JSON response to browser
```

### Example 4: SSL Certificate Renewal

```
1. certbot container wakes up every 12 hours
2. Checks if certificate expiration < 30 days
3. If renewal needed:
   - HTTP request to Let's Encrypt
   - Let's Encrypt validates via ACME challenge (port 80)
   - nginx serves /.well-known/acme-challenge/ (from certbot-www volume)
   - Certificate renewed, stored in certbot-conf volume
4. nginx reloads SSL config (no restart needed)
5. Done. 90-day cycle repeats.
```

---

## Environment Variables & Secrets

### Build-Time (baked into images)

These are set during `docker compose up -d --build` and become part of the image:

```
# In Dockerfile.website
ARG VITE_API_URL=https://rasalilabs.com/api  (for Vite build)

# In Dockerfile.ralion
ARG NEXT_PUBLIC_SUPABASE_URL=...             (for Next.js build)
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=...
ARG NEXT_PUBLIC_APP_URL=...
ARG NEXT_PUBLIC_RASALI_PLATFORM_URL=...
```

### Runtime-Only (set in .env, NOT in images)

These are passed to containers at runtime and never leave the container:

```
# Backend only
SUPABASE_SERVICE_ROLE_KEY=...     (server-side secret key)
OAUTH_ENCRYPTION_KEY=...          (server-side encryption)
DATABASE_URL=...                   (database connection string)
JWT_SECRET=...                     (auth token signing)
FACEBOOK_APP_SECRET=...            (social OAuth secrets)
# ... all other OAuth secrets
```

**Important**: `NEXT_PUBLIC_*` prefixed variables ARE exposed to the browser (that's intentional for public keys). Secrets like `*_SECRET` and `*_KEY` are NEVER exposed.

---

## Volumes

### `certbot-conf`
- **Mount point in containers**: `/etc/letsencrypt`
- **Purpose**: Stores SSL certificates, keys, renewal metadata
- **Mounted by**: `nginx` (read-only), `certbot` (read-write)
- **Persistence**: Survives container restarts

### `certbot-www`
- **Mount point**: `/var/www/certbot`
- **Purpose**: ACME challenge files during certificate renewal
- **Mounted by**: `nginx` (read-only for serving challenges), `certbot` (read-write)
- **Persistence**: Survives container restarts

### No volumes for app code
- Website, Ralion, Backend are **stateless** (code baked into images during build)
- Zero volume mounts needed—fully portable containers

---

## Health Checks

Each container has a health check to ensure it's responsive:

```yaml
# website (Vite)
test: wget http://localhost:80   # Can reach static files

# ralion (Next.js)
test: wget http://localhost:3000/ralion   # App responds

# backend (Express)
test: wget http://localhost:4000/health   # API health endpoint

# nginx
test: nginx -t   # Config syntax valid
```

If a container fails health checks repeatedly, Docker marks it `unhealthy` but doesn't auto-restart. Monitor via `docker compose ps`.

---

## Networking Policies

```
✅ ALLOWED:
  - nginx ↔ all app containers (bridge network)
  - app containers → external APIs (Supabase, Google Cloud, OAuth)
  - all containers → VPS host (loopback)

❌ BLOCKED (by default):
  - Direct container → VPS host machine (must use gateway IP or loopback)
  - Container → another container's exposed port (must use internal hostname)
  - External → containers directly (must go through nginx port 443)
```

---

## Restart Policies

All containers use `restart: unless-stopped`:

```
- If container crashes → Docker auto-restarts it
- If VPS reboots → containers restart automatically
- Manual stop via docker compose → respects stop, won't auto-restart
```

To fully stop and prevent restart:
```bash
docker compose down  # or docker compose stop
```

---

## Scaling Considerations

### Current Setup
- **Single VPS instance**
- **All containers on one machine**
- **Suitable for**: < 10K concurrent users, < 1TB/month bandwidth

### If Traffic Grows

**Option 1: Vertical Scaling (bigger VPS)**
- Upgrade RAM/CPU on Hostinger
- Restart containers
- Works until ~100K concurrent users

**Option 2: Docker Swarm (multiple VPS instances)**
- Add more VPS nodes to Swarm cluster
- Services replicate across nodes
- Load balancing at the VPS gateway level

**Option 3: Kubernetes (managed or self-hosted)**
- Use Docker Desktop Kubernetes or managed service (GKE, EKS, AKS)
- Auto-scaling policies
- Most complex but production-grade

For now, stick with single-VPS setup—scale when needed.

---

## Security Architecture

```
Internet (untrusted)
    ↓
VPS Firewall (ports 22, 80, 443 open; rest blocked)
    ↓
nginx container (public-facing)
    ├→ TLS termination (SSL/TLS)
    ├→ Request validation
    ├→ Rate limiting (optional)
    └→ Routes to internal containers (bridge network, isolated)
    
Internal containers (no direct internet access)
    ├→ website (only serves files)
    ├→ ralion (Supabase auth only)
    └→ backend (Supabase + OAuth only)

Secrets (.env):
    - Stored on VPS only (not in Docker Hub)
    - Read by containers at runtime
    - Never logged or exposed in images
    - chmod 600 (readable by root only)
```

---

## Troubleshooting by Layer

### Layer 1: VPS Connectivity
```bash
# Can I SSH?
ssh root@YOUR_VPS_IP

# Can I reach the VPS on port 443?
curl -I https://rasalilabs.com

# Are firewall ports open?
netstat -tlnp | grep -E ':80|:443'
```

### Layer 2: Docker Daemon
```bash
# Are containers running?
docker compose ps

# Is Docker service running?
systemctl status docker

# Any Docker errors?
docker compose logs | grep -i error
```

### Layer 3: Container Networking
```bash
# Can nginx resolve website hostname?
docker exec rasali-nginx nslookup website

# Can website serve files?
docker exec rasali-website wget http://localhost:80 -O -

# Can backend connect to database?
docker compose logs backend | grep -i "database\|connection"
```

### Layer 4: External APIs
```bash
# Can backend reach Supabase?
docker exec rasali-backend curl -I https://yidsfihagwttlmhfynmf.supabase.co

# Can frontend reach OAuth providers?
docker compose logs ralion | grep -i "facebook\|google\|oauth"
```

---

## Summary

| Component | Role | Port (external) | Port (internal) | Communication |
|---|---|---|---|---|
| nginx | Reverse proxy + SSL | 443/80 | N/A | Receives external requests |
| website | Static SPA (Vite) | N/A | 80 | nginx proxies to it |
| ralion | Next.js dashboard | N/A | 3000 | nginx proxies to it |
| backend | Express API | N/A | 4000 | nginx proxies to it |
| certbot | SSL renewal | N/A | N/A | Background task, no ports |

All internal communication uses Docker DNS hostnames (e.g., `website:80`).
All external communication goes through nginx on ports 80/443.
All secrets stay in `.env` and never leak into images or logs.
