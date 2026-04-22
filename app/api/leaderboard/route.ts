import { NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3003";

export async function GET() {
  try {
    const res = await fetch(`${API_BASE}/api/leaderboard`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ success: false, error: "Server offline" }, { status: 503 });
  }
}
