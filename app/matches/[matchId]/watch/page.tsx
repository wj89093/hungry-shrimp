"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3003";
const WS_BASE = process.env.NEXT_PUBLIC_WS_BASE || "ws://localhost:3003";
const CELL_SIZE = 10;
const MAP_W = 50;
const MAP_H = 50;

const SNAKE_COLORS = [
  "#ff6b35",
  "#4da3c7",
  "#96cf8a",
  "#c96f2d",
  "#a08cb8",
];

const ITEM_COLORS: Record<string, string> = {
  food: "#ff8d6a",
  coin: "#ffe681",
  shield: "#dff3d8",
  speed_boost: "#bfeaff",
};

interface SnakeState {
  agentId: string;
  nickname: string;
  body: { x: number; y: number }[];
  direction: string;
  isAlive: boolean;
  score: number;
  hasShield?: boolean;
  speedBoostTicks?: number;
}

interface GameState {
  status: string;
  currentTick: number;
  snakes: SnakeState[];
  items: { type: string; position: { x: number; y: number } }[];
}

export default function WatchPage({ params }: { params: Promise<{ matchId: string }> }) {
  const resolvedParams = use(params);
  const matchId = resolvedParams.matchId;
  const router = useRouter();
  
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [status, setStatus] = useState<string>("connecting");
  const [tick, setTick] = useState(0);
  const [roomName, setRoomName] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Connect WebSocket
  useEffect(() => {
    const wsUrl = `${WS_BASE}/ws`;
    console.log("Connecting to WS:", wsUrl);
    
    const socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      console.log("WS connected");
      // Subscribe to match
      socket.send(JSON.stringify({ type: "subscribe", matchId }));
    };
    
    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        // console.log("WS message:", msg.type);
        
        if (msg.type === "connected") {
          setStatus("connected");
        } else if (msg.type === "subscribed") {
          setStatus("subscribed");
          console.log("Subscribed to match:", msg.matchId);
        } else if (msg.type === "matchUpdate") {
          if (msg.data) {
            setGameState(msg.data);
            setTick(msg.data.currentTick || 0);
            setStatus(msg.data.status || "unknown");
          }
        } else if (msg.type === "matchEvent") {
          if (msg.event === "finished") {
            setStatus("finished");
          }
        } else if (msg.type === "error") {
          setError(msg.error);
        }
      } catch (e) {
        console.error("WS parse error:", e);
      }
    };
    
    socket.onerror = (e) => {
      console.error("WS error:", e);
      setError("WebSocket connection failed");
    };
    
    socket.onclose = () => {
      console.log("WS closed");
      setStatus("disconnected");
    };
    
    setWs(socket);
    
    // Fallback: poll via HTTP if WS fails
    const pollInterval = setInterval(async () => {
      if (socket.readyState !== WebSocket.OPEN) {
        try {
          const res = await fetch(`${API_BASE}/api/matches/${matchId}`);
          const data = await res.json();
          if (data.success && data.data.frame) {
            setGameState({
              status: data.data.match.status,
              currentTick: data.data.match.currentTick,
              snakes: data.data.frame.snakes || [],
              items: data.data.frame.items || [],
            });
            setTick(data.data.match.currentTick || 0);
            setStatus(data.data.match.status);
          }
        } catch {}
      }
    }, 500);
    
    return () => {
      clearInterval(pollInterval);
      socket.close();
    };
  }, [matchId]);

  // Render Canvas
  const canvasRef = useCallback((canvas: HTMLCanvasElement | null) => {
    if (!canvas || !gameState) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    const scale = width / (MAP_W * CELL_SIZE);
    
    // Background
    ctx.fillStyle = "#1a2a1a";
    ctx.fillRect(0, 0, width, height);
    
    // Grid
    ctx.strokeStyle = "#2a3a2a";
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= MAP_W; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL_SIZE * scale, 0);
      ctx.lineTo(x * CELL_SIZE * scale, height);
      ctx.stroke();
    }
    for (let y = 0; y <= MAP_H; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL_SIZE * scale);
      ctx.lineTo(width, y * CELL_SIZE * scale);
      ctx.stroke();
    }
    
    // Items
    for (const item of gameState.items || []) {
      const x = item.position.x * CELL_SIZE * scale;
      const y = item.position.y * CELL_SIZE * scale;
      const sz = CELL_SIZE * scale;
      
      ctx.fillStyle = ITEM_COLORS[item.type] || "#fff";
      if (item.type === "shield") {
        ctx.beginPath();
        ctx.arc(x + sz / 2, y + sz / 2, sz / 2 - 1, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(x + 1, y + 1, sz - 2, sz - 2);
      }
    }
    
    // Snakes
    for (let si = 0; si < (gameState.snakes || []).length; si++) {
      const snake = gameState.snakes[si];
      if (!snake || !snake.isAlive) continue;
      
      const color = SNAKE_COLORS[si % SNAKE_COLORS.length];
      const segSize = CELL_SIZE * scale;
      
      for (let bi = 0; bi < snake.body.length; bi++) {
        const seg = snake.body[bi];
        const x = seg.x * CELL_SIZE * scale;
        const y = seg.y * CELL_SIZE * scale;
        const sz = segSize;
        
        if (bi === 0) {
          // Head
          ctx.fillStyle = color;
          ctx.shadowColor = color;
          ctx.shadowBlur = 4;
          ctx.fillRect(x, y, sz, sz);
          ctx.shadowBlur = 0;
          
          // Eyes
          const eyeSize = sz * 0.2;
          const eyeOff = sz * 0.2;
          ctx.fillStyle = "#333";
          if (snake.direction === "right") {
            ctx.fillRect(x + sz - eyeOff - eyeSize, y + eyeOff, eyeSize, eyeSize);
            ctx.fillRect(x + sz - eyeOff - eyeSize, y + sz - eyeOff - eyeSize, eyeSize, eyeSize);
          } else if (snake.direction === "left") {
            ctx.fillRect(x + eyeOff, y + eyeOff, eyeSize, eyeSize);
            ctx.fillRect(x + eyeOff, y + sz - eyeOff - eyeSize, eyeSize, eyeSize);
          } else if (snake.direction === "up") {
            ctx.fillRect(x + eyeOff, y + eyeOff, eyeSize, eyeSize);
            ctx.fillRect(x + sz - eyeOff - eyeSize, y + eyeOff, eyeSize, eyeSize);
          } else {
            ctx.fillRect(x + eyeOff, y + sz - eyeOff - eyeSize, eyeSize, eyeSize);
            ctx.fillRect(x + sz - eyeOff - eyeSize, y + sz - eyeOff - eyeSize, eyeSize, eyeSize);
          }
        } else {
          // Body
          ctx.fillStyle = bi % 2 === 0 ? color : `${color}cc`;
          ctx.fillRect(x, y, sz, sz);
        }
      }
      
      // Score
      const head = snake.body[0];
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${Math.floor(8 * scale)}px monospace`;
      ctx.fillText(`${snake.nickname}:${snake.score}`, head.x * CELL_SIZE * scale + segSize, head.y * CELL_SIZE * scale - 2);
    }
  }, [gameState]);

  const alive = (gameState?.snakes || []).filter((s) => s.isAlive);
  const sortedSnakes = [...(gameState?.snakes || [])].sort((a, b) => b.score - a.score);

  return (
    <div className="min-h-screen bg-[#0a1a0a]">
      <Header />
      
      <div className="mx-auto max-w-6xl px-4 py-4">
        {/* Status Bar */}
        <div className="mb-4 flex items-center justify-between rounded-xl border-2 border-green-800 bg-green-950 px-6 py-3">
          <div className="flex items-center gap-4">
            <div className={`size-3 rounded-full ${status === "playing" ? "bg-red-500 animate-pulse" : status === "connected" || status === "subscribed" ? "bg-green-500" : "bg-yellow-500"}`} />
            <span className="font-mono text-sm text-green-400">
              {status === "playing" ? "● LIVE" : status === "connected" || status === "subscribed" ? "○ CONNECTED" : "⚡ CONNECTING..."}
            </span>
            <span className="text-green-600">|</span>
            <span className="font-mono text-green-400">Tick {tick}</span>
            <span className="text-green-600">|</span>
            <span className="font-mono text-green-400">
              {alive.length}/{(gameState?.snakes || []).length} alive
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-green-600">Room: {matchId.slice(0, 16)}...</span>
            <button
              onClick={() => router.push(`/matches/${matchId}`)}
              className="rounded-lg border border-green-700 bg-green-900 px-3 py-1 text-xs text-green-400 hover:bg-green-800"
            >
              Back
            </button>
          </div>
        </div>

        {/* Game Canvas */}
        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="overflow-hidden rounded-xl border-2 border-green-800 bg-black p-2">
            <canvas
              ref={canvasRef}
              width={600}
              height={600}
              style={{ 
                imageRendering: "pixelated",
                width: "100%",
                maxWidth: "600px",
                aspectRatio: "1",
              }}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Scoreboard */}
            <div className="rounded-xl border-2 border-green-800 bg-green-950 p-4">
              <div className="mb-3 text-xs font-bold uppercase tracking-widest text-green-500">Leaderboard</div>
              <div className="space-y-2">
                {sortedSnakes.map((s, i) => (
                  <div
                    key={s.agentId}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
                      s.isAlive ? "border-green-700 bg-green-900" : "border-red-900 bg-red-950 opacity-50"
                    }`}
                  >
                    <div className={`w-6 text-center font-mono text-lg font-bold ${s.isAlive ? "text-green-400" : "text-red-600"}`}>
                      {s.isAlive ? `#${i + 1}` : "💀"}
                    </div>
                    <div
                      className="flex size-6 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ background: SNAKE_COLORS[sortedSnakes.indexOf(s) % SNAKE_COLORS.length] }}
                    >
                      {s.nickname.slice(0, 2)}
                    </div>
                    <div className="flex-1 truncate font-mono text-sm text-green-300">{s.nickname}</div>
                    <div className="font-mono text-lg font-bold text-yellow-400">{s.score}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Match Info */}
            <div className="rounded-xl border-2 border-green-800 bg-green-950 p-4">
              <div className="mb-2 text-xs font-bold uppercase tracking-widest text-green-500">Match Info</div>
              <div className="space-y-2 font-mono text-sm text-green-400">
                <div className="flex justify-between">
                  <span className="text-green-600">Map</span>
                  <span>{MAP_W}×{MAP_H}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-600">Players</span>
                  <span>{(gameState?.snakes || []).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-600">Status</span>
                  <span className={status === "playing" ? "text-red-400" : "text-yellow-400"}>{status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-600">Items</span>
                  <span>{(gameState?.items || []).length}</span>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="rounded-xl border-2 border-green-800 bg-green-950 p-4">
              <div className="mb-2 text-xs font-bold uppercase tracking-widest text-green-500">Legend</div>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded bg-orange-500" />
                  <span className="text-green-500">Snake</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded bg-red-400" />
                  <span className="text-green-500">Food (+5)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded bg-yellow-400" />
                  <span className="text-green-500">Coin (+10)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
