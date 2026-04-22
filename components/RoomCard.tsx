"use client";

import Link from "next/link";
import { Room, RoomStatus } from "@/lib/types";

const STATUS_COLORS: Record<RoomStatus, { bg: string; text: string; bar: string }> = {
  playing: { bg: "card-playing", text: "text-pixel-blue", bar: "#8fd0ea" },
  waiting: { bg: "card-waiting", text: "text-green-700", bar: "#96cf8a" },
  finished: { bg: "card-finished", text: "text-orange-700", bar: "#efb38a" },
};

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

interface RoomCardProps {
  room: Room & {
    aliveCount?: number;
    currentTick?: number;
    playerNames?: string[];
    matchId?: string;
  };
  showStatus?: boolean;
}

export function RoomCard({ room, showStatus = true }: RoomCardProps) {
  const colors = STATUS_COLORS[room.status];
  const leftTime = room.status === "playing" ? `${Math.max(0, 120 - (room.currentTick ?? 0) * 0.5).toFixed(0)}s left` : null;
  const slotsLeft = 5 - room.currentPlayers;

  return (
    <div className={`bg-card relative flex flex-col gap-6 py-6 group relative overflow-hidden rounded-[20px] border-4 text-sm text-cream-700 transition-transform duration-200 hover:-translate-y-1 border-cream-800 shadow-[0_14px_28px_rgba(77,55,21,0.12)] ${colors.bg}`}>
      <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: colors.bar }} />

      <div className="relative space-y-1 px-3.5 pb-1 pt-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-1 text-[8px] font-black uppercase leading-none tracking-[0.18em] text-cream-700">Slot</div>
            <div className="flex items-center gap-2">
              <div className="truncate text-[14px] font-black uppercase leading-none tracking-[0.01em] text-cream-900">{room.name}</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {room.status === "playing" && (
              <>
                <span className="relative flex size-3 shrink-0 items-center justify-center">
                  <span className="absolute inline-flex size-3 rounded-full shadow-[0_0_0_0_rgba(47,158,195,0.45)] animate-ping-slow"></span>
                  <span className="relative inline-flex size-2 rounded-full bg-pixel-blue"></span>
                </span>
              </>
            )}
            {showStatus && (
              <span className={`pixel-badge ${colors.text}`}
                style={{ borderColor: "#6c5a3c", backgroundColor: room.status === "playing" ? "#d7f0ff" : room.status === "waiting" ? "#dff3d8" : "#ffe3d0" }}>
                {room.status === "playing" ? "进行中" : room.status === "waiting" ? "等待中" : "已结束"}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="relative space-y-2.5 px-3.5 pb-3.5">
        {room.status === "playing" ? (
          <div className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-[14px] border-2 border-cream-500 bg-cream-50 px-2.5 py-2">
            <div className="space-y-0.5">
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-cream-700">存活 {room.aliveCount}/5</div>
              <div className="text-[11px] font-semibold text-cream-600">
                {((room.currentTick ?? 0) * 0.5).toFixed(0)}s
              </div>
            </div>
            <div className="text-right">
              <div className="text-[9px] font-black uppercase tracking-[0.12em] text-cream-700">存活</div>
              <div className="text-base font-black leading-none text-cream-900">{room.aliveCount}</div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-[14px] border-2 border-cream-500 bg-cream-50 px-2.5 py-2">
            <div className="space-y-0.5">
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-cream-700">等待更多 Agent</div>
              <div className="text-[11px] font-semibold text-cream-600">{room.createdAt ? formatTime(room.createdAt) : ""}</div>
            </div>
            <div className="text-right">
              <div className="text-[9px] font-black uppercase tracking-[0.12em] text-cream-700">Agent</div>
              <div className="text-base font-black leading-none text-cream-900">{room.currentPlayers}/5</div>
            </div>
          </div>
        )}

        <div className="rounded-[14px] border-2 border-cream-500 bg-cream-50 px-2.5 py-2">
          <div className="mb-1.5 flex items-center justify-between text-[8px] font-black uppercase tracking-[0.16em] text-cream-700">
            <span>Slots</span>
            {room.status === "playing" ? leftTime : <span>50×50</span>}
          </div>
          <div className="grid grid-cols-5 gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={`aspect-square flex flex-col items-center justify-center gap-1 rounded-[10px] border-2 px-1 py-1 text-center ${
                  i < room.currentPlayers
                    ? "border-cream-600 bg-cream-100"
                    : "border-dashed border-cream-400 bg-cream-200"
                }`}
              >
                {i < room.currentPlayers ? (
                  <>
                    <div className="size-6 rounded-full bg-cream-500 flex items-center justify-center text-[7px] font-bold text-cream-800">
                      {room.playerNames?.[i]?.slice(0, 2) || "?"}
                    </div>
                    <span className="w-full truncate text-[8px] font-black text-cream-900">
                      {room.playerNames?.[i] || ""}
                    </span>
                  </>
                ) : (
                  <div className="text-[8px] font-black text-cream-400">{i < 4 ? `${4 - i} open` : ""}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {room.status === "playing" ? (
          <Link
            href={`/matches/${room.matchId}/watch`}
            className="inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all py-2 h-7 w-full border-2 px-2 text-[11px] border-cream-800 bg-pixel-blue text-cream-950 shadow-[0_4px_0_#4b93ab] hover:bg-[#97daf0]"
          >
            立即观战
          </Link>
        ) : room.status === "waiting" ? (
          <div className="flex w-full items-center justify-center gap-1.5 rounded-[12px] border-2 border-dashed border-cream-400 bg-cream-200 px-3 py-2 text-[11px] font-semibold text-cream-600">
            等待 Agent 加入中...
          </div>
        ) : (
          <Link
            href={`/matches/${room.matchId}/result`}
            className="inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all py-2 h-7 w-full border-2 px-2 text-[11px] border-cream-600 bg-cream-300 text-cream-800 hover:bg-cream-400"
          >
            查看结果
          </Link>
        )}
      </div>
    </div>
  );
}
