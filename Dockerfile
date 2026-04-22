# Hungry Shrimp — Game Server
FROM node:20-slim

WORKDIR /app

# Install build tools for native modules (better-sqlite3)
RUN apt-get update && apt-get install -y \
    python3 make g++ curl \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev for tsx)
RUN npm ci --include=dev

# Copy source
COPY . .

# Build step skipped — using tsx runtime

# Environment
ENV NODE_ENV=production
ENV GAME_PORT=8080
ENV PORT=8080
ENV DB_PATH=/data/hungryshrimp.db

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1

# Start game server (tsx handles TS at runtime)
CMD ["npx", "tsx", "server/index.ts"]
