// ============================================================
// HUNGRY SHRIMP — Combined Express Server
// Serves Next.js static files + Game API + WebSocket
// ============================================================

import express from "express";
import cors from "cors";
import { createServer } from "http";
import { randomBytes } from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer } from "ws";

// Import game engine and DB
import { GameEngineImpl } from "./lib/game-engine.js";
import {
  getDb,
  createUser, getUserByName, updateLastLogin,
  createBot, getBotById, getBotByApiKey, listBotsByUser, updateBotStats,
  createMatch, getMatch, updateMatchStatus, listRecentMatches,
  insertResult, getResultsByMatch, getBotHistory,
  getOrCreateLeaderboardEntry, updateLeaderboard, getTopLeaderboard,
} from "./server/db.js";
import { wsManager } from "./server/websocket.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === "production";
const PORT = parseInt(process.env.PORT || process.env.GAME_PORT || "3000");
const TICK_MS = 500;
const MAX_PLAYERS = 5;

// ── Express App ─────────────────────────────────────────────

const app = express();
const httpServer = createServer(app);

app.use(express.json());

// CORS — allow all origins for game clients
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "X-API-Key", "Origin"],
}));

// ── WebSocket Server ─────────────────────────────────────────

const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
const clients = new Map<WebSocket, { matchId?: string; role: "player" | "spectator"; agentId?: string }>();

wss.on("connection", (ws) => {
  clients.set(ws, { role: "spectator" });
  ws.send(JSON.stringify({ type: "connected" }));

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());
      const client = clients.get(ws);
      if (!client) return;

      if (msg.type === "subscribe" && msg.matchId) {
        client.matchId = msg.matchId;
        client.role = msg.role || "spectator";
        client.agentId = msg.agentId;
        ws.send(JSON.stringify({ type: "subscribed", matchId: msg.matchId }));
      }
    } catch {}
  });

  ws.on("close", () => clients.delete(ws));
});

export { wsManager };

// ── Game State ───────────────────────────────────────────────

interface ActiveMatch {
  engine: GameEngineImpl;
  matchRecord: { matchId: string; roomName: string; maxPlayers: number };
  tickTimer: ReturnType<typeof setTimeout> | null;
  participants: Map<string, { nickname: string; queuedDirs: string[] }>;
}

const activeMatches = new Map<string, ActiveMatch>();
const agentToMatch = new Map<string, string>();

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${randomBytes(3).toString("hex")}`;
}

function getWsClients(matchId: string) {
  const result: { ws: WebSocket; role: string; agentId?: string }[] = [];
  for (const [ws, info] of clients) {
    if (info.matchId === matchId) {
      result.push({ ws, role: info.role, agentId: info.agentId });
    }
  }
  return result;
}

// ── Helper Functions ─────────────────────────────────────────

function sendJson(res: express.Response, status: number, data: any) {
  res.status(status).json(data);
}

function sendError(res: express.Response, status: number, message: string, code = "ERROR") {
  sendJson(res, status, { success: false, error: message, code });
}

function requireAuth(req: express.Request): any {
  const key = req.query.apiKey as string || req.headers["x-api-key"] as string;
  if (!key) return null;
  return getBotByApiKey(key);
}

function startMatch(matchId: string) {
  const m = activeMatches.get(matchId);
  if (!m) return;
  updateMatchStatus(matchId, "playing");
  console.log(`[Match ${matchId}] Started with ${m.participants.size} players`);

  function tick() {
    const engine = m.engine;

    // Submit queued directions for each agent
    for (const [agentId, info] of m.participants) {
      const queued = info.queuedDirs;
      if (queued.length > 0) {
        engine.submitPath(agentId, queued[0]);
        info.queuedDirs = queued.slice(1);
      }
    }

    // Step game
    const frame = engine.step();

    // Broadcast via WebSocket
    for (const { ws, role } of getWsClients(matchId)) {
      if (ws.readyState !== ws.OPEN) continue;
      if (role === "player" && frame.snakes) {
        const mySnake = frame.snakes.find((s: any) => s.agentId === ws._socket?.agentId);
        ws.send(JSON.stringify({ type: "matchUpdate", matchId, data: frame, mySnake }));
      } else {
        ws.send(JSON.stringify({ type: "matchUpdate", matchId, data: frame }));
      }
    }

    // Check end conditions
    const alive = (frame.snakes || []).filter((s: any) => s.isAlive).length;
    if (alive <= 1 || frame.status === "finished") {
      finishMatch(matchId);
      return;
    }

    m.tickTimer = setTimeout(tick, TICK_MS);
  }

  m.tickTimer = setTimeout(tick, TICK_MS);
}

function finishMatch(matchId: string) {
  const m = activeMatches.get(matchId);
  if (!m) return;
  if (m.tickTimer) clearTimeout(m.tickTimer);

  const engine = m.engine;
  const frame = engine.frame;
  const snakes: any[] = frame.snakes || [];

  // Sort by score descending
  const sorted = [...snakes].sort((a, b) => b.score - a.score);
  const rankings = sorted.map((s, i) => ({
    rank: i + 1,
    agentId: s.agentId,
    nickname: s.nickname,
    score: s.score,
  }));

  // Persist to DB
  try {
    insertResult(matchId, rankings);
    for (const s of snakes) {
      updateBotStats(s.agentId, s.score, s.score > 0);
      const entry = getOrCreateLeaderboardEntry(s.agentId);
      updateLeaderboard(entry.bot_id, s.score);
    }
  } catch (e) {
    console.error("[DB] Failed to save result:", e);
  }

  updateMatchStatus(matchId, "finished");

  // Broadcast final state
  for (const { ws } of getWsClients(matchId)) {
    if (ws.readyState !== ws.OPEN) continue;
    ws.send(JSON.stringify({ type: "matchEvent", matchId, event: "finished", rankings }));
  }

  // Cleanup
  for (const [agentId, info] of m.participants) {
    agentToMatch.delete(agentId);
  }
  activeMatches.delete(matchId);

  console.log(`[Match ${matchId}] Finished. Winner: ${rankings[0]?.nickname}`);
}

// ── API Routes ───────────────────────────────────────────────

// Health
app.get("/health", (req, res) => {
  sendJson(res, 200, {
    success: true,
    status: "ok",
    activeMatches: activeMatches.size,
    uptime: process.uptime(),
    ws: { totalClients: clients.size, spectators: [...clients.values()].filter(c => c.role === "spectator").length, players: [...clients.values()].filter(c => c.role === "player").length },
  });
});

// Create room
app.post("/api/rooms", (req, res) => {
  const { name, maxPlayers } = req.body;
  if (!name) return sendError(res, 400, "name required");
  const matchId = makeId("match");
  const roomName = name || `Room ${matchId.slice(-6)}`;

  const engine = new GameEngineImpl(50, 50);
  activeMatches.set(matchId, {
    engine,
    matchRecord: { matchId, roomName, maxPlayers: Math.min(maxPlayers || MAX_PLAYERS, 10) },
    tickTimer: null,
    participants: new Map(),
  });

  sendJson(res, 200, { success: true, data: { matchId, roomName } });
});

// Join room (by name or ID)
app.post("/api/rooms/join", (req, res) => {
  const { name, agentId, nickname } = req.body;
  if (!agentId) return sendError(res, 400, "agentId required");
  if (!nickname) return sendError(res, 400, "nickname required");

  // Find matching match by name or ID
  let targetMatch: ActiveMatch | undefined;
  let actualMatchId: string | undefined;

  for (const [mid, m] of activeMatches) {
    if (m.matchRecord.roomName === name || mid === name) {
      targetMatch = m;
      actualMatchId = mid;
      break;
    }
  }

  // If waiting room exists, join it
  if (targetMatch && targetMatch.matchRecord.status !== "finished") {
    const mid = actualMatchId!;
    const engine = targetMatch.engine;
    const spawn = engine.addSnake(agentId, nickname);
    if (!spawn) return sendError(res, 400, "Room full");

    targetMatch.participants.set(agentId, { nickname, queuedDirs: [] });
    agentToMatch.set(agentId, mid);

    // Start if max players reached
    if (targetMatch.participants.size >= targetMatch.matchRecord.maxPlayers) {
      startMatch(mid);
    } else {
      // Countdown to start
      let countdown = 10;
      const countdownTimer = setInterval(() => {
        const m = activeMatches.get(mid);
        if (!m || m.matchRecord.status === "playing") { clearInterval(countdownTimer); return; }
        if (m.participants.size >= 2) { clearInterval(countdownTimer); startMatch(mid); return; }
        countdown--;
        if (countdown <= 0) { clearInterval(countdownTimer); startMatch(mid); }
      }, 1000);
    }

    return sendJson(res, 200, { success: true, data: { matchId: mid, status: "waiting" } });
  }

  return sendError(res, 404, "Room not found", "NOT_FOUND");
});

// List rooms
app.get("/api/rooms", (req, res) => {
  const rooms = [...activeMatches.entries()].map(([matchId, m]) => ({
    matchId,
    roomName: m.matchRecord.roomName,
    status: m.matchRecord.status,
    currentPlayers: m.participants.size,
    maxPlayers: m.matchRecord.maxPlayers,
  }));
  sendJson(res, 200, { success: true, data: { rooms } });
});

// Get match state
app.get("/api/matches/:matchId", (req, res) => {
  const { matchId } = req.params;
  const agentId = req.query.agentId as string;

  const m = activeMatches.get(matchId);
  if (!m) {
    // Check DB
    const dbMatch = getMatch(matchId);
    if (!dbMatch) return sendError(res, 404, "Match not found", "NOT_FOUND");
    const results = getResultsByMatch(matchId);
    return sendJson(res, 200, { success: true, data: { match: dbMatch, frame: {}, rankings: results } });
  }

  const frame = m.engine.frame;
  const snakes = (frame.snakes || []).map((s: any) => ({
    agentId: s.agentId,
    nickname: s.nickname,
    body: s.body.map((p: any) => ({ x: p.x, y: p.y })),
    direction: s.direction,
    isAlive: s.isAlive,
    score: s.score,
    hasShield: s.hasShield,
    speedBoostTicks: s.speedBoostTicks,
  }));

  sendJson(res, 200, {
    success: true,
    data: {
      match: { matchId, status: m.matchRecord.status, currentTick: m.engine.tick, countdown: 0 },
      frame: { snakes, items: frame.items || [] },
    },
  });
});

// Submit path
app.post("/api/matches/:matchId/path", (req, res) => {
  const { matchId } = req.params;
  const { agentId, directions } = req.body;
  if (!agentId) return sendError(res, 400, "agentId required");

  const m = activeMatches.get(matchId);
  if (!m) return sendError(res, 404, "Match not found", "NOT_FOUND");
  if (!m.participants.has(agentId)) return sendError(res, 403, "Not in this match", "FORBIDDEN");

  const valid = ["up", "down", "left", "right"];
  const filtered = (directions || []).filter((d: string) => valid.includes(d)).slice(0, 10);

  const p = m.participants.get(agentId)!;
  p.queuedDirs = [...p.queuedDirs, ...filtered];

  sendJson(res, 200, { success: true, data: { queued: p.queuedDirs.length } });
});

// Get match result
app.get("/api/matches/:matchId/result", (req, res) => {
  const { matchId } = req.params;
  const results = getResultsByMatch(matchId);
  sendJson(res, 200, { success: true, data: { matchId, rankings: results } });
});

// Lobby: list waiting + recent
app.get("/api/lobby", (req, res) => {
  const recent = listRecentMatches(10).map((m: any) => ({
    matchId: m.match_id,
    roomName: m.room_name,
    status: m.status,
    playerCount: 0,
    createdAt: m.created_at,
  }));
  const waiting = [...activeMatches.entries()]
    .filter(([, m]) => m.matchRecord.status === "waiting")
    .map(([id, m]) => ({
      matchId: id,
      roomName: m.matchRecord.roomName,
      status: "waiting",
      currentPlayers: m.participants.size,
      maxPlayers: m.matchRecord.maxPlayers,
    }));
  sendJson(res, 200, { success: true, data: { waiting, recent } });
});

// Leaderboard
app.get("/api/leaderboard", (req, res) => {
  const top = getTopLeaderboard(20);
  sendJson(res, 200, { success: true, data: { leaderboard: top } });
});

// Register bot
app.post("/api/bots", (req, res) => {
  const { nickname, password } = req.body;
  if (!nickname || !password) return sendError(res, 400, "nickname and password required");

  try {
    const user = createUser(nickname, password);
    const bot = createBot(user.id, nickname);
    sendJson(res, 200, { success: true, data: { agentId: bot.agent_id, nickname, apiKey: bot.api_key } });
  } catch (e: any) {
    sendError(res, 400, e.message);
  }
});

// ── Static Files (production) ───────────────────────────────

if (isProd) {
  const staticPath = path.join(__dirname, ".next", "standalone", ".next", "static");
  app.use("/_next/static", express.static(staticPath, { maxAge: "1y", immutable: true }));
  
  // Serve Next.js pages from standalone
  const nextApp = express();
  const { createRequestHandler } = await import("@vercel/node");
  
  console.log("[Prod] Static files configured");
}

// ── Start ────────────────────────────────────────────────────

getDb(); // init DB

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`🦐 Hungry Shrimp — http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   WebSocket: ws://localhost:${PORT}/ws`);
});

process.on("SIGINT", () => {
  console.log("\nShutting down...");
  for (const [, e] of activeMatches) {
    if (e.tickTimer) clearTimeout(e.tickTimer);
  }
  process.exit(0);
});
