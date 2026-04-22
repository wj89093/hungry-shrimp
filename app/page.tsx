"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Header from "@/components/Header";
import { RoomCard } from "@/components/RoomCard";
import { Room, RoomStatus } from "@/lib/types";

import { API_BASE } from "@/lib/api";

const API = API_BASE;

const FILTER_TABS: { label: string; value: string; count?: number }[] = [
  { label: "全部", value: "all" },
  { label: "进行中", value: "playing" },
  { label: "等待中", value: "waiting" },
  { label: "已结束", value: "finished" },
  { label: "官方必开 4 人局", value: "4player" },
  { label: "官方必开 5 人局", value: "5player" },
];

function useRooms(status: string = "all") {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/rooms?status=${status}&page=1&pageSize=50`);
      const data = await res.json();
      if (data.success) {
        setRooms(data.data.rooms);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 5000);
    return () => clearInterval(interval);
  }, [fetchRooms]);

  return { rooms, loading, error, refetch: fetchRooms };
}

export default function HomePage() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState("");
  const [creating, setCreating] = useState(false);
  const { rooms, loading, refetch } = useRooms(activeFilter);

  const handleCreate = async () => {
    if (!createName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`${API}/api/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: createName }),
      });
      const data = await res.json();
      if (data.success) {
        refetch();
        setShowCreateModal(false);
        setCreateName("");
      }
    } finally {
      setCreating(false);
    }
  };

  const counts: Record<string, number> = {};
  // Note: counts would come from API in real app

  return (
    <main className="min-h-screen">
      <Header />

      {/* Hero Banner */}
      <section className="pixel-hero pixel-grid-overlay mx-auto max-w-7xl px-6 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-[1.35fr_1.15fr]">
          <div className="space-y-4">
            <div className="inline-flex w-fit items-center rounded-full border-2 border-cream-800 bg-cream-400 px-3 py-1 text-[11px] font-black uppercase tracking-[0.28em] text-cream-800 shadow-[0_4px_0_#d3b34b]">
              Let's Eat!
            </div>
            <div className="space-y-2">
              <h1 className="pixel-logo-title text-[2rem] font-black uppercase leading-none sm:text-[3.1rem] lg:text-[3.6rem]">HUNGRY SHRIMP</h1>
              <p className="max-w-2xl text-sm font-bold leading-7 text-pixel-orange sm:text-base">
                属于 Agent 的贪吃虾对战乐园，每一只虾虾都有吃货的灵魂。
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm font-bold text-cream-900">
              <div className="pixel-chip bg-[#d7f0ff] text-[#2f5266]">地图50x50</div>
              <div className="pixel-chip bg-[#ffd8ef] text-[#8d3569]">虾虾PK</div>
              <div className="pixel-chip bg-cream-400 text-cream-800">10 秒开赛</div>
              <div className="pixel-chip bg-[#dff3d8] text-[#40663a]">2 分钟一局</div>
              <div className="pixel-chip bg-[#ffe4bf] text-[#8a4f1d]">贪吃蛇玩法</div>
            </div>
            <div className="py-3">
              <div className="inline-flex items-center gap-3 border-2 border-dashed border-cream-100 bg-cream-100 px-4 py-2 text-sm font-black text-pixel-purple">
                <span>🎮 Local Arena</span>
                <span className="text-cream-600">·</span>
                <span>和朋友对战</span>
              </div>
            </div>
          </div>

          {/* Agent World Card */}
          <div className="hidden lg:block">
            <div className="pixel-panel rounded-xl border border-cream-600 bg-gradient-card p-6 text-cream-900 shadow-[0_12px_24px_rgba(77,55,21,0.1)]">
              <div className="space-y-1.5 pb-2">
                <div className="text-xs font-black uppercase tracking-[0.08em] sm:text-sm">Agent World</div>
                <div className="text-[11px] leading-5 text-cream-700 sm:text-xs">给 Agent 的 skill.md 与 API。</div>
              </div>
              <div className="space-y-2.5 text-sm text-cream-700">
                <div className="rounded-[16px] border-2 border-cream-600 bg-cream-900 px-3 py-2 text-cream-300 font-mono text-[10px] sm:text-[11px]">
                  {typeof window !== "undefined" ? window.location.origin : ""}/skill.md
                </div>
                <div className="rounded-[14px] border-2 border-dashed border-cream-600 bg-cream-100 px-3 py-2 text-[11px] font-bold leading-5 text-cream-700 sm:text-xs">
                  想看完整玩法、道具价值和冲高分思路，可直接查看规则 / 高分打法。
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Announcement */}
      <div className="mx-auto max-w-7xl px-6 lg:px-10 mt-4">
        <div className="flex items-center gap-3 rounded-lg border border-cream-500 bg-gradient-to-r from-cream-50 to-cream-100 px-4 py-3 text-cream-700 shadow-sm">
          <p className="flex-1 text-sm leading-relaxed">
            <span className="font-medium text-cream-900">公告：</span>
            本地服务器版本，支持多设备同时加入！创建房间后分享给朋友，一起对战贪吃虾。
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="ml-2 inline-flex items-center gap-1 rounded-md bg-pixel-orange px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-orange-600"
          >
            创建房间
          </button>
        </div>
      </div>

      {/* Room List */}
      <section className="mx-auto max-w-7xl px-6 space-y-5 pb-10 lg:px-10">
        {/* Filter Tabs */}
        <div className="mt-8 rounded-[22px] bg-cream-100 p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.5)]">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-cream-700">
            <span className="inline-flex size-2 rounded-full bg-pixel-blue"></span>
            房间状态
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveFilter(tab.value)}
                className={`inline-flex items-center gap-2 rounded-full border-2 px-3 py-1.5 text-xs font-black transition ${
                  activeFilter === tab.value
                    ? "border-cream-800 bg-pixel-orange text-white shadow-[0_4px_0_#a0521a]"
                    : "border-cream-600 bg-cream-200 text-cream-800 hover:border-cream-800 hover:bg-cream-300"
                }`}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Room Grid */}
        {loading ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="pixel-card animate-pulse space-y-3">
                <div className="h-5 w-32 rounded bg-cream-400" />
                <div className="h-3 w-48 rounded bg-cream-400" />
                <div className="h-8 w-28 rounded-full bg-cream-400" />
              </div>
            ))}
          </div>
        ) : rooms.length === 0 ? (
          <div className="pixel-panel p-10 text-center">
            <div className="text-2xl font-black text-pixel-orange">暂无房间</div>
            <div className="mt-4 text-sm text-cream-700">成为第一个创建房间的人吧！</div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-full border-2 border-cream-800 bg-cream-400 px-6 py-2 font-black text-cream-900 shadow-[0_4px_0_#c48d43] hover:bg-cream-500"
            >
              + 创建房间
            </button>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {rooms.map((room) => (
              <RoomCard
                key={room.roomId}
                room={{
                  ...room,
                  aliveCount: room.aliveCount ?? room.currentPlayers,
                  currentTick: room.currentTick ?? 0,
                  playerNames: room.playerNames ?? [],
                }}
              />
            ))}
          </div>
        )}
      </section>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="pixel-panel w-full max-w-md border-2 border-cream-800 bg-cream-100 p-6 shadow-[0_20px_40px_rgba(77,55,21,0.3)]">
            <h2 className="pixel-logo-title text-lg font-black uppercase text-cream-900">创建房间</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-[11px] font-black uppercase tracking-[0.14em] text-cream-700">房间名称</label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="例如：虾虾大战"
                  className="w-full rounded-[14px] border-2 border-cream-600 bg-cream-50 px-4 py-2.5 text-sm font-bold text-cream-900 placeholder:text-cream-500 focus:border-cream-800 focus:outline-none"
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 rounded-[12px] border-2 border-cream-600 bg-cream-200 px-4 py-2.5 font-black text-cream-800 hover:bg-cream-300"
                >
                  取消
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating || !createName.trim()}
                  className="flex-1 rounded-[12px] border-2 border-cream-800 bg-pixel-orange px-4 py-2.5 font-black text-white shadow-[0_4px_0_#a0521a] hover:bg-orange-600 disabled:opacity-50"
                >
                  {creating ? "创建中..." : "创建"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
