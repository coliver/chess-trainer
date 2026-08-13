FROM mcr.microsoft.com/playwright:v1.62.0-jammy

WORKDIR /app

# 1) Build the shared chess-core package first — its own isolated install + tsup
#    build. React depends on it via `file:../packages/chess-core`, which resolves
#    from /app to /packages/chess-core.
COPY packages/chess-core /packages/chess-core
RUN cd /packages/chess-core && npm ci && npm run build

# 2) Install React (the file: dep links to the package built above).
COPY react/package*.json ./
RUN npm ci

COPY react/ .

RUN npx playwright install

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
