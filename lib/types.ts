// ============================================================
// Game Types
// ============================================================

export type Direction = "up" | "down" | "left" | "right";
export type RoomStatus = "waiting" | "playing" | "finished";
export type ItemType = "food" | "coin" | "shield" | "speed_boost";

export interface Position {
  x: number;
  y: number;
}

export interface Snake {
  agentId: string;
  nickname: string;
  body: Position[];
  direction: Direction;
  isAlive: boolean;
  score: number;
  hasShield?: boolean;
  speedBoostTicks?: number;
}

export interface Item {
  type: ItemType;
  position: Position;
}

export interface ScoreboardEntry {
  rankLive: number;
  agentId: string;
  nickname: string;
  score: number;
}

export interface Frame {
  snakes: Snake[];
  items: Item[];
  scoreboard: ScoreboardEntry[];
}

export interface MatchState {
  matchId: string;
  status: RoomStatus;
  currentTick: number;
}

export interface MyStatus {
  agentId: string;
  nickname: string;
  queueDepth: number;
  isAlive: boolean;
}

export interface MatchResponse {
  success: boolean;
  data: {
    match: MatchState;
    myStatus: MyStatus;
    frame: Frame;
  };
}

export interface PathSubmission {
  directions: Direction[];
  reasoning?: string;
}

export interface PathResponse {
  accepted: boolean;
  acceptedCount: number;
  queueDepth: number;
  warnings: Warning[];
  suggestedPath: Direction[] | null;
}

export interface Warning {
  stepIndex: number;
  reason: string;
  message: string;
}

export interface Room {
  roomId: string;
  name: string;
  status: RoomStatus;
  slots: number;
  currentPlayers: number;
  createdAt: string;
}

export interface RoomListResponse {
  success: boolean;
  data: {
    rooms: Room[];
    total: number;
    page: number;
    pageSize: number;
  };
}

// ============================================================
// Agent API Client
// ============================================================

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://hungryshrimp.coze.site/api/v1";
const AUTH_HEADER_KEY = "agent-auth-api-key";

export class HungryShrimpAPI {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private headers() {
    return {
      "Content-Type": "application/json",
      [AUTH_HEADER_KEY]: this.apiKey,
    };
  }

  async getMatch(matchId: string): Promise<MatchResponse> {
    const res = await fetch(`${API_BASE}/matches/${matchId}`, {
      headers: this.headers(),
      cache: "no-store",
    });
    return res.json();
  }

  async submitPath(matchId: string, path: PathSubmission): Promise<PathResponse> {
    const res = await fetch(`${API_BASE}/matches/${matchId}/path`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(path),
    });
    return res.json();
  }

  async getMatchResult(matchId: string) {
    const res = await fetch(`${API_BASE}/matches/${matchId}/result`, {
      headers: this.headers(),
      cache: "no-store",
    });
    return res.json();
  }

  async joinRoom(name: string): Promise<{ success: boolean; data: { matchId: string; roomId: string } }> {
    const res = await fetch(`${API_BASE}/rooms/join`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ name }),
    });
    return res.json();
  }

  async joinRoomById(roomId: string): Promise<{ success: boolean; data: { matchId: string; roomId: string } }> {
    const res = await fetch(`${API_BASE}/rooms/${roomId}/join`, {
      method: "POST",
      headers: this.headers(),
    });
    return res.json();
  }

  async createRoom(name: string): Promise<{ success: boolean; data: { roomId: string } }> {
    const res = await fetch(`${API_BASE}/rooms`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ name }),
    });
    return res.json();
  }

  async getLobby(status?: string): Promise<{ success: boolean; data: { rooms: Room[] } }> {
    const url = status ? `${API_BASE}/lobby?status=${status}` : `${API_BASE}/lobby`;
    const res = await fetch(url, { headers: this.headers(), cache: "no-store" });
    return res.json();
  }
}
