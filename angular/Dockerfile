FROM node:20

WORKDIR /app

# Build the shared chess-core package first (its own isolated install + build).
# Angular depends on it via file:../packages/chess-core, resolved from /app to
# /packages/chess-core.
COPY packages/chess-core /packages/chess-core
RUN cd /packages/chess-core && npm ci && npm run build

COPY angular/package*.json ./
RUN npm ci

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
