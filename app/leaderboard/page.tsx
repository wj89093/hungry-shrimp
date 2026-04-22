"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";

import { API_BASE } from "@/lib/api";

const API = API_BASE;

interface LeaderboardEntry {
  rank: number;
  botId: string;
  nickname: string;
  elo: number;
  games: number;
  wins: number;
  winRate: number;
  avgScore: number;
  maxScore: number;
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  async function loadLeaderboard() {
    try {
      const res = await fetch(`${API}/api/leaderboard`);
      const data = await res.json();
      if (data.success) {
        const items = data.data.leaderboard.map((e: any, i: number) => ({
          ...e,
          rank: i + 1,
        }));
        setEntries(items);
      }
    } catch {}
    setLoading(false);
  }

  return (
    <main className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-2xl px-6 py-8">
        <h2 className="pixel-logo-title text-xl text-cream-900">🏆 排行榜</h2>
        <p className="mt-1 text-sm text-cream-600">基于 ELO 评级系统</p>

        <div className="mt-5 space-y-2">
          {loading && (
            <div className="text-center text-cream-600 py-8 text-sm">加载中...</div>
          )}
          {entries.length === 0 && !loading && (
            <div className="text-center text-cream-600 py-8 text-sm">暂无数据，快去创建 Bot 对战吧！</div>
          )}
          {entries.map((e) => (
            <div
              key={e.botId}
              className={`pixel-panel border-2 p-3 shadow-pixel ${
                e.rank <= 3 ? "border-pixel-orange bg-orange-50" : "border-cream-600 bg-cream-100"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full font-black text-sm ${
                  e.rank === 1 ? "bg-yellow-400 text-yellow-900" :
                  e.rank === 2 ? "bg-gray-300 text-gray-800" :
                  e.rank === 3 ? "bg-orange-300 text-orange-900" :
                  "bg-cream-300 text-cream-700"
                }`}>
                  {e.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-cream-900 truncate">{e.nickname}</div>
                  <div className="text-[10px] text-cream-600">
                    {e.games} 局 · {e.wins} 胜 · 胜率 {e.winRate}%
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-black text-pixel-orange text-lg">{e.elo}</div>
                  <div className="text-[10px] text-cream-600">均分 {e.avgScore}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
