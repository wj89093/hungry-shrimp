// ============================================================
// WebSocket Manager — Real-time game state broadcasting
// ============================================================

import { WebSocketServer, WebSocket } from "ws";
import { GameEngineImpl } from "../lib/game-engine.js";

interface WsClient {
  ws: WebSocket;
  type: "spectator" | "player" | "agent";
  matchId?: string;
  agentId?: string;
}

export class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WsClient> = new Map();
  private clientIdCounter = 0;

  attach(server: any) {
    this.wss = new WebSocketServer({ server, path: "/ws" });

    this.wss.on("connection", (ws, req) => {
      const clientId = `ws_${++this.clientIdCounter}`;
      const client: WsClient = { ws, type: "spectator" };
      this.clients.set(clientId, client);

      console.log(`[WS] Client connected: ${clientId}, total: ${this.clients.size}`);

      ws.on("message", (data) => {
        try {
          const msg = JSON.parse(data.toString());
          this.handleMessage(clientId, msg);
        } catch {
          ws.send(JSON.stringify({ error: "Invalid JSON" }));
        }
      });

      ws.on("close", () => {
        this.clients.delete(clientId);
        console.log(`[WS] Client disconnected: ${clientId}, total: ${this.clients.size}`);
      });

      ws.on("error", (err) => {
        console.error(`[WS] Error for ${clientId}:`, err.message);
      });

      // Send welcome
      ws.send(JSON.stringify({ type: "connected", clientId }));
    });
  }

  private handleMessage(clientId: string, msg: any) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (msg.type) {
      case "subscribe":
        // Subscribe to a match: { type: "subscribe", matchId: "..." }
        if (msg.matchId) {
          client.matchId = msg.matchId;
          client.type = msg.agentId ? "player" : "spectator";
          if (msg.agentId) client.agentId = msg.agentId;
          client.ws.send(JSON.stringify({ type: "subscribed", matchId: msg.matchId }));
        }
        break;

      case "unsubscribe":
        client.matchId = undefined;
        client.agentId = undefined;
        client.type = "spectator";
        break;

      case "ping":
        client.ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
        break;
    }
  }

  // Broadcast game state to all subscribers of a match
  broadcastMatch(matchId: string, state: any) {
    const msg = JSON.stringify({
      type: "matchUpdate",
      matchId,
      timestamp: Date.now(),
      data: state,
    });

    let sent = 0;
    for (const [, client] of this.clients) {
      if (client.matchId === matchId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(msg);
        sent++;
      }
    }
    // console.log(`[WS] Broadcast match ${matchId} to ${sent} clients`);
  }

  // Broadcast room list update
  broadcastLobby(rooms: any[]) {
    const msg = JSON.stringify({
      type: "lobbyUpdate",
      timestamp: Date.now(),
      data: { rooms },
    });

    for (const [, client] of this.clients) {
      if (!client.matchId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(msg);
      }
    }
  }

  // Notify match start/end
  broadcastMatchEvent(matchId: string, event: string, data?: any) {
    const msg = JSON.stringify({
      type: "matchEvent",
      matchId,
      event,
      timestamp: Date.now(),
      data,
    });

    for (const [, client] of this.clients) {
      if (client.matchId === matchId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(msg);
      }
    }
  }

  getStats() {
    return {
      totalClients: this.clients.size,
      spectators: Array.from(this.clients.values()).filter((c) => c.type === "spectator").length,
      players: Array.from(this.clients.values()).filter((c) => c.type === "player").length,
    };
  }
}

export const wsManager = new WebSocketManager();
