# Hungry Shrimp — Full Stack (Game Server + Next.js Frontend)
FROM node:20-slim

WORKDIR /app

# Install build tools
RUN apt-get update && apt-get install -y \
    python3 make g++ curl \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev for concurrently)
RUN npm ci --include=dev

# Copy source
COPY . .

# Build Next.js frontend
# Note: NEXT_PUBLIC_API_BASE is set in Railway env vars (not here)
RUN NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE npx next build

# Environment
ENV NODE_ENV=production
ENV GAME_PORT=3003
ENV PORT=8080
ENV DB_PATH=/data/hungryshrimp.db

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1

# Start both services concurrently
# Game server on :3003, Next.js on :8080
CMD npx concurrently \
    "npx tsx server/index.ts" \
    "npx next start -p 8080"
