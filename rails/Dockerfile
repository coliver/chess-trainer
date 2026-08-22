FROM ruby:3.3-slim

WORKDIR /app

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential git curl chromium && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install --no-install-recommends -y nodejs && \
    rm -rf /var/lib/apt/lists/*

COPY rails/Gemfile rails/Gemfile.lock ./
RUN bundle install

# Build the shared chess-core package first — Rails depends on it via
# `file:../packages/chess-core`, which resolves from /app to /packages/chess-core
# (same two-line pattern as react/Dockerfile).
COPY packages/chess-core /packages/chess-core
RUN cd /packages/chess-core && npm ci && npm run build

COPY rails/package*.json ./
RUN npm ci

COPY rails/ .

EXPOSE 3000
# In production, run a one-shot JS build + asset precompile and boot Puma
# directly instead of bin/dev (which watches esbuild and expects foreman) —
# dev keeps bin/dev's live-reload behavior unchanged.
CMD ["sh", "-c", "mkdir -p public/rails && cp -r /packages/shared-assets/cm-chessboard-assets public/rails/ && cp -r /packages/shared-assets/sounds public/rails/ && if [ \"$RAILS_ENV\" = \"production\" ]; then npm run build && bin/rails assets:precompile && exec bin/rails server -b 0.0.0.0; else exec bin/dev; fi"]
