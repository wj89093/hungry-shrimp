// Custom server: Next.js + reverse proxy to game server
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { createProxyMiddleware } from "http-proxy-middleware";
import { spawn } from "child_process";

const GAME_PORT = parseInt(process.env.GAME_PORT || "3003", 10);
const GAME_HOST = `http://localhost:${GAME_PORT}`;
const PORT = parseInt(process.env.PORT || "8080", 10);

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Spawn game server in background
  const gameProc = spawn("npx", ["tsx", "server/index.ts"], {
    cwd: process.cwd(),
    stdio: "inherit",
    detached: true,
    env: { ...process.env, GAME_PORT: String(GAME_PORT), PORT: String(GAME_PORT) },
  });
  gameProc.unref();

  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url || "/", true);

    // Proxy /api/* → game server
    if (parsedUrl.pathname?.startsWith("/api")) {
      createProxyMiddleware({
        target: GAME_HOST,
        changeOrigin: true,
        pathRewrite: { "^/api": "/api" },
      })(req as any, res as any, (err: any) => {
        if (err) console.error("Proxy error:", err);
      });
      return;
    }

    // Proxy /ws/* → game server (WebSocket)
    if (parsedUrl.pathname?.startsWith("/ws")) {
      createProxyMiddleware({
        target: GAME_HOST,
        changeOrigin: true,
        ws: true,
        pathRewrite: { "^/ws": "/ws" },
      })(req as any, res as any);
      return;
    }

    // Health check — proxy to game server directly
    if (parsedUrl.pathname === "/health") {
      createProxyMiddleware({
        target: GAME_HOST,
        changeOrigin: true,
        pathRewrite: { "^/health": "/health" },
      })(req as any, res as any, (err: any) => {
        if (err) { res.writeHead(502); res.end(JSON.stringify({ success: false })); }
      });
      return;
    }

    // Everything else → Next.js
    handle(req, res, parsedUrl);
  });

  // Handle WebSocket upgrades
  server.on("upgrade", (req, socket, head) => {
    const pathname = parse(req.url || "/").pathname;
    if (pathname?.startsWith("/ws")) {
      createProxyMiddleware({
        target: GAME_HOST,
        ws: true,
        pathRewrite: { "^/ws": "/ws" },
      })(req as any, socket as any, head as any);
    }
  });

  server.listen(PORT, () => {
    console.log(`> Ready on http://localhost:${PORT}`);
  });
});
