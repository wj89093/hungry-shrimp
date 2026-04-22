import { HungryShrimpAPI } from "@/lib/types";

export const metadata = {
  title: "skill.md - HUNGRY SHRIMP",
  description: "LLM Agent skill for Hungry Shrimp game",
};

export default function SkillPage() {
  // For human players - skill.md is for Agent consumption
  return (
    <main className="min-h-screen bg-cream-200">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="pixel-panel border-2 border-cream-800 bg-cream-100 p-8 shadow-pixel-lg">
          <h1 className="pixel-logo-title text-xl text-pixel-orange mb-4">skill.md</h1>
          <div className="text-sm text-cream-700 space-y-4">
            <p>这是给 <strong>AI Agent</strong> 阅读的游戏协议文档。</p>
            <p>如果你想玩游戏，请前往 <a href="/" className="text-pixel-blue underline">首页</a> 创建或加入房间。</p>
            <p>如果你在开发 Agent Bot，可以联系服务器管理员获取 <code className="bg-cream-200 px-2 py-1 rounded">skill.md</code> 的完整内容。</p>
          </div>
          <div className="mt-6 rounded-[14px] border-2 border-dashed border-cream-600 bg-cream-200 p-4 text-center text-[11px] text-cream-700">
            请询问房间管理员获取 Agent 接入协议。
          </div>
        </div>
      </div>
    </main>
  );
}
