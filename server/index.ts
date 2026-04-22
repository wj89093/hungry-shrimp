// ============================================================
// HUNGRY SHRIMP — Standalone Game Server
// ============================================================

import express from "express";
import cors from "cors";
import { randomBytes } from "crypto";
import { GameEngineImpl } from "../lib/game-engine.js";
import {
  getDb,
  createUser, getUserByName, updateLastLogin,
  createBot, getBotById, getBotByApiKey, listBotsByUser, updateBotStats,
  createMatch, getMatch, updateMatchStatus, listRecentMatches,
  insertResult, getResultsByMatch, getBotHistory,
  getOrCreateLeaderboardEntry, updateLeaderboard, getTopLeaderboard,
  getTodayBest, getBestMatch, getTotalGamesCount,
} from "./db.ts";

const PORT = parseInt(process.env.GAME_PORT || process.env.PORT || "3003");
const TICK_MS = 500;
const MAX_PLAYERS = 5;

import { wsManager } from "./websocket.ts";

interface ActiveMatch {
  engine: GameEngineImpl;
  matchRecord: { matchId: string; roomName: string; maxPlayers: number };
  tickTimer: ReturnType<typeof setTimeout> | null;
  participants: Map<string, { nickname: string; queuedDirs: string[] }>;
}

const activeMatches = new Map<string, ActiveMatch>();

// ── Express App ────────────────────────────────────────────

const app = express();
app.use(cors({ origin: "*", methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"] }));
app.use(express.json());

// ── Helpers ─────────────────────────────────────────────────

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${randomBytes(3).toString("hex")}`;
}

function hashPassword(password: string): string {
  return randomBytes(16).toString("hex"); // Simplified — use proper hashing in production
}

function sendJson(res: express.Response, status: number, data: any) {
  res.status(status).json(data);
}

function sendError(res: express.Response, status: number, message: string, code = "ERROR") {
  sendJson(res, status, { success: false, error: message, code });
}

function requireAuth(req: express.Request): any {
  const key = req.query.apiKey as string
    || req.headers["x-api-key"] as string
    || (req.headers["authorization"] || "").replace(/^Bearer\s+/i, "");
  if (!key) return null;
  const bot = getBotByApiKey(key);
  if (!bot) return null;
  updateLastLogin(bot.user_id);
  return bot;
}

// ── Match Loop ──────────────────────────────────────────────

function startMatchLoop(matchId: string) {
  const entry = activeMatches.get(matchId);
  if (!entry) return;

  const { engine } = entry;
  const state = engine.getState();

  // Countdown phase
  if (state.status === "waiting") {
    engine.getState().countdown--;
    if (engine.getState().countdown <= 0) {
      engine.getState().status = "playing";
      updateMatchStatus(matchId, "playing", { started_at: Math.floor(Date.now() / 1000) });
    }
    entry.tickTimer = setTimeout(() => startMatchLoop(matchId), TICK_MS);
    return;
  }

  // Playing phase — advance one tick
  if (state.status === "playing") {
    engine.tick();
    engine.getState().currentTick++;

    // Broadcast state via WebSocket
    wsManager.broadcastMatch(matchId, {
      status: engine.getState().status,
      currentTick: engine.getState().currentTick,
      snakes: engine.getState().snakes.map((s) => ({
        agentId: s.agentId,
        nickname: s.nickname,
        isAlive: s.isAlive,
        score: s.score,
        body: s.body.slice(0, 5), // Only send head positions to save bandwidth
        direction: s.direction,
        hasShield: s.hasShield,
      })),
      items: engine.getState().items,
    });

    // Check end conditions
    const alive = engine.getState().snakes.filter((s) => s.isAlive);
    if (alive.length <= 1 || engine.getState().currentTick >= 240) {
      finalizeMatch(matchId, alive);
      return;
    }
    entry.tickTimer = setTimeout(() => startMatchLoop(matchId), TICK_MS);
    return;
  }
}

function finalizeMatch(matchId: string, alive: any[]) {
  const entry = activeMatches.get(matchId);
  if (!entry) return;
  const { engine } = entry;
  const state = engine.getState();

  state.status = "finished";
  updateMatchStatus(matchId, "finished", {
    finished_at: Math.floor(Date.now() / 1000),
    tick_count: state.currentTick,
  });

  // Survival bonus
  for (const snake of alive) {
    const s = engine.getState().scores.get(snake.agentId) || 0;
    engine.getState().scores.set(snake.agentId, s + 3);
    snake.score = s + 3;
  }

  // 1st place bonus (except 2-player)
  if (alive.length > 1 && state.snakes.length > 2) {
    const sorted = [...state.snakes].sort((a, b) => b.score - a.score);
    const winner = sorted[0];
    const s = engine.getState().scores.get(winner.agentId) || 0;
    engine.getState().scores.set(winner.agentId, s + 3);
    winner.score = s + 3;
  }

  // Persist results to DB (only for registered bots)
  const rankings = [...state.snakes].sort((a, b) => b.score - a.score);
  rankings.forEach((snake, i) => {
    const bot = getBotById(snake.agentId);
    if (!bot) return; // Skip anonymous players

    insertResult(matchId, snake.agentId, i + 1, snake.score, snake.isAlive, {
      food: 0, coin: 0, shield: 0, speed: 0,
      survival: snake.isAlive ? 3 : 0,
      first_bonus: i === 0 && state.snakes.length > 2 ? 3 : 0,
      death_penalty: snake.isAlive ? 0 : -10,
    });

    const isWinner = i === 0;
    const eloDelta = isWinner ? 25 : -10;
    updateLeaderboard(snake.agentId, eloDelta, snake.score);
    updateBotStats(snake.agentId, {
      total_games: 1,
      total_wins: isWinner ? 1 : 0,
      total_score: snake.score,
    });
  });

  if (alive.length === 1) {
    const winnerBot = getBotById(alive[0].agentId);
    if (winnerBot) updateMatchStatus(matchId, "finished", { winner_id: alive[0].agentId });
  }

  // Clean up after a delay
  setTimeout(() => {
    const e = activeMatches.get(matchId);
    if (e?.tickTimer) clearTimeout(e.tickTimer);
    activeMatches.delete(matchId);
  }, 300000); // 5 minutes
}

// ── Get or create match for a room ─────────────────────────

function getOrCreateMatch(roomName: string, maxPlayers = MAX_PLAYERS) {
  // Look for an existing waiting/countdown match for this room
  for (const [, entry] of activeMatches) {
    if (entry.matchRecord.roomName === roomName && entry.engine.getState().status !== "finished") {
      return { matchId: entry.engine.getState().matchId, entry };
    }
  }
  // Create new
  const matchId = makeId("match");
  createMatch(matchId, roomName, maxPlayers);
  const engine = new GameEngineImpl(matchId);
  engine.getState().status = "waiting";
  engine.getState().countdown = 20;

  const entry: ActiveMatch = { 
    engine, 
    matchRecord: { matchId, roomName, maxPlayers }, 
    tickTimer: null, 
    participants: new Map() 
  };
  activeMatches.set(matchId, entry);
  startMatchLoop(matchId);
  return { matchId, entry };
}

// ── API Routes ──────────────────────────────────────────────

// ── AUTH ───────────────────────────────────────────────────

// POST /api/auth/register
app.post("/api/auth/register", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return sendError(res, 400, "Missing username or password");
  const userId = makeId("user");
  try {
    createUser(userId, username, hashPassword(password));
    sendJson(res, 200, { success: true, data: { userId, username } });
  } catch (e) {
    sendError(res, 409, "Username already taken");
  }
});

// POST /api/auth/login
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  const user = getUserByName(username);
  if (!user || user.password_hash !== hashPassword(password)) {
    return sendError(res, 401, "Invalid credentials");
  }
  updateLastLogin(user.user_id);
  sendJson(res, 200, { success: true, data: { userId: user.user_id, username } });
});

// ── BOTS ───────────────────────────────────────────────────

// GET /api/bots (list user's bots)
app.get("/api/bots", (req, res) => {
  const userId = req.query.userId as string || req.body.userId;
  if (!userId) return sendError(res, 400, "Missing userId");
  const bots = listBotsByUser(userId);
  sendJson(res, 200, { success: true, data: { bots } });
});

// POST /api/bots (create bot)
app.post("/api/bots", (req, res) => {
  const { username, password, nickname, description } = req.body;
  if (!username || !nickname) return sendError(res, 400, "Missing username or nickname");
  const user = getUserByName(username);
  if (!user || user.password_hash !== hashPassword(password || "")) {
    return sendError(res, 401, "Invalid credentials");
  }
  const botId = makeId("bot");
  const apiKey = randomBytes(16).toString("hex");
  const created = createBot(botId, user.user_id, nickname, description || "", apiKey);
  sendJson(res, 200, { success: true, data: { bot: { botId: created.bot_id, nickname: created.nickname, apiKey: created.api_key } } });
});

// GET /api/bots/:botId
app.get("/api/bots/:botId", (req, res) => {
  const bot = getBotById(req.params.botId);
  if (!bot) return sendError(res, 404, "Bot not found");
  sendJson(res, 200, {
    success: true,
    data: { bot: { botId: bot.bot_id, nickname: bot.nickname, description: bot.description, totalGames: bot.total_games, totalWins: bot.total_wins, totalScore: bot.total_score } }
  });
});

// GET /api/bots/:botId/history
app.get("/api/bots/:botId/history", (req, res) => {
  const bot = getBotById(req.params.botId);
  if (!bot) return sendError(res, 404, "Bot not found");
  const history = getBotHistory(req.params.botId);
  sendJson(res, 200, { success: true, data: { history } });
});

// ── ROOMS & MATCHES ────────────────────────────────────────

// GET /api/rooms
app.get("/api/rooms", (req, res) => {
  const rooms = [];
  for (const [, entry] of activeMatches) {
    const state = entry.engine.getState();
    rooms.push({
      matchId: entry.engine.getState().matchId,
      roomName: entry.matchRecord.roomName,
      status: state.status,
      currentPlayers: state.snakes.length,
      aliveCount: state.snakes.filter((s) => s.isAlive).length,
      currentTick: state.currentTick,
      maxPlayers: entry.matchRecord.maxPlayers,
      playerNames: state.snakes.map((s) => s.nickname),
      countdown: state.countdown,
    });
  }
  // Also include recent finished matches from DB
  const recent = listRecentMatches(20).filter((m) => m.status === "finished");
  for (const m of recent) {
    if (!rooms.find((r) => r.matchId === m.match_id)) {
      const results = getResultsByMatch(m.match_id);
      rooms.push({
        matchId: m.match_id,
        roomName: m.room_name || "Private",
        status: "finished",
        currentPlayers: results.length,
        aliveCount: results.filter((r) => r.is_alive).length,
        currentTick: m.tick_count,
        maxPlayers: m.max_players,
        playerNames: results.map((r) => r.nickname),
        finishedAt: m.finished_at,
      });
    }
  }
  sendJson(res, 200, { success: true, data: { rooms, total: rooms.length } });
});

// POST /api/rooms — CREATE ROOM
app.post("/api/rooms", (req, res) => {
  const { name: roomName, maxPlayers = MAX_PLAYERS } = req.body;
  if (!roomName) return sendError(res, 400, "Missing room name");
  
  const matchId = makeId("match");
  createMatch(matchId, roomName, maxPlayers);
  const engine = new GameEngineImpl(matchId);
  engine.getState().status = "waiting";
  engine.getState().countdown = 20;

  const entry: ActiveMatch = { 
    engine, 
    matchRecord: { matchId, roomName, maxPlayers }, 
    tickTimer: null, 
    participants: new Map() 
  };
  activeMatches.set(matchId, entry);
  startMatchLoop(matchId);
  
  sendJson(res, 200, {
    success: true,
    data: { roomId: matchId, matchId, name: roomName, status: "waiting" }
  });
});

// GET /api/lobby — ALIAS for /api/rooms (compatibility)
app.get("/api/lobby", (req, res) => {
  const status = req.query.status as string;
  let rooms = [];
  for (const [, entry] of activeMatches) {
    const state = entry.engine.getState();
    if (status && status !== "all" && state.status !== status) continue;
    rooms.push({
      roomId: entry.engine.getState().matchId,
      name: entry.matchRecord.roomName,
      status: state.status,
      mapWidth: 50,
      mapHeight: 50,
      maxAgents: entry.matchRecord.maxPlayers,
      occupiedAgents: state.snakes.length,
      participantsPreview: state.snakes.map((s) => ({ agentId: s.agentId, nickname: s.nickname })),
      participantSource: "live_room",
      primaryHref: `/rooms/${entry.engine.getState().matchId}`,
      primaryActionLabel: "加入房间",
      badgeLabel: state.status === "playing" ? "进行中" : "等待中",
      metricValue: `${state.snakes.length}/${entry.matchRecord.maxPlayers}`,
    });
  }
  sendJson(res, 200, {
    success: true,
    data: {
      cards: rooms,
      announcement: "官方必开4人/5人房间上线，满人比赛即开。欢迎各位 Agent 玩家体验游戏、挑战高分！",
    }
  });
});

// POST /api/rooms/join
app.post("/api/rooms/join", (req, res) => {
  const { agentId, nickname, name: roomName, apiKey } = req.body;
  if (!agentId || !nickname || !roomName) return sendError(res, 400, "Missing agentId, nickname, or name");
  if (apiKey) {
    const bot = getBotByApiKey(apiKey);
    if (!bot) return sendError(res, 403, "Invalid API key");
  }
  const { matchId, entry } = getOrCreateMatch(roomName);
  
  // Check if room is full
  if (entry.engine.getState().snakes.length >= entry.matchRecord.maxPlayers) {
    return sendError(res, 409, "Room is full");
  }
  
  entry.engine.addSnake(agentId, nickname);
  entry.participants.set(agentId, { nickname, queuedDirs: [] });
  
  sendJson(res, 200, {
    success: true,
    data: { matchId, status: entry.engine.getState().status }
  });
});

// GET /api/matches/:matchId
app.get("/api/matches/:matchId", (req, res) => {
  const matchId = req.params.matchId;
  const entry = activeMatches.get(matchId);
  const dbMatch = getMatch(matchId);
  if (!entry && !dbMatch) return sendError(res, 404, "Match not found");

  if (entry) {
    const state = entry.engine.getState();
    const agentId = req.query.agentId as string;
    const mySnake = agentId ? state.snakes.find((s) => s.agentId === agentId) : null;
    sendJson(res, 200, {
      success: true,
      data: {
        match: { matchId, status: state.status, currentTick: state.currentTick, winner: state.winner, countdown: state.countdown },
        frame: entry.engine.getFrame(),
        myStatus: mySnake ? { agentId: mySnake.agentId, nickname: mySnake.nickname, queueDepth: 0, isAlive: mySnake.isAlive, score: mySnake.score } : null,
      }
    });
  } else {
    const results = getResultsByMatch(matchId);
    sendJson(res, 200, {
      success: true,
      data: {
        match: { matchId, status: "finished", currentTick: dbMatch.tick_count, winner: dbMatch.winner_id },
        frame: { snakes: [], items: [], scoreboard: [] },
        results,
      }
    });
  }
});

// POST /api/matches/:matchId/path
app.post("/api/matches/:matchId/path", (req, res) => {
  const matchId = req.params.matchId;
  const entry = activeMatches.get(matchId);
  if (!entry) return sendError(res, 404, "Match not found");
  const { agentId, directions } = req.body;
  if (!agentId || !directions) return sendError(res, 400, "Missing agentId or directions");
  const validDirs = ["up", "down", "left", "right"];
  const filtered = directions.filter((d: string) => validDirs.includes(d)).slice(0, 10);
  entry.engine.submitPath(agentId, filtered);
  sendJson(res, 200, { success: true, accepted: true, acceptedCount: filtered.length, queueDepth: filtered.length, warnings: [], suggestedPath: null });
});

// GET /api/matches/:matchId/result
app.get("/api/matches/:matchId/result", (req, res) => {
  const matchId = req.params.matchId;
  const entry = activeMatches.get(matchId);
  if (entry) {
    const state = entry.engine.getState();
    const rankings = [...state.snakes].sort((a, b) => b.score - a.score).map((s, i) => ({
      rank: i + 1, agentId: s.agentId, nickname: s.nickname, score: s.score, isAlive: s.isAlive,
    }));
    sendJson(res, 200, { success: true, data: { rankings, matchId } });
  } else {
    const results = getResultsByMatch(matchId);
    sendJson(res, 200, {
      success: true,
      data: {
        rankings: results.map((r) => ({ rank: r.rank, agentId: r.bot_id, nickname: r.nickname, score: r.score, isAlive: !!r.is_alive })),
        matchId,
      }
    });
  }
});

// GET /api/leaderboard
app.get("/api/leaderboard", (req, res) => {
  const top = getTopLeaderboard(20);
  const today = getTodayBest(10);
  const best = getBestMatch(10);
  const totalGames = getTotalGamesCount();
  sendJson(res, 200, {
    success: true,
    data: {
      leaderboard: top.map((e) => ({
        rank: 0,
        botId: e.bot_id,
        nickname: e.nickname,
        elo: Math.round(e.elo_rating),
        games: e.games,
        wins: e.wins,
        winRate: e.games > 0 ? Math.round((e.wins / e.games) * 100) : 0,
        avgScore: Math.round(e.avg_score),
        maxScore: e.max_score,
      })),
      todayBest: today.map((e, i) => ({
        rank: i + 1,
        botId: e.bot_id,
        nickname: e.nickname,
        todayScore: Math.round(e.today_score || e.score || 0),
        games: e.games_today || 1,
      })),
      bestMatch: best.map((e, i) => ({
        rank: i + 1,
        botId: e.bot_id,
        nickname: e.nickname,
        maxScore: e.score,
      })),
      totalGames,
    }
  });
});

// GET /health
app.get("/health", (req, res) => {
  sendJson(res, 200, { success: true, status: "ok", activeMatches: activeMatches.size, uptime: process.uptime(), ws: wsManager.getStats() });
});

// GET /api/me
app.get("/api/me", (req, res) => {
  const bot = requireAuth(req);
  if (!bot) return sendError(res, 401, "Unauthorized");
  sendJson(res, 200, {
    success: true,
    data: {
      agent: {
        id: bot.bot_id,
        nickname: bot.nickname,
      },
      currentRoom: null,
      currentMatch: null,
    }
  });
});

// 404 handler
app.use((req, res) => {
  sendError(res, 404, `Unknown: ${req.method} ${req.path}`);
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
  sendError(res, 500, err.message);
});

// ── Start ────────────────────────────────────────────────────

getDb(); // init
app.listen(PORT, () => {
  console.log(`🦐 Hungry Shrimp Server v1.0 — port ${PORT}`);
  console.log(`   API: http://localhost:${PORT}/api/*`);
  console.log(`   Health: http://localhost:${PORT}/health`);
});

process.on("SIGINT", () => {
  console.log("\nShutting down...");
  for (const [, e] of activeMatches) {
    if (e.tickTimer) clearTimeout(e.tickTimer);
  }
  process.exit(0);
});
