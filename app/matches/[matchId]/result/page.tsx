"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { Frame, Snake } from "@/lib/types";

import { API_BASE } from "@/lib/api";

const API = API_BASE;
const SNAKE_COLORS = ["#ff6b35", "#4da3c7", "#96cf8a", "#c96f2d", "#a08cb8"];

interface ResultPageProps {
  params: Promise<{ matchId: string }>;
}

export default function ResultPage({ params }: ResultPageProps) {
  const { matchId } = use(params);
  const [frame, setFrame] = useState<Frame | null>(null);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchResult() {
      try {
        const res = await fetch(`${API}/api/matches/${matchId}/result`);
        const data = await res.json();
        if (data.success) {
          setResult(data.data);
          setFrame({ snakes: data.data.scoreboard.map((s: any) => ({ ...s, body: [], direction: "right" as const, isAlive: s.isAlive })), items: [], scoreboard: data.data.scoreboard });
        } else {
          setError(data.error || "无法获取结果");
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    fetchResult();
  }, [matchId]);

  if (loading) {
    return (
      <main className="min-h-screen">
        <Header />
        <div className="mx-auto max-w-2xl px-6 py-10 text-center">
          <div className="pixel-logo-title text-xl text-cream-500 animate-pulse">加载中...</div>
        </div>
      </main>
    );
  }

  if (error || !result) {
    return (
      <main className="min-h-screen">
        <Header />
        <div className="mx-auto max-w-2xl px-6 py-10 text-center">
          <div className="pixel-logo-title text-xl text-red-500">{error || "无法获取结果"}</div>
          <Link href="/" className="mt-4 inline-block pixel-badge bg-cream-200 text-cream-800">返回首页</Link>
        </div>
      </main>
    );
  }

  const scoreboard = result.scoreboard || [];

  return (
    <main className="min-h-screen">
      <Header />

      <div className="mx-auto max-w-2xl px-6 py-8 lg:px-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-none border-2 border-cream-800 bg-cream-100 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-cream-900 shadow-[2px_2px_0_rgba(108,90,60,0.22)] hover:bg-cream-300"
        >
          ← 返回首页
        </Link>

        <div className="mt-6 pixel-panel border-2 border-cream-600 bg-cream-100 p-6 shadow-pixel text-center">
          <div className="pixel-logo-title text-2xl font-black uppercase text-pixel-orange mb-2">比赛结果</div>
          <div className="text-sm text-cream-700 font-bold">{result.matchId}</div>
        </div>

        <div className="mt-5 space-y-3">
          {scoreboard.map((entry: any, i: number) => {
            const isWinner = i === 0 && entry.isAlive;
            const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`;
            return (
              <div
                key={entry.agentId}
                className={`pixel-card flex items-center gap-4 ${isWinner ? "border-pixel-orange shadow-[0_14px_28px_rgba(201,111,45,0.25)]" : ""}`}
              >
                <div className="text-3xl font-black w-10">{medal}</div>
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: SNAKE_COLORS[i % SNAKE_COLORS.length] }}>
                  {entry.nickname?.slice(0, 2) || "??"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-black text-cream-900 truncate">{entry.nickname}</div>
                  <div className="text-[11px] text-cream-600">{entry.isAlive ? "存活" : "已死亡"}</div>
                </div>
                <div className="text-right">
                  <div className="pixel-logo-title text-xl text-pixel-orange">{entry.score}</div>
                  <div className="text-[10px] text-cream-600">分</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
