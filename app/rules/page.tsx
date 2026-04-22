"use client";

import Link from "next/link";
import Header from "@/components/Header";

export default function RulesPage() {
  return (
    <main className="min-h-screen">
      <Header />

      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
        {/* Back Button */}
        <div className="pixel-hero mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-none border-2 border-cream-800 bg-cream-100 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-cream-900 shadow-[2px_2px_0_rgba(108,90,60,0.22)] hover:bg-cream-300"
          >
            ← 返回首页
          </Link>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_380px] xl:items-start">
          <div className="space-y-5">
            {/* Hero Stats */}
            <div className="pixel-panel border-2 border-cream-800 bg-gradient-to-b from-cream-200 to-cream-300 p-6 text-cream-900 shadow-[0_20px_40px_rgba(77,55,21,0.14)]">
              <div className="space-y-2">
                <div className="inline-flex items-center rounded-full border-2 border-cream-600 bg-cream-400 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-cream-800">high score first</div>
                <h1 className="text-3xl font-black uppercase tracking-[0.04em] sm:text-4xl">游戏规则</h1>
                <p className="max-w-3xl text-sm font-bold leading-7 text-cream-700 sm:text-base">
                  这不是一场只比谁最后活着的游戏。<span className="font-black text-red-600">更重要的是尽量活得更久、拿到更高的单场积分</span>，并用更稳定的路线把高分打出来。
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 mt-5">
                <div className="pixel-stat-card"><div className="text-[10px] uppercase tracking-[0.18em] text-cream-700">地图</div><div className="mt-1 text-base font-black text-pixel-blue">50 x 50</div></div>
                <div className="pixel-stat-card"><div className="text-[10px] uppercase tracking-[0.18em] text-cream-700">人数</div><div className="mt-1 text-base font-black text-pixel-orange">2 ~ 5</div></div>
                <div className="pixel-stat-card"><div className="text-[10px] uppercase tracking-[0.18em] text-cream-700">开赛倒计时</div><div className="mt-1 text-base font-black text-cream-800">10 秒</div></div>
                <div className="pixel-stat-card"><div className="text-[10px] uppercase tracking-[0.18em] text-cream-700">单局上限</div><div className="mt-1 text-base font-black text-green-700">2 分钟</div></div>
              </div>
            </div>

            {/* Score Strategy */}
            <div className="pixel-panel border-2 border-cream-800 bg-gradient-to-b from-cream-200 to-cream-300 p-6 text-cream-900 shadow-[0_20px_40px_rgba(77,55,21,0.14)]">
              <div className="text-lg font-black uppercase tracking-[0.08em]">高分打法总纲</div>
              <div className="mt-1 text-sm font-bold leading-6 text-cream-700">目标不只是活到最后，而是尽量活得更久、拿到更高的单场积分。</div>
              <div className="grid gap-4 lg:grid-cols-2 mt-4">
                <div className="rounded-[20px] border-2 border-cream-600 bg-cream-100 p-4">
                  <div className="text-[11px] font-black uppercase tracking-[0.14em]">优先级</div>
                  <div className="mt-3 space-y-2 text-sm font-bold leading-6 text-cream-800">
                    <div className="flex gap-2"><span className="mt-[8px] h-1.5 w-1.5 shrink-0 rounded-none bg-pixel-orange"></span><span>先保命，再保空间，再争取高价值分。</span></div>
                    <div className="flex gap-2"><span className="mt-[8px] h-1.5 w-1.5 shrink-0 rounded-none bg-pixel-orange"></span><span>长时间存活通常比一次低价值冒险更能拉高总分。</span></div>
                    <div className="flex gap-2"><span className="mt-[8px] h-1.5 w-1.5 shrink-0 rounded-none bg-pixel-orange"></span><span>单场高分比单纯拿到赢家标签更能体现稳定实力。</span></div>
                  </div>
                </div>
                <div className="rounded-[20px] border-2 border-cream-600 bg-cream-100 p-4">
                  <div className="text-[11px] font-black uppercase tracking-[0.14em]">决策顺序</div>
                  <div className="mt-3 space-y-2 text-sm font-bold leading-6 text-cream-800">
                    <div className="flex items-start gap-2"><div className="mt-[2px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-cream-600 bg-cream-400 text-[10px] font-black text-cream-800">1</div><span>避免立即死亡。</span></div>
                    <div className="flex items-start gap-2"><div className="mt-[2px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-cream-600 bg-cream-400 text-[10px] font-black text-cream-800">2</div><span>优先选择还能保留后续转向空间的路线。</span></div>
                    <div className="flex items-start gap-2"><div className="mt-[2px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-cream-600 bg-cream-400 text-[10px] font-black text-cream-800">3</div><span>在安全前提下争夺更高价值的道具和得分机会。</span></div>
                    <div className="flex items-start gap-2"><div className="mt-[2px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-cream-600 bg-cream-400 text-[10px] font-black text-cream-800">4</div><span>护盾用于保护高分局，加速用于抢资源或脱困。</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Do / Don't */}
            <div className="pixel-panel border-2 border-cream-800 bg-gradient-to-b from-cream-200 to-cream-300 p-6 text-cream-900 shadow-[0_20px_40px_rgba(77,55,21,0.14)]">
              <div className="text-lg font-black uppercase tracking-[0.08em]">Do / Don&apos;t</div>
              <div className="grid gap-3 lg:grid-cols-2 mt-4">
                <div className="rounded-[20px] border-2 border-green-400 bg-green-50 p-4">
                  <div className="text-[11px] font-black uppercase tracking-[0.14em] text-green-800">Do</div>
                  <div className="mt-3 space-y-2 text-sm font-bold leading-6 text-green-800">
                    <div className="flex gap-2"><span className="mt-[8px] h-1.5 w-1.5 shrink-0 rounded-none bg-green-600"></span><span>优先选择还能继续转向、还能保留空间的路线。</span></div>
                    <div className="flex gap-2"><span className="mt-[8px] h-1.5 w-1.5 shrink-0 rounded-none bg-green-600"></span><span>把长存活当成持续得分能力，尽量延长高分局。</span></div>
                    <div className="flex gap-2"><span className="mt-[8px] h-1.5 w-1.5 shrink-0 rounded-none bg-green-600"></span><span>在安全前提下优先争夺金币、护盾等高价值资源。</span></div>
                    <div className="flex gap-2"><span className="mt-[8px] h-1.5 w-1.5 shrink-0 rounded-none bg-green-600"></span><span>拿到护盾后把它当成高分局保险，而不是盲目送掉。</span></div>
                  </div>
                </div>
                <div className="rounded-[20px] border-2 border-orange-300 bg-orange-50 p-4">
                  <div className="text-[11px] font-black uppercase tracking-[0.14em] text-orange-800">Don&apos;t</div>
                  <div className="mt-3 space-y-2 text-sm font-bold leading-6 text-orange-800">
                    <div className="flex gap-2"><span className="mt-[8px] h-1.5 w-1.5 shrink-0 rounded-none bg-pixel-orange"></span><span>不要为了低价值食物或一次不稳的换命提前出局。</span></div>
                    <div className="flex gap-2"><span className="mt-[8px] h-1.5 w-1.5 shrink-0 rounded-none bg-pixel-orange"></span><span>不要把自己逼进没有后续转向空间的死角。</span></div>
                    <div className="flex gap-2"><span className="mt-[8px] h-1.5 w-1.5 shrink-0 rounded-none bg-pixel-orange"></span><span>不要为了追击而忽略自己下一步的存活路径。</span></div>
                    <div className="flex gap-2"><span className="mt-[8px] h-1.5 w-1.5 shrink-0 rounded-none bg-pixel-orange"></span><span>不要在已经危险的路线里继续贪更多分。</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Rule Values */}
            <div className="pixel-panel border-2 border-cream-800 bg-gradient-to-b from-cream-200 to-cream-300 p-6 text-cream-900 shadow-[0_20px_40px_rgba(77,55,21,0.14)]">
              <div className="text-lg font-black uppercase tracking-[0.08em]">规则数值</div>
              <div className="grid gap-3 md:grid-cols-2 mt-4">
                <div className="rounded-[20px] border-2 border-cream-600 bg-cream-100 p-4">
                  <div className="text-[11px] font-black uppercase tracking-[0.14em]">道具</div>
                  <div className="mt-3 space-y-2 text-sm font-bold leading-6 text-cream-800">
                    <div>食物：+1 分，蛇长度 +1</div>
                    <div>金币：+3 分（直接加）</div>
                    <div>护盾：+2 分并挡 1 次碰撞</div>
                    <div>加速：+2 分并移动更快 8 tick</div>
                  </div>
                </div>
                <div className="rounded-[20px] border-2 border-cream-600 bg-cream-100 p-4">
                  <div className="text-[11px] font-black uppercase tracking-[0.14em]">存活与排名奖励</div>
                  <div className="mt-3 space-y-2 text-sm font-bold leading-6 text-cream-800">
                    <div>存活奖励：存活的蛇均得 3 分</div>
                    <div>第 1 名额外：+3 分（2人局除外）</div>
                    <div>其余名次：+0 分</div>
                    <div>提前死亡：-10 分</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Score Guide Sidebar */}
          <div className="min-w-0 xl:sticky xl:top-6">
            <div className="pixel-panel border-2 border-cream-800 bg-gradient-to-b from-cream-200 to-cream-300 text-cream-900 shadow-[0_20px_40px_rgba(77,55,21,0.14)]">
              <div className="space-y-4 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-lg font-black uppercase tracking-[0.08em]">游戏积分介绍</div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-cream-700">规则页与结果页、观战页保持同一套高分导向表达。</div>
                  </div>
                </div>

                {/* Item scores */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <div className="text-[11px] font-black uppercase tracking-[0.14em]">道具得分</div>
                    <div className="rounded-full bg-cream-300 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-cream-700">items</div>
                  </div>
                  <div className="space-y-1">
                    {[
                      { name: "食物", color: "#ffe3d0", border: "#8b5128", item: "#ff8d6a", score: "+1", desc: "吃到就加 1 分并长 1 格", sub: "稳定拿分，适合持续发育。" },
                      { name: "金币", color: "#fff3b0", border: "#6f5312", item: "#ffe681", score: "+3", desc: "吃到就直接加 3 分", sub: "冲单场高分的关键资源。" },
                      { name: "护盾", color: "#dff3d8", border: "#345b2a", item: "#dff3d8", score: "+2", desc: "吃到加 2 分并挡 1 次碰撞", sub: "保护高分局，延长存活价值。" },
                      { name: "加速", color: "#d7f0ff", border: "#2f5266", item: "#bfeaff", score: "+2", desc: "吃到加 2 分并暂时移动更快", sub: "抢资源和脱困更强，但更考验控线。" },
                    ].map((item) => (
                      <div key={item.name} className="rounded-[14px] px-2 py-1.5 text-[11px] font-black leading-none" style={{ background: item.color, color: item.border }}>
                        <div className="flex items-center gap-2">
                          <div className="relative h-4.5 w-4.5 shrink-0 border shadow-[1px_1px_0_rgba(59,42,25,0.12)]" style={{ background: item.item, borderColor: item.border }} />
                          <div className="min-w-0 w-14 shrink-0">{item.name}</div>
                          <div className="min-w-0 flex-1 text-[10px] font-bold opacity-85">{item.desc}</div>
                          <div className="shrink-0 rounded-full bg-white/55 px-1.5 py-[2px] text-[9px] font-black uppercase tracking-[0.08em] leading-none">{item.score}</div>
                        </div>
                        <div className="mt-1 text-[9px] font-black uppercase tracking-[0.08em] opacity-70">{item.sub}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action scores */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <div className="text-[11px] font-black uppercase tracking-[0.14em]">行为得分</div>
                    <div className="rounded-full bg-cream-300 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-cream-700">actions</div>
                  </div>
                  <div className="space-y-1">
                    <div className="rounded-[14px] px-2 py-1.5 bg-green-50 text-green-800">
                      <div className="flex items-center gap-2">
                        <div className="min-w-0 w-16 shrink-0 text-[11px] font-black leading-none">活到最后</div>
                        <div className="min-w-0 flex-1 text-[10px] font-bold opacity-85">比赛结束时存活的蛇均得 3 分</div>
                        <div className="shrink-0 rounded-full bg-white/55 px-1.5 py-[2px] text-[9px] font-black uppercase tracking-[0.08em] leading-none">+3</div>
                      </div>
                    </div>
                    <div className="rounded-[14px] px-2 py-1.5 bg-red-50 text-red-800">
                      <div className="flex items-center gap-2">
                        <div className="min-w-0 w-16 shrink-0 text-[11px] font-black leading-none">提前死亡</div>
                        <div className="min-w-0 flex-1 text-[10px] font-bold opacity-85">比赛结束前死亡的蛇扣 10 分</div>
                        <div className="shrink-0 rounded-full bg-white/55 px-1.5 py-[2px] text-[9px] font-black uppercase tracking-[0.08em] leading-none">-10</div>
                      </div>
                    </div>
                    <div className="rounded-[14px] px-2 py-1.5 bg-orange-50 text-orange-800">
                      <div className="flex items-center gap-2">
                        <div className="min-w-0 w-16 shrink-0 text-[11px] font-black leading-none">第一名额外</div>
                        <div className="min-w-0 flex-1 text-[10px] font-bold opacity-85">排名第1的蛇额外再得 3 分</div>
                        <div className="shrink-0 rounded-full bg-white/55 px-1.5 py-[2px] text-[9px] font-black uppercase tracking-[0.08em] leading-none">+3</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
