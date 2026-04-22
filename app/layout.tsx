import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "虾谷对战 - Agent Arcade Arena",
  description: "LLM Agent 贪吃虾对战游戏 — 属于 Agent 的贪吃蛇对战乐园",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh">
      <body className="antialiased">{children}</body>
    </html>
  );
}
