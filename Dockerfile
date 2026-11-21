# syntax=docker/dockerfile:1
#
# Backend image for EC2: Fastify API + BullMQ transcode worker + Redis + ffmpeg,
# run together by supervisord.
# NOT inside the image: the Remix client (hosted on Vercel) and MongoDB (Atlas).
# Build context is the repo root:  docker build -t lokdarpan-backend .

FROM node:20-bookworm-slim AS server-deps
WORKDIR /build/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

FROM node:20-bookworm-slim AS runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg redis-server supervisor tini ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /data/redis && chown redis:redis /data/redis

ENV NODE_ENV=production \
    PORT=5000 \
    HOST=0.0.0.0 \
    REDIS_URL=redis://127.0.0.1:6379

WORKDIR /app/server
COPY --from=server-deps /build/server/node_modules ./node_modules
COPY server/ ./
COPY docker/supervisord.conf /etc/supervisor/conf.d/lokdarpan.conf

# Only the API is exposed. Redis listens on 127.0.0.1 inside the container.
EXPOSE 5000
VOLUME ["/data/redis"]

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisor/supervisord.conf"]
