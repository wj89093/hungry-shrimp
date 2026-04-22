import { NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3003";

export async function GET(request: Request, { params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agentId");
  
  try {
    const url = agentId 
      ? `${API_BASE}/api/matches/${matchId}?agentId=${agentId}`
      : `${API_BASE}/api/matches/${matchId}`;
    const res = await fetch(url);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ success: false, error: "Server offline" }, { status: 503 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  try {
    const body = await request.json();
    const res = await fetch(`${API_BASE}/api/matches/${matchId}/path`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ success: false, error: "Server offline" }, { status: 503 });
  }
}
