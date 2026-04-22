"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import GameCanvas from "@/components/GameCanvas";
import { Frame, Snake, Direction } from "@/lib/types";

import { API_BASE } from "@/lib/api";

const API = API_BASE;
const SNAKE_COLORS = ["#ff6b35", "#4da3c7", "#96cf8a", "#c96f2d", "#a08cb8"];

interface PlayPageProps {
  params: Promise<{ matchId: string }>;
}

// Human join page - registers as an Agent player via API
// The snake is controlled by the Agent (via path submissions), not manually
export default function PlayPage({ params }: PlayPageProps) {
  const { matchId } = use(params);
  const [agentId] = useState(() => `human_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
  const [nickname, setNickname] = useState("");
  const [joined, setJoined] = useState(false);
  const [frame, setFrame] = useState<Frame | null>(null);
  const [status, setStatus] = useState<string>("waiting");
  const [currentTick, setCurrentTick] = useState(0);
  const [queueDepth, setQueueDepth] = useState(0);
  const [isAlive, setIsAlive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFrame = useCallback(async () => {
    if (!joined) return;
    try {
      const res = await fetch(`${API}/api/matches/${matchId}?agentId=${agentId}`);
      const data = await res.json();
      if (data.success) {
        setFrame(data.data.frame);
        setStatus(data.data.match.status);
        setCurrentTick(data.data.match.currentTick);
        setQueueDepth(data.data.myStatus?.queueDepth ?? 0);
        setIsAlive(data.data.myStatus?.isAlive ?? false);
      }
    } catch {}
  }, [matchId, agentId, joined]);

  useEffect(() => {
    if (!joined) return;
    fetchFrame();
    const interval = setInterval(fetchFrame, 500);
    return () => clearInterval(interval);
  }, [joined, fetchFrame]);

  const handleJoin = async () => {
    if (!nickname.trim()) return;
    setJoinLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/rooms/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, nickname, name: `match_${matchId}` }),
      });
      const data = await res.json();
      if (data.success) {
        setJoined(true);
        // After joining, immediately fetch state
        setTimeout(fetchFrame, 300);
      } else {
        setError(data.error || "加入失败");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setJoinLoading(false);
    }
  };

  // Human player enters nickname to join as an Agent
  if (!joined) {
    return (
      <main className="min-h-screen">
        <Header />
        <div className="mx-auto max-w-md px-6 py-10">
          <div className="pixel-panel border-2 border-cream-800 bg-cream-100 p-6 shadow-pixel-lg">
            <h2 className="pixel-logo-title text-lg text-cream-900">加入对战</h2>
            <p className="mt-2 text-sm text-cream-700">
              输入你的名字加入房间。你的虾将由 <strong>AI Agent</strong> 控制，或者如果是人类玩家，由服务器端的策略控制。
            </p>
            <div className="mt-4 space-y-3">
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="给自己起个名字"
                className="w-full rounded-[14px] border-2 border-cream-600 bg-cream-50 px-4 py-2.5 text-sm font-bold text-cream-900 placeholder:text-cream-500 focus:border-cream-800 focus:outline-none"
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                maxLength={16}
              />
              {error && <div className="text-red-500 text-sm font-bold">{error}</div>}
              <button
                onClick={handleJoin}
                disabled={joinLoading || !nickname.trim()}
                className="w-full rounded-[12px] border-2 border-cream-800 bg-pixel-orange px-4 py-2.5 font-black text-white shadow-[0_4px_0_#a0521a] hover:bg-orange-600 disabled:opacity-50"
              >
                {joinLoading ? "加入中..." : "加入房间 →"}
              </button>
              <div className="text-center text-[11px] text-cream-600">
                你的虾会按照服务器策略自动移动
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Joined - show game view
  const players = frame?.snakes || [];
  const alive = players.filter((p) => p.isAlive);

  return (
    <main className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-5xl px-6 pb-10">
        {/* Status Bar */}
        <div className="mt-4 flex items-center justify-between rounded-[14px] border-2 border-cream-600 bg-cream-100 px-4 py-2 shadow-pixel">
          <div className="flex items-center gap-4 text-[11px] font-black">
            <span className={isAlive ? "text-green-600" : "text-red-500"}>
              {isAlive ? "🟢 存活中" : "💀 已死亡"}
            </span>
            <span className="text-cream-700">Tick {currentTick}</span>
            <span className="text-cream-700">你: {nickname}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-[11px] font-black ${status === "playing" ? "text-green-600" : status === "waiting" ? "text-yellow-600" : "text-cream-600"}`}>
              {status === "playing" ? "🔴 进行中" : status === "waiting" ? "⏳ 等待中" : "🏁 已结束"}
            </span>
            <Link
              href={`/matches/${matchId}/watch`}
              className="rounded-full border-2 border-cream-600 bg-cream-200 px-3 py-1 text-[10px] font-black text-cream-800 hover:bg-cream-300"
            >
              全屏观战
            </Link>
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_280px]">
          {/* Game Canvas */}
          <div className="pixel-panel overflow-hidden border-2 border-cream-600 bg-[#1a2a1a] p-4 shadow-pixel">
            <GameCanvas
              frame={frame}
              width={Math.min(500, typeof window !== "undefined" ? window.innerWidth - 64 : 500)}
              height={Math.min(500, typeof window !== "undefined" ? window.innerWidth - 64 : 500)}
              showGrid={true}
              highlightAgentId={agentId}
              currentTick={currentTick}
            />
            <div className="mt-2 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.16em] text-cream-600">
              <span>50×50 地图</span>
              <span>存活 {alive.length}/{players.length}</span>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-3">
            {/* Scoreboard */}
            <div className="pixel-panel border-2 border-cream-600 bg-cream-100 p-4 shadow-pixel">
              <div className="mb-3 text-[11px] font-black uppercase tracking-[0.14em] text-cream-700">玩家排行</div>
              <div className="space-y-1.5">
                {[...players].sort((a, b) => b.score - a.score).map((p, i) => (
                  <div
                    key={p.agentId}
                    className={`flex items-center gap-2 rounded-[10px] border-2 px-2 py-1.5 text-[11px] font-black ${
                      p.agentId === agentId
                        ? "border-pixel-orange bg-orange-50"
                        : "border-cream-500 bg-cream-50"
                    }`}
                  >
                    <div className="w-5 text-center text-[10px]">{p.isAlive ? `#${i + 1}` : "💀"}</div>
                    <div className="flex size-5 items-center justify-center rounded-full text-[7px] font-bold text-white" style={{ background: SNAKE_COLORS[i % SNAKE_COLORS.length] }}>
                      {p.nickname.slice(0, 2)}
                    </div>
                    <div className="flex-1 truncate text-[11px]">{p.nickname}</div>
                    <div className="text-pixel-orange font-black">{p.score}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* API info */}
            <div className="pixel-panel border-2 border-cream-600 bg-cream-100 p-4 shadow-pixel">
              <div className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-cream-700">API 接入点</div>
              <div className="space-y-1.5 text-[10px] font-mono text-cream-700">
                <div className="rounded bg-cream-200 p-1.5">
                  <div className="text-[9px] text-cream-500">GET 房间状态</div>
                  <div className="truncate text-[10px]">/api/matches/{matchId.slice(0, 12)}...</div>
                </div>
                <div className="rounded bg-cream-200 p-1.5">
                  <div className="text-[9px] text-cream-500">POST 路径提交</div>
                  <div className="truncate text-[10px]">/api/matches/.../path</div>
                </div>
              </div>
              <div className="mt-2 rounded-[10px] border-2 border-dashed border-cream-400 bg-cream-200 p-2 text-[10px] text-cream-600">
                Agent 通过 API 控制蛇的移动。人类玩家加入后由 AI 自动控制。
              </div>
            </div>

            {status === "finished" && (
              <Link
                href={`/matches/${matchId}/result`}
                className="block w-full rounded-[12px] border-2 border-cream-800 bg-pixel-orange py-2.5 text-center font-black text-white shadow-[0_4px_0_#a0521a] hover:bg-orange-600"
              >
                查看最终结果
              </Link>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}