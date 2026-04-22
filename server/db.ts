// ============================================================
// Database layer — better-sqlite3 wrapper (TypeScript)
// ============================================================

import { createRequire } from "module";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, "hungryshrimp.db");

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");

let _db: any = null;

export function getDb() {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  initSchema();
  return _db;
}

function initSchema() {
  const sql = readFileSync(join(__dirname, "schema.sql"), "utf8");
  _db.exec(sql);
}

// ── Users ───────────────────────────────────────────────────

export function createUser(userId: string, username: string, passwordHash: string) {
  const db = getDb();
  db.prepare(
    "INSERT OR IGNORE INTO users (user_id, username, password_hash) VALUES (?, ?, ?)"
  ).run(userId, username, passwordHash);
}

export function getUserByName(username: string) {
  return getDb().prepare("SELECT * FROM users WHERE username = ?").get(username);
}

export function updateLastLogin(userId: string) {
  getDb().prepare("UPDATE users SET last_login = unixepoch() WHERE user_id = ?").run(userId);
}

// ── Bots ─────────────────────────────────────────────────────

export function createBot(botId: string, userId: string, nickname: string, description: string, apiKey: string) {
  const db = getDb();
  db.prepare(
    "INSERT INTO bots (bot_id, user_id, nickname, description, api_key) VALUES (?, ?, ?, ?, ?)"
  ).run(botId, userId, nickname, description, apiKey);
  return getBotById(botId);
}

export function getBotById(botId: string) {
  return getDb().prepare("SELECT * FROM bots WHERE bot_id = ?").get(botId);
}

export function getBotByApiKey(apiKey: string) {
  return getDb().prepare("SELECT * FROM bots WHERE api_key = ?").get(apiKey);
}

export function listBotsByUser(userId: string) {
  return getDb().prepare("SELECT * FROM bots WHERE user_id = ? ORDER BY created_at DESC").all(userId);
}

export function updateBotStats(botId: string, increment: { total_games: number; total_wins: number; total_score: number }) {
  const db = getDb();
  const { total_games, total_wins, total_score } = increment;
  db.prepare(
    "UPDATE bots SET total_games = total_games + ?, total_wins = total_wins + ?, total_score = total_score + ? WHERE bot_id = ?"
  ).run(total_games, total_wins, total_score, botId);
}

// ── Matches ──────────────────────────────────────────────────

export function createMatch(matchId: string, roomName: string, maxPlayers = 5) {
  const db = getDb();
  db.prepare(
    "INSERT INTO matches (match_id, room_name, max_players, status) VALUES (?, ?, ?, 'waiting')"
  ).run(matchId, roomName, maxPlayers);
  return getMatch(matchId);
}

export function getMatch(matchId: string) {
  return getDb().prepare("SELECT * FROM matches WHERE match_id = ?").get(matchId);
}

export function updateMatchStatus(matchId: string, status: string, extra: Record<string, any> = {}) {
  const db = getDb();
  const sets: string[] = ["status = ?"];
  const vals: any[] = [status];
  if (extra.started_at)  { sets.push("started_at = ?");  vals.push(extra.started_at); }
  if (extra.finished_at)  { sets.push("finished_at = ?");  vals.push(extra.finished_at); }
  if (extra.winner_id)   { sets.push("winner_id = ?");    vals.push(extra.winner_id);   }
  if (extra.tick_count !== undefined) { sets.push("tick_count = ?"); vals.push(extra.tick_count); }
  vals.push(matchId);
  db.prepare(`UPDATE matches SET ${sets.join(", ")} WHERE match_id = ?`).run(...vals);
}

export function listRecentMatches(limit = 20) {
  return getDb().prepare(
    "SELECT * FROM matches ORDER BY created_at DESC LIMIT ?"
  ).all(limit);
}

// ── Player Results ───────────────────────────────────────────

export function insertResult(matchId: string, botId: string, rank: number, score: number, isAlive: boolean, breakdown: Record<string, number>) {
  getDb().prepare(
    "INSERT OR REPLACE INTO player_results (match_id, bot_id, rank, score, is_alive, score_breakdown) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(matchId, botId, rank, score, isAlive ? 1 : 0, JSON.stringify(breakdown));
}

export function getResultsByMatch(matchId: string) {
  return getDb().prepare(
    "SELECT pr.*, b.nickname FROM player_results pr JOIN bots b ON pr.bot_id = b.bot_id WHERE pr.match_id = ? ORDER BY pr.rank"
  ).all(matchId);
}

export function getBotHistory(botId: string, limit = 20) {
  return getDb().prepare(
    `SELECT pr.*, m.room_name, m.finished_at
     FROM player_results pr
     JOIN matches m ON pr.match_id = m.match_id
     WHERE pr.bot_id = ?
     ORDER BY m.finished_at DESC LIMIT ?`
  ).all(botId, limit);
}

// ── Leaderboard ──────────────────────────────────────────────

export function getOrCreateLeaderboardEntry(botId: string) {
  const db = getDb();
  db.prepare("INSERT OR IGNORE INTO leaderboard (bot_id, elo_rating, games, wins, avg_score, max_score) VALUES (?, 1000, 0, 0, 0, 0)").run(botId);
  return db.prepare("SELECT * FROM leaderboard WHERE bot_id = ?").get(botId);
}

export function updateLeaderboard(botId: string, eloDelta: number, score: number) {
  const db = getDb();
  const entry = getOrCreateLeaderboardEntry(botId);
  const newGames = entry.games + 1;
  const newWins = eloDelta > 0 ? entry.wins + 1 : entry.wins;
  const newAvg = (entry.avg_score * entry.games + score) / newGames;
  const newMax = Math.max(entry.max_score, score);
  db.prepare(
    "UPDATE leaderboard SET elo_rating = elo_rating + ?, games = ?, wins = ?, avg_score = ?, max_score = ?, updated_at = unixepoch() WHERE bot_id = ?"
  ).run(eloDelta, newGames, newWins, newAvg, newMax, botId);
}

export function getTopLeaderboard(limit = 20) {
  return getDb().prepare(
    "SELECT lb.*, b.nickname FROM leaderboard lb JOIN bots b ON lb.bot_id = b.bot_id ORDER BY lb.elo_rating DESC LIMIT ?"
  ).all(limit);
}

export function getTodayBest(limit = 10) {
  const startOfDay = Math.floor(Date.now() / 86400000) * 86400000;
  return getDb().prepare(`
    SELECT pr.bot_id, b.nickname, pr.score, pr.is_alive, pr.rank,
           COUNT(*) as games_today, SUM(pr.score) as today_score
    FROM player_results pr
    JOIN matches m ON pr.match_id = m.match_id
    JOIN bots b ON pr.bot_id = b.bot_id
    WHERE m.finished_at >= ?
    GROUP BY pr.bot_id
    ORDER BY today_score DESC
    LIMIT ?
  `).all(startOfDay, limit);
}

export function getBestMatch(limit = 10) {
  return getDb().prepare(`
    SELECT pr.bot_id, b.nickname, pr.score, pr.rank, m.finished_at
    FROM player_results pr
    JOIN matches m ON pr.match_id = m.match_id
    JOIN bots b ON pr.bot_id = b.bot_id
    WHERE m.status = 'finished'
    ORDER BY pr.score DESC
    LIMIT ?
  `).all(limit);
}

export function getTotalGamesCount() {
  const row = getDb().prepare("SELECT COUNT(*) as cnt FROM matches WHERE status = 'finished'").get() as any;
  return row?.cnt ?? 0;
}

