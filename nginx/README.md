# ♞ Nginx — Reverse Proxy & Integration Point

Nginx serves as the single integration point for Knight School, routing all traffic to the appropriate backend service and serving the frontend SPAs under a unified origin.

## Architecture

Nginx is configured in a **same-origin design** — the frontend and the API live under `localhost`, so there is **no CORS** to manage. The React frontend talks to the API via root-absolute `/api/` paths; nginx proxies those calls to FastAPI while serving the SPA.

```
┌─────────────────────────────────────┐
│  Client (browser) — localhost       │
└────────────────────┬────────────────┘
                     │
┌────────────────────▼────────────────┐
│  Nginx (reverse proxy)              │
│  • Listen on :80 (+ :443 SSL)       │
│  • Route requests by path           │
└────────────────────┬────────────────┘
            ┌───────┼──────────┐
            │       │          │
    ┌───────▼──┐ ┌──▼──┐ ┌────▼────┐
    │  /api/   │ │  /  │ │/htmlcov/│
    │ (FastAPI)│ │React│ │  (cov)  │
    └──────────┘ └─────┘ └─────────┘
```

## Location Blocks

The Nginx configuration in `default.conf` defines these routes:

| Path | Upstream | Purpose |
|------|----------|---------|
| `/api/` | `http://api:8000/` | FastAPI backend (proxied with headers for real IP, protocol forwarding) |
| `/` | `http://react:5173` | React SPA (dev server in Docker) |
| `/vite-hmr` | `http://react:5173` | Vite HMR WebSocket (for React hot reload) |
| `/htmlcov/` | `/app/htmlcov/` | Coverage report (alias to mounted volume) |

## Terminal-Client Redirect

The bare root (`location = /`, an exact match — every other path is unaffected) checks `$is_terminal_client`, a variable set by a `map $http_user_agent` block in `terminal-client.conf` (matching `curl`/`wget`/`httpie` User-Agents). A match returns a `302` to `/api/dashboard.text`, so `curl https://knightschool.click/` lands straight on the text-mode dashboard instead of the React SPA's raw HTML — no `.text` suffix or `/api/` prefix needed to discover it exists.

`terminal-client.conf` is duplicated (not shared via a single file) between `nginx/` and `nginx/conf-prod/` — prod's compose override fully replaces the mounted `/etc/nginx/conf.d` directory rather than layering on top of dev's (see the comment in `docker-compose.prod.yml`), so a file only present in `nginx/` would silently not exist in prod. Both copies carry a comment pointing at the other; keep them in sync by hand.

## SSL/TLS Configuration

The config is set up for HTTPS:
```nginx
listen 80;
listen 443 ssl http2;
ssl_certificate /etc/nginx/certs/selfsigned.crt;
ssl_certificate_key /etc/nginx/certs/selfsigned.key;
```

The container expects self-signed certificates at `/etc/nginx/certs/`. These are mounted from the `letsencrypt/` folder in the repo (or generated on first run). For production, replace these paths with real certificates from Let's Encrypt or your CA.

## Adding a New Frontend

To add another frontend (e.g., Vue, Svelte), follow the **same pattern** used for React:

### 1. Create a Named Folder
Create `vue/` (or your frontend name) with its own dev server setup.

### 2. Add a Compose Service
In `docker-compose.yml`, add a service entry (mirroring `react`):
```yaml
vue:
  build:
    context: .
    dockerfile: vue/Dockerfile
  volumes:
    - ./vue:/app
    - /app/node_modules
  expose:
    - "5174"  # Unique port
  depends_on:
    - api
  restart: unless-stopped
```

### 3. Add a Location Block in nginx/default.conf
Add one location block to route traffic to your service:
```nginx
location /vue/ {
  set $vue_upstream vue;
  proxy_pass http://$vue_upstream:5174;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_read_timeout 86400;
}
```

### 4. Add CI Workflow
Create `.github/workflows/vue.yml` (copy from `.github/workflows/react.yml` and adjust).

### 5. No Backend Changes Required
Because all frontends call the same `/api/` path and share the same origin, the FastAPI backend needs no changes — it is frontend-agnostic.

## 📚 See Also

- **[Root README](../README.md)** — Architecture and project overview
- **[Backend README](../backend/README.md)** — API details
- **[docker-compose.yml](../docker-compose.yml)** — Service definitions
