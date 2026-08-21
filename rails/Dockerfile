FROM ruby:3.3-slim

WORKDIR /app

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential git curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install --no-install-recommends -y nodejs && \
    rm -rf /var/lib/apt/lists/*

COPY rails/Gemfile rails/Gemfile.lock ./
RUN bundle install

COPY rails/package*.json ./
RUN npm ci

COPY rails/ .

EXPOSE 3000
CMD ["sh", "-c", "mkdir -p public/rails && cp -r /packages/shared-assets/cm-chessboard-assets public/rails/ && cp -r /packages/shared-assets/sounds public/rails/ && exec bin/dev"]
