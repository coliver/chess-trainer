#!/bin/sh
# Certbot deploy hook: reloads nginx so a renewed cert actually takes
# effect. nginx loads the cert into memory once at startup/reload and
# never re-reads the files on disk on its own, so without this, a
# successful `certbot renew` renews the files but the running container
# keeps serving the old (soon-to-expire) cert until something restarts it.
#
# Install by copying (or symlinking) this file into certbot's own
# deploy-hooks directory on the host — certbot runs every executable script
# found there automatically after each renewal, no timer/systemd changes
# needed:
#
#   sudo cp scripts/certbot-deploy-hook.sh /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
#   sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
#
# certbot copies/runs this from /etc/letsencrypt/renewal-hooks/deploy/, not
# from inside the repo, so it can't find docker-compose.yml via a relative
# path — point REPO_DIR at the actual clone (override via env if yours
# differs, e.g. `REPO_DIR=/opt/chess-trainer` in the installed copy).
#
# Uses `nginx -s reload` (graceful, no dropped connections) rather than a
# container restart.
set -eu

REPO_DIR="${REPO_DIR:-/home/ec2-user/chess-trainer}"
cd "$REPO_DIR"
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec nginx nginx -s reload
