// Custom server: Next.js + reverse proxy to game server
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { createProxyMiddleware } from "http-proxy-middleware";
import { spawn } from "child_process";

const GAME_PORT = 3003;
const GAME_HOST = `http://localhost:${GAME_PORT}`;
const PORT = parseInt(process.env.PORT || "8080", 10);

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Spawn game server in background — explicitly pass GAME_PORT=3003, PORT=3003
  const gameProc = spawn("npx", ["tsx", "server/index.ts"], {
    cwd: process.cwd(),
    stdio: "inherit",
    detached: true,
    env: {
      ...process.env,
      NODE_ENV: "production",
      GAME_PORT: "3003",
      PORT: "3003",
      DB_PATH: process.env.DB_PATH || "/data/hungryshrimp.db",
    },
  });
  gameProc.unref();
  console.log(`[server-standalone] Game server spawning on :${GAME_PORT} (pid will detach)`);

  const server = createServer((req, res) => {
    const pathname = parse(req.url || "/").pathname || "/";

    // Proxy /api/* → game server
    if (pathname.startsWith("/api")) {
      createProxyMiddleware({
        target: GAME_HOST,
        changeOrigin: true,
        pathRewrite: { "^/api": "/api" },
      })(req as any, res as any, (err: any) => {
        if (err) { res.writeHead(502); res.end(JSON.stringify({ error: "Game server unavailable" })); }
      });
      return;
    }

    // Proxy /ws/* → game server (WebSocket)
    if (pathname.startsWith("/ws")) {
      createProxyMiddleware({
        target: GAME_HOST,
        ws: true,
        pathRewrite: { "^/ws": "/ws" },
      })(req as any, res as any);
      return;
    }

    // Health check — proxy to game server
    if (pathname === "/health") {
      createProxyMiddleware({
        target: GAME_HOST,
        changeOrigin: true,
        pathRewrite: { "^/health": "/health" },
      })(req as any, res as any, (err: any) => {
        if (err) { res.writeHead(502); res.end(JSON.stringify({ success: false, status: "unreachable" })); }
      });
      return;
    }

    // Everything else → Next.js
    handle(req, res, parse(req.url || "/", true));
  });

  // Handle WebSocket upgrades
  server.on("upgrade", (req, socket, head) => {
    const pathname = parse(req.url || "/").pathname || "/";
    if (pathname.startsWith("/ws")) {
      createProxyMiddleware({
        target: GAME_HOST,
        ws: true,
        pathRewrite: { "^/ws": "/ws" },
      })(req as any, socket as any, head as any);
    }
  });

  server.listen(PORT, () => {
    console.log(`[server-standalone] Proxy running on :${PORT}`);
  });
});
