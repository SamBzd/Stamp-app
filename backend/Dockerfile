FROM node:22.22.2-bookworm-slim AS dependencies

WORKDIR /app/backend

RUN apt-get update \
    && apt-get install --yes --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

FROM node:22.22.2-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app/backend

COPY --from=dependencies /app/backend/node_modules ./node_modules
COPY backend/package.json ./package.json
COPY backend/src ./src
COPY backend/scripts ./scripts
COPY backend/docker-entrypoint.sh ./docker-entrypoint.sh
COPY db/schema.sql /app/db/schema.sql

RUN mkdir -p /data \
    && chown -R node:node /app /data \
    && chmod +x ./docker-entrypoint.sh

USER node

EXPOSE 3000
VOLUME ["/data"]

ENTRYPOINT ["./docker-entrypoint.sh"]
