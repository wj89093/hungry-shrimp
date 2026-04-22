"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

import { API_BASE } from "@/lib/api";

const API = API_BASE;

interface Bot {
  bot_id: string;
  nickname: string;
  description: string;
  api_key: string;
  total_games: number;
  total_wins: number;
  total_score: number;
}

export default function BotsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [bots, setBots] = useState<Bot[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const uid = localStorage.getItem("hs_userId");
    if (!uid) { router.push("/login"); return; }
    setUserId(uid);
    loadBots(uid);
  }, [router]);

  async function loadBots(uid: string) {
    try {
      const res = await fetch(`${API}/api/bots?userId=${uid}`);
      const data = await res.json();
      if (data.success) setBots(data.data.bots || []);
    } catch {}
  }

  async function createBot() {
    if (!userId || !newName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/bots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, nickname: newName, description: newDesc }),
      });
      const data = await res.json();
      if (data.success) {
        setBots([...bots, data.data.bot]);
        setShowCreate(false);
        setNewName("");
        setNewDesc("");
      }
    } catch {}
    setLoading(false);
  }

  return (
    <main className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="flex items-center justify-between">
          <h2 className="pixel-logo-title text-xl text-cream-900">我的 Bot</h2>
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-[12px] border-2 border-cream-800 bg-pixel-orange px-4 py-2 font-black text-white shadow-[0_4px_0_#a0521a] hover:bg-orange-600"
          >
            + 新建 Bot
          </button>
        </div>

        {showCreate && (
          <div className="mt-4 pixel-panel border-2 border-cream-800 bg-cream-100 p-4 shadow-pixel">
            <div className="space-y-3">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Bot 名字"
                className="w-full rounded-[14px] border-2 border-cream-600 bg-cream-50 px-4 py-2 text-sm font-bold text-cream-900 placeholder:text-cream-500"
              />
              <input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="描述（可选）"
                className="w-full rounded-[14px] border-2 border-cream-600 bg-cream-50 px-4 py-2 text-sm font-bold text-cream-900 placeholder:text-cream-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={createBot}
                  disabled={loading || !newName.trim()}
                  className="rounded-[10px] border-2 border-cream-800 bg-pixel-orange px-3 py-1.5 font-black text-white text-sm shadow-[0_3px_0_#a0521a]"
                >
                  {loading ? "创建中..." : "创建"}
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="rounded-[10px] border-2 border-cream-600 bg-cream-200 px-3 py-1.5 font-black text-cream-800 text-sm"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-5 space-y-3">
          {bots.length === 0 && (
            <div className="text-center text-cream-600 text-sm py-8">还没有 Bot，点击上方按钮创建一个</div>
          )}
          {bots.map((bot) => (
            <div key={bot.bot_id} className="pixel-panel border-2 border-cream-600 bg-cream-100 p-4 shadow-pixel">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-black text-cream-900">{bot.nickname}</div>
                  <div className="text-[11px] text-cream-600">{bot.description || "无描述"}</div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-black text-cream-700">{bot.total_games} 局 / {bot.total_wins} 胜</div>
                  <div className="text-[10px] text-cream-500">得分: {bot.total_score}</div>
                </div>
              </div>
              <div className="mt-2 rounded bg-cream-200 px-2 py-1 text-[10px] font-mono text-cream-600 truncate">
                API Key: {bot.api_key}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
