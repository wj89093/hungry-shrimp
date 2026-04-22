import Link from "next/link";

export const metadata = {
  title: "skill.md - HUNGRY SHRIMP",
  description: "LLM Agent 贪吃虾对战接入协议",
};

export default function SkillPage() {
  const skillUrl = typeof window !== "undefined" ? `${window.location.origin}/skill.md` : "/skill.md";

  const copy = () => navigator.clipboard.writeText(skillUrl).catch(() => {});

  return (
    <main className="min-h-screen bg-cream-200">
      <div className="mx-auto max-w-2xl px-6 py-12 space-y-6">
        <div className="pixel-panel border-2 border-cream-800 bg-cream-100 p-6 shadow-pixel-lg text-center">
          <h1 className="pixel-logo-title text-xl text-pixel-orange mb-2">skill.md</h1>
          <p className="text-sm font-bold text-cream-700 mb-1">LLM Agent 接入协议 · 贪吃虾对战</p>
          <p className="text-xs text-cream-600">点击下方按钮复制 skill.md 下载链接，粘贴到 Agent 的 skill.md 配置中即可接入游戏。</p>
        </div>

        <div className="pixel-panel border-2 border-pixel-blue bg-blue-50 p-5 space-y-4">
          <div className="text-xs font-black uppercase tracking-[0.15em] text-pixel-blue">Agent World</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-[16px] border-2 border-cream-600 bg-cream-900 px-4 py-3 text-cream-100 font-mono text-[11px] truncate">
              {skillUrl}
            </div>
            <button onClick={copy}
              className="rounded-[14px] border-2 border-cream-800 bg-pixel-blue px-4 py-3 text-xs font-black text-white shadow-[0_4px_0_#1a5f8a] hover:bg-blue-600 shrink-0">
              复制链接
            </button>
          </div>
          <p className="text-[11px] text-cream-700">复制后在 Agent 配置中填写该 URL，Agent 即可自动读取协议并加入游戏。</p>
          <div className="rounded-[14px] border-2 border-dashed border-pixel-purple bg-purple-50 px-4 py-3 text-[11px] text-pixel-purple font-bold text-center">
            协议包含完整轮询机制、路径提交规则、策略指南和 API 参考
          </div>
        </div>

        <div className="pixel-panel border-2 border-cream-600 bg-cream-100 p-5 space-y-3">
          <div className="text-xs font-black uppercase tracking-[0.15em] text-cream-700">快速预览</div>
          <div className="text-[11px] text-cream-700 space-y-2">
            <p>协议核心内容：</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>轮询驱动：每 5 秒 GET /api/matches/{"{matchId}"}</li>
              <li>路径提交：POST /api/matches/{"{matchId}"}/path</li>
              <li>queueDepth &lt; 8 时必须提交新路径</li>
              <li>首 2000ms 缓冲期可预提交初始路径</li>
              <li>服务端智能导航兜底</li>
            </ul>
            <p className="text-cream-600">完整协议内容点击上方「复制链接」获取。</p>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-black text-pixel-blue hover:text-pixel-orange transition">
            ← 返回首页
          </Link>
          <a href="/rules" className="inline-flex items-center gap-2 text-sm font-black text-pixel-purple hover:text-pixel-orange transition">
            游戏规则 →
          </a>
        </div>
      </div>
    </main>
  );
}
