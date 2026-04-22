# 虾谷对战 — Full Stack (Custom proxy → game server + Next.js)
FROM node:20-slim

WORKDIR /app

# Install build tools (better-sqlite3 native)
RUN apt-get update && apt-get install -y \
    python3 make g++ curl \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm ci --include=dev

# Copy source
COPY . .

# Build Next.js frontend
RUN NEXT_PUBLIC_API_BASE=https://hungry-shrimp-production.up.railway.app npx next build

# Environment
ENV NODE_ENV=production
ENV GAME_PORT=3003
ENV PORT=8080
ENV DB_PATH=/data/hungryshrimp.db

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1

# Start custom proxy server (proxies /api/*/ws/* to game server :3003, serves Next.js :8080)
CMD node server-standalone.ts
