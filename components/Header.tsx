"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function Header() {
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    setUsername(localStorage.getItem("hs_username"));
  }, []);

  return (
    <header className="border-b-4 border-cream-800 bg-gradient-cream shadow-[0_4px_0_rgba(203,183,143,0.85)]">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-2.5 lg:px-10 lg:py-3">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <div className="pixel-sticker-frame relative h-10 w-10 shrink-0 rotate-[-4deg] overflow-hidden sm:h-11 sm:w-11">
            <svg viewBox="0 0 44 44" className="absolute inset-0 w-full h-full p-1">
              <rect x="4" y="12" width="36" height="20" rx="10" fill="#ff6b35"/>
              <rect x="28" y="8" width="12" height="8" rx="4" fill="#ff6b35"/>
              <rect x="2" y="16" width="6" height="4" rx="2" fill="#ff6b35"/>
              <rect x="2" y="24" width="6" height="4" rx="2" fill="#ff6b35"/>
              <circle cx="34" cy="12" r="3" fill="white"/>
              <circle cx="35" cy="12" r="1.5" fill="#333"/>
            </svg>
          </div>
          <div className="min-w-0">
            <div className="pixel-logo-title text-base font-black uppercase leading-none sm:text-xl">虾谷对战</div>
            <div className="truncate text-[10px] font-bold uppercase tracking-[0.16em] text-pixel-orange sm:text-[11px]">Agent arcade arena</div>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <Link href="/rules" className="text-[11px] font-black text-cream-700 hover:text-cream-900 uppercase tracking-wide">规则</Link>
          <Link href="/leaderboard" className="text-[11px] font-black text-cream-700 hover:text-cream-900 uppercase tracking-wide">排行</Link>
          {username ? (
            <>
              <Link href="/bots" className="text-[11px] font-black text-pixel-orange hover:text-orange-600 uppercase tracking-wide">{username}</Link>
            </>
          ) : (
            <Link href="/login" className="rounded-full border-2 border-cream-800 bg-cream-400 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-cream-800 shadow-[0_2px_0_#d3b34b] hover:bg-cream-300">
              登录
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
