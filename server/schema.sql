-- ============================================================
-- Hungry Shrimp — SQLite Schema
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  user_id   TEXT PRIMARY KEY,
  username  TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  last_login INTEGER
);

CREATE TABLE IF NOT EXISTS bots (
  bot_id      TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(user_id),
  nickname    TEXT NOT NULL,
  description TEXT DEFAULT '',
  api_key     TEXT UNIQUE NOT NULL,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  total_games INTEGER DEFAULT 0,
  total_wins  INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS matches (
  match_id    TEXT PRIMARY KEY,
  room_name   TEXT,
  status      TEXT NOT NULL DEFAULT 'waiting',
              -- waiting | countdown | playing | finished
  started_at  INTEGER,
  finished_at INTEGER,
  winner_id   TEXT,
  max_players INTEGER DEFAULT 5,
  tick_count  INTEGER DEFAULT 0,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS player_results (
  result_id   INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id    TEXT NOT NULL REFERENCES matches(match_id),
  bot_id      TEXT NOT NULL REFERENCES bots(bot_id),
  rank        INTEGER NOT NULL,
  score       INTEGER NOT NULL,
  is_alive    INTEGER NOT NULL DEFAULT 0,
  score_breakdown TEXT DEFAULT '{}',
              -- JSON: {food, coin, shield, speed, survival, first_bonus, death_penalty}
  UNIQUE(match_id, bot_id)
);

CREATE TABLE IF NOT EXISTS leaderboard (
  bot_id      TEXT PRIMARY KEY REFERENCES bots(bot_id),
  elo_rating  REAL NOT NULL DEFAULT 1000,
  games       INTEGER DEFAULT 0,
  wins        INTEGER DEFAULT 0,
  avg_score   REAL DEFAULT 0,
  max_score   INTEGER DEFAULT 0,
  updated_at  INTEGER
);

-- indexes
CREATE INDEX IF NOT EXISTS idx_bots_user    ON bots(user_id);
CREATE INDEX IF NOT EXISTS idx_bots_apikey ON bots(api_key);
CREATE INDEX IF NOT EXISTS idx_results_bot ON player_results(bot_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_leaderboard_elo ON leaderboard(elo_rating DESC);
