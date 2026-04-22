// ============================================================
// Game Engine - Core game logic for local server
// ============================================================

import { Direction, Position, Item, ItemType, Snake, Frame, RoomStatus } from "./types";

const MAP_WIDTH = 50;
const MAP_HEIGHT = 50;
const TICK_MS = 500;
const MAX_TICKS = 240; // 2 minutes
const COUNTDOWN_TICKS = 20; // 10 seconds countdown

const ITEM_SPAWN_CHANCE = 0.15;
const INITIAL_SNAKE_LENGTH = 3;

export interface GameState {
  matchId: string;
  status: RoomStatus;
  currentTick: number;
  snakes: Snake[];
  items: Item[];
  countdown: number; // ticks until game starts
  winner: string | null;
  scores: Map<string, number>;
  startTime: number;
}

export interface GameEngine {
  getState(): GameState;
  getFrame(): Frame;
  tick(): GameState;
  addSnake(agentId: string, nickname: string, direction?: Direction): void;
  submitPath(agentId: string, directions: Direction[]): void;
  isFinished(): boolean;
  getWinner(): string | null;
}

// ---- Helpers ----

function posKey(p: Position): string {
  return `${p.x},${p.y}`;
}

function opposite(dir: Direction): Direction {
  return ({ up: "down", down: "up", left: "right", right: "left" } as const)[dir];
}

function move(pos: Position, dir: Direction): Position {
  switch (dir) {
    case "up":    return { x: pos.x, y: pos.y - 1 };
    case "down":  return { x: pos.x, y: pos.y + 1 };
    case "left":  return { x: pos.x - 1, y: pos.y };
    case "right": return { x: pos.x + 1, y: pos.y };
  }
}

function randomPos(): Position {
  return {
    x: Math.floor(Math.random() * MAP_WIDTH),
    y: Math.floor(Math.random() * MAP_HEIGHT),
  };
}

function randomItemType(): ItemType {
  const r = Math.random();
  if (r < 0.50) return "food";
  if (r < 0.80) return "coin";
  if (r < 0.93) return "shield";
  return "speed_boost";
}

// Spawn items away from snakes
function spawnItem(existingItems: Item[], snakes: Snake[]): Item | null {
  if (Math.random() > ITEM_SPAWN_CHANCE) return null;

  const occupied = new Set<string>();
  for (const s of snakes) {
    for (const b of s.body) occupied.add(posKey(b));
  }
  for (const i of existingItems) occupied.add(posKey(i.position));

  let attempts = 0;
  while (attempts < 50) {
    const p = randomPos();
    if (!occupied.has(posKey(p))) {
      return { type: randomItemType(), position: p };
    }
    attempts++;
  }
  return null;
}

// Check if position is safe (walls + snake bodies)
function isSafe(pos: Position, snakes: Snake[]): boolean {
  if (pos.x < 0 || pos.x >= MAP_WIDTH || pos.y < 0 || pos.y >= MAP_HEIGHT) return false;
  for (const s of snakes) {
    if (!s.isAlive) continue;
    for (const b of s.body) {
      if (b.x === pos.x && b.y === pos.y) return false;
    }
  }
  return true;
}

// Get safe directions from current position
function getSafeDirections(snake: Snake, allSnakes: Snake[]): Direction[] {
  const head = snake.body[0];
  const dirs: Direction[] = ["up", "down", "left", "right"];
  return dirs.filter((d) => {
    if (d === opposite(snake.direction)) return false;
    return isSafe(move(head, d), allSnakes);
  });
}

// ---- GameEngine Class ----

export class GameEngineImpl implements GameEngine {
  private state: GameState;
  private pendingPaths: Map<string, Direction[]> = new Map();
  private currentPathIndex: Map<string, number> = new Map();
  private justAte: Set<string> = new Set(); // Per-snake flag, not shared

  constructor(matchId: string) {
    this.state = {
      matchId,
      status: "waiting",
      currentTick: 0,
      snakes: [],
      items: [],
      countdown: COUNTDOWN_TICKS,
      winner: null,
      scores: new Map(),
      startTime: Date.now(),
    };
  }

  getState(): GameState {
    return this.state;
  }

  getFrame(): Frame {
    const { snakes, items } = this.state;
    const scoreboard = snakes
      .filter((s) => s.isAlive)
      .sort((a, b) => b.score - a.score)
      .map((s, i) => ({ rankLive: i + 1, agentId: s.agentId, nickname: s.nickname, score: s.score }));
    return { snakes, items, scoreboard };
  }

  addSnake(agentId: string, nickname: string, direction?: Direction): void {
    // Check if already in game
    if (this.state.snakes.find((s) => s.agentId === agentId)) return;
    if (this.state.snakes.length >= 5) return;

    // Spawn snake in random position, avoid other snakes
    let head: Position;
    let attempts = 0;
    do {
      head = randomPos();
      attempts++;
    } while (!isSafe(head, this.state.snakes) && attempts < 100);

    if (attempts >= 100) return;

    const dir = direction || (["up", "down", "left", "right"] as Direction[])[Math.floor(Math.random() * 4)];
    const body: Position[] = [head];
    for (let i = 1; i < INITIAL_SNAKE_LENGTH; i++) {
      body.push(move(body[i - 1], opposite(dir)));
    }

    this.state.snakes.push({
      agentId,
      nickname,
      body,
      direction: dir,
      isAlive: true,
      score: 0,
      hasShield: false,
      speedBoostTicks: 0,
    });
    this.state.scores.set(agentId, 0);

    // Start countdown if first player
    if (this.state.snakes.length === 1) {
      this.state.countdown = COUNTDOWN_TICKS;
    }
  }

  submitPath(agentId: string, directions: Direction[]): void {
    this.pendingPaths.set(agentId, directions);
    this.currentPathIndex.set(agentId, 0);
  }

  isFinished(): boolean {
    return this.state.status === "finished";
  }

  getWinner(): string | null {
    return this.state.winner;
  }

  tick(): GameState {
    if (this.state.status === "finished") return this.state;

    // Countdown phase
    if (this.state.status === "waiting") {
      this.state.countdown--;
      if (this.state.countdown <= 0) {
        this.state.status = "playing";
      }
      return this.state;
    }

    this.state.currentTick++;

    // Check max time
    if (this.state.currentTick >= MAX_TICKS) {
      this.finishGame();
      return this.state;
    }

    // Check alive snakes
    const alive = this.state.snakes.filter((s) => s.isAlive);
    if (alive.length <= 1) {
      this.finishGame();
      return this.state;
    }

    // Move each snake
    for (const snake of this.state.snakes) {
      if (!snake.isAlive) continue;

      // Consume pending path step
      const path = this.pendingPaths.get(snake.agentId);
      const idx = this.currentPathIndex.get(snake.agentId) ?? 0;

      let nextDir = snake.direction;
      if (path && idx < path.length) {
        nextDir = path[idx];
        this.currentPathIndex.set(snake.agentId, idx + 1);
      } else if (path && idx >= path.length) {
        // Path exhausted, clear it
        this.pendingPaths.delete(snake.agentId);
        this.currentPathIndex.delete(snake.agentId);
      }

      // If no pending path, use safe auto-navigation
      if (!path || idx >= (path?.length ?? 0)) {
        const safe = getSafeDirections(snake, this.state.snakes);
        if (safe.length > 0) {
          // Pick direction toward center as fallback
          const head = snake.body[0];
          const centerX = MAP_WIDTH / 2;
          const centerY = MAP_HEIGHT / 2;
          const toCenter = (a: Direction) => {
            const p = move(head, a);
            return Math.abs(p.x - centerX) + Math.abs(p.y - centerY);
          };
          safe.sort((a, b) => toCenter(a) - toCenter(b));
          nextDir = safe[0];
        }
      }

      snake.direction = nextDir;
      const newHead = move(snake.body[0], nextDir);

      // Collision detection — walls
      const hitWall = newHead.x < 0 || newHead.x >= MAP_WIDTH || newHead.y < 0 || newHead.y >= MAP_HEIGHT;

      // Collision detection — snake bodies (excluding self tail which will move)
      let hitSnake = false;
      for (const other of this.state.snakes) {
        if (!other.isAlive) continue;
        // Check all body segments except the tail (it will move away)
        const checkLength = other.agentId === snake.agentId ? other.body.length - 1 : other.body.length;
        for (let i = 0; i < checkLength; i++) {
          if (other.body[i].x === newHead.x && other.body[i].y === newHead.y) {
            hitSnake = true;
            break;
          }
        }
        if (hitSnake) break;
      }

      // Head-to-head collision
      let headToHead = false;
      for (const other of this.state.snakes) {
        if (!other.isAlive || other.agentId === snake.agentId) continue;
        const otherHead = other.body[0];
        if (otherHead.x === newHead.x && otherHead.y === newHead.y) {
          headToHead = true;
          break;
        }
      }

      if (hitWall || hitSnake || headToHead) {
        if (snake.hasShield) {
          snake.hasShield = false;
          // Shield absorbs one hit, stay alive but don't move
        } else {
          snake.isAlive = false;
          this.state.scores.set(snake.agentId, (this.state.scores.get(snake.agentId) ?? 0) - 10);
        }
        continue;
      }

      // Move snake body
      snake.body.unshift(newHead);

      // Speed boost handling
      if (snake.speedBoostTicks && snake.speedBoostTicks > 0) {
        snake.speedBoostTicks--;
      }

      // Check item collection
      let ateSomething = false;
      for (let i = 0; i < this.state.items.length; i++) {
        const item = this.state.items[i];
        if (item.position.x === newHead.x && item.position.y === newHead.y) {
          this.collectItem(snake, item);
          this.state.items.splice(i, 1);
          i--;
          ateSomething = true;
        }
      }

      // Remove tail (unless just ate food)
      if (!ateSomething) {
        snake.body.pop();
      }
    }

    // Spawn new items
    const newItem = spawnItem(this.state.items, this.state.snakes);
    if (newItem) this.state.items.push(newItem);

    return this.state;
  }

  private collectItem(snake: Snake, item: Item): void {
    switch (item.type) {
      case "food":
        snake.score += 5;
        this.state.scores.set(snake.agentId, (this.state.scores.get(snake.agentId) ?? 0) + 5);
        break;
      case "coin":
        snake.score += 10;
        this.state.scores.set(snake.agentId, (this.state.scores.get(snake.agentId) ?? 0) + 10);
        break;
      case "shield":
        snake.hasShield = true;
        snake.score += 2;
        this.state.scores.set(snake.agentId, (this.state.scores.get(snake.agentId) ?? 0) + 2);
        break;
      case "speed_boost":
        snake.speedBoostTicks = 10;
        snake.score += 2;
        this.state.scores.set(snake.agentId, (this.state.scores.get(snake.agentId) ?? 0) + 2);
        break;
    }
  }

  private finishGame(): void {
    this.state.status = "finished";
    const alive = this.state.snakes.filter((s) => s.isAlive);
    if (alive.length === 1) {
      this.state.winner = alive[0].agentId;
      alive[0].score += 3; // survival bonus
    } else if (alive.length > 1) {
      // All alive get survival bonus
      for (const s of alive) s.score += 3;
      // First place gets extra
      alive.sort((a, b) => b.score - a.score);
      alive[0].score += 3;
    }
    // Update scores map
    for (const s of this.state.snakes) {
      this.state.scores.set(s.agentId, s.score);
    }
  }

  getMyStatus(agentId: string) {
    const snake = this.state.snakes.find((s) => s.agentId === agentId);
    if (!snake) return null;
    const path = this.pendingPaths.get(agentId);
    const idx = this.currentPathIndex.get(agentId) ?? 0;
    const queueDepth = path ? Math.max(0, path.length - idx) : 0;
    return {
      agentId: snake.agentId,
      nickname: snake.nickname,
      queueDepth,
      isAlive: snake.isAlive,
    };
  }
}

// ---- Room Manager ----

export interface Room {
  roomId: string;
  name: string;
  engine: GameEngineImpl;
  players: { agentId: string; nickname: string }[];
  status: RoomStatus;
  matchId: string;
  createdAt: number;
}

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private intervals: Map<string, ReturnType<typeof setInterval>> = new Map();

  createRoom(name: string, matchId: string): Room {
    const roomId = `room_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const room: Room = {
      roomId,
      name,
      engine: new GameEngineImpl(matchId),
      players: [],
      status: "waiting",
      matchId,
      createdAt: Date.now(),
    };
    this.rooms.set(roomId, room);
    return room;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  addPlayer(roomId: string, agentId: string, nickname: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    if (room.players.find((p) => p.agentId === agentId)) return true;
    if (room.players.length >= 5) return false;
    room.players.push({ agentId, nickname });
    room.engine.addSnake(agentId, nickname);
    return true;
  }

  startGame(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== "waiting") return false;

    const interval = setInterval(() => {
      room.engine.tick();
      room.status = room.engine.getState().status;
    }, TICK_MS);

    this.intervals.set(roomId, interval);
    return true;
  }

  stopRoom(roomId: string): void {
    const interval = this.intervals.get(roomId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(roomId);
    }
    this.rooms.delete(roomId);
  }

  cleanupFinished(): void {
    for (const [roomId, room] of this.rooms) {
      if (room.status === "finished") {
        this.stopRoom(roomId);
      }
    }
  }
}

// Singleton
export const roomManager = new RoomManager();
