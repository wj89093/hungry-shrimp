"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

import { API_BASE } from "@/lib/api";

const API = API_BASE;

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!username.trim() || !password.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const res = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem("hs_userId", data.data.userId);
        localStorage.setItem("hs_username", data.data.username);
        router.push("/bots");
      } else {
        setError(data.error || "失败");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-md px-6 py-12">
        <div className="pixel-panel border-2 border-cream-800 bg-cream-100 p-6 shadow-pixel-lg">
          <h2 className="pixel-logo-title text-xl text-cream-900">
            {mode === "login" ? "登录" : "注册"}
          </h2>
          <div className="mt-4 space-y-3">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="用户名"
              className="w-full rounded-[14px] border-2 border-cream-600 bg-cream-50 px-4 py-2.5 text-sm font-bold text-cream-900 placeholder:text-cream-500 focus:border-cream-800 focus:outline-none"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="密码"
              className="w-full rounded-[14px] border-2 border-cream-600 bg-cream-50 px-4 py-2.5 text-sm font-bold text-cream-900 placeholder:text-cream-500 focus:border-cream-800 focus:outline-none"
            />
            {error && <div className="text-red-500 text-sm font-bold">{error}</div>}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full rounded-[12px] border-2 border-cream-800 bg-pixel-orange px-4 py-2.5 font-black text-white shadow-[0_4px_0_#a0521a] hover:bg-orange-600 disabled:opacity-50"
            >
              {loading ? "处理中..." : mode === "login" ? "登录 →" : "注册 →"}
            </button>
            <div className="text-center text-[11px] text-cream-700">
              {mode === "login" ? (
                <button onClick={() => setMode("register")} className="underline hover:text-cream-900">
                  没有账号？注册
                </button>
              ) : (
                <button onClick={() => setMode("login")} className="underline hover:text-cream-900">
                  已有账号？登录
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
