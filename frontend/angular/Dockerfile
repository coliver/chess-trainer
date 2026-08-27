FROM node:22

WORKDIR /app

# Build the shared chess-core package first (its own isolated install + build).
# Angular depends on it via file:../packages/chess-core, resolved from /app to
# /packages/chess-core.
COPY packages/chess-core /packages/chess-core
RUN cd /packages/chess-core && npm ci && npm run build

# Shared locale JSON and sound effects, synced into public/i18n/ and
# public/sounds/ by scripts/sync-i18n-locales.mjs and scripts/sync-shared-assets.mjs
# (run via the start/build/test npm scripts) since the Angular CLI's asset
# glob can't reach outside the workspace root.
COPY packages/i18n-locales /packages/i18n-locales
COPY packages/shared-assets /packages/shared-assets

# styles.css imports these directly by relative path (../../packages/shared-styles/*.css),
# resolved by esbuild at build/serve time rather than through npm — baked in here so a
# plain `docker build` of this image is self-sufficient even without docker-compose's
# ./frontend/packages:/packages dev volume mount overlaying the same path.
COPY packages/shared-styles /packages/shared-styles

COPY angular/package*.json ./
RUN npm ci

# Chromium's shared-lib deps, installed directly (not via the `chromium` apt
# package, whose Recommends chain pulls in a perl postinst that fails to
# configure under this build sandbox). --reinstall on libglib2.0-0 works
# around a truncated copy in the base node image (0-byte .so on disk).
# fontconfig/libpango/libcairo's own postinst also fails here (same sandbox
# restriction, unrelated to the package contents) — their .so files still land
# on disk during unpack, so `|| true` lets the build continue past the
# dpkg-configure error rather than treating it as fatal.
RUN apt-get update && (apt-get install -y --no-install-recommends --reinstall \
    libglib2.0-0 libnspr4 libnss3 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 \
    libxrandr2 libgbm1 libasound2 libpango-1.0-0 libcairo2 || true) \
  && rm -rf /var/lib/apt/lists/*

# Chromium binary itself for karma-chrome-launcher (`ng test`) and Playwright
# (`playwright test`) — neither ships a browser of its own. karma.conf.js
# resolves CHROME_BIN from this install at runtime (no hardcoded revision path).
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npx playwright install chromium

COPY angular/ .

EXPOSE 4200

# Dev server served under /angular/ so it can sit behind nginx alongside the
# React app at /. The base href is set in angular.json (baseHref); ng serve has
# no --base-href flag. --poll makes file watching work over the Docker bind mount.
CMD ["npm", "run", "start", "--", \
  "--host", "0.0.0.0", \
  "--port", "4200", \
  "--serve-path", "/angular/", \
  "--poll", "1000"]
