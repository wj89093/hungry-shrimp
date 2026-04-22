"use client";

import { useEffect, useRef } from "react";
import { Frame, ItemType, Direction, Snake } from "@/lib/types";

const CELL_SIZE = 10;
const MAP_W = 50;
const MAP_H = 50;

const SNAKE_COLORS = [
  "#ff6b35",
  "#4da3c7",
  "#96cf8a",
  "#c96f2d",
  "#a08cb8",
];

const ITEM_COLORS: Record<ItemType, string> = {
  food: "#ff8d6a",
  coin: "#ffe681",
  shield: "#dff3d8",
  speed_boost: "#bfeaff",
};

const ITEM_BORDER: Record<ItemType, string> = {
  food: "#cf3e31",
  coin: "#8a6412",
  shield: "#25492a",
  speed_boost: "#20495a",
};

interface GameCanvasProps {
  frame: Frame | null;
  width?: number;
  height?: number;
  showGrid?: boolean;
  highlightAgentId?: string;
  currentTick?: number;
}

export default function GameCanvas({
  frame,
  width = 500,
  height = 500,
  showGrid = false,
  highlightAgentId,
  currentTick = 0,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scale = width / (MAP_W * CELL_SIZE);
    canvas.width = width;
    canvas.height = height;

    // Background
    ctx.fillStyle = "#1a2a1a";
    ctx.fillRect(0, 0, width, height);

    // Grid
    if (showGrid) {
      ctx.strokeStyle = "#2a3a2a";
      ctx.lineWidth = 0.5;
      for (let x = 0; x <= MAP_W; x++) {
        ctx.beginPath();
        ctx.moveTo(x * CELL_SIZE * scale, 0);
        ctx.lineTo(x * CELL_SIZE * scale, height);
        ctx.stroke();
      }
      for (let y = 0; y <= MAP_H; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * CELL_SIZE * scale);
        ctx.lineTo(width, y * CELL_SIZE * scale);
        ctx.stroke();
      }
    }

    if (!frame) return;

    // Draw items
    for (const item of frame.items) {
      const x = item.position.x * CELL_SIZE * scale;
      const y = item.position.y * CELL_SIZE * scale;
      const sz = CELL_SIZE * scale;

      ctx.fillStyle = ITEM_COLORS[item.type];
      ctx.strokeStyle = ITEM_BORDER[item.type];
      ctx.lineWidth = 1;

      if (item.type === "shield") {
        ctx.beginPath();
        ctx.arc(x + sz / 2, y + sz / 2, sz / 2 - 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (item.type === "speed_boost") {
        ctx.fillStyle = ITEM_COLORS[item.type];
        ctx.beginPath();
        ctx.moveTo(x + sz * 0.5, y + 1);
        ctx.lineTo(x + sz * 0.8, y + sz * 0.4);
        ctx.lineTo(x + sz * 0.6, y + sz * 0.5);
        ctx.lineTo(x + sz * 0.9, y + sz - 1);
        ctx.lineTo(x + sz * 0.5, y + sz * 0.65);
        ctx.lineTo(x + sz * 0.65, y + sz * 0.5);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillRect(x + 1, y + 1, sz - 2, sz - 2);
        ctx.strokeRect(x + 1, y + 1, sz - 2, sz - 2);
      }
    }

    // Draw snakes
    for (let si = 0; si < frame.snakes.length; si++) {
      const snake = frame.snakes[si];
      const color = SNAKE_COLORS[si % SNAKE_COLORS.length];
      const isHighlighted = snake.agentId === highlightAgentId;
      const segSize = CELL_SIZE * scale;

      for (let bi = 0; bi < snake.body.length; bi++) {
        const segment = snake.body[bi];
        const x = segment.x * CELL_SIZE * scale;
        const y = segment.y * CELL_SIZE * scale;
        const sz = segSize;

        if (bi === 0) {
          // Head
          ctx.fillStyle = isHighlighted ? "#fff" : color;
          ctx.shadowColor = isHighlighted ? "#fff" : color;
          ctx.shadowBlur = isHighlighted ? 8 : 4;
          ctx.fillRect(x, y, sz, sz);
          ctx.shadowBlur = 0;

          // Eyes
          const eyeSize = sz * 0.2;
          const eyeOff = sz * 0.2;
          ctx.fillStyle = "#333";
          if (snake.direction === "right") {
            ctx.fillRect(x + sz - eyeOff - eyeSize, y + eyeOff, eyeSize, eyeSize);
            ctx.fillRect(x + sz - eyeOff - eyeSize, y + sz - eyeOff - eyeSize, eyeSize, eyeSize);
          } else if (snake.direction === "left") {
            ctx.fillRect(x + eyeOff, y + eyeOff, eyeSize, eyeSize);
            ctx.fillRect(x + eyeOff, y + sz - eyeOff - eyeSize, eyeSize, eyeSize);
          } else if (snake.direction === "up") {
            ctx.fillRect(x + eyeOff, y + eyeOff, eyeSize, eyeSize);
            ctx.fillRect(x + sz - eyeOff - eyeSize, y + eyeOff, eyeSize, eyeSize);
          } else {
            ctx.fillRect(x + eyeOff, y + sz - eyeOff - eyeSize, eyeSize, eyeSize);
            ctx.fillRect(x + sz - eyeOff - eyeSize, y + sz - eyeOff - eyeSize, eyeSize, eyeSize);
          }

          // Shield indicator
          if (snake.hasShield) {
            ctx.strokeStyle = "#4f8a4f";
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 1, y + 1, sz - 2, sz - 2);
          }

          // Speed boost indicator
          if (snake.speedBoostTicks && snake.speedBoostTicks > 0) {
            ctx.strokeStyle = "#4da3c7";
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 2, y + 2, sz - 4, sz - 4);
          }
        } else {
          // Body
          ctx.fillStyle = bi % 2 === 0 ? color : `${color}cc`;
          ctx.fillRect(x, y, sz, sz);
        }
      }

      // Score label
      if (snake.isAlive) {
        const head = snake.body[0];
        const lx = head.x * CELL_SIZE * scale + segSize;
        const ly = head.y * CELL_SIZE * scale - 2;
        ctx.fillStyle = "#fff";
        ctx.font = `bold ${Math.floor(8 * scale)}px monospace`;
        ctx.fillText(`${snake.score}`, lx, ly);
      }
    }
  }, [frame, width, height, showGrid, highlightAgentId, currentTick]);

  return (
    <canvas
      ref={canvasRef}
      style={{ imageRendering: "pixelated", borderRadius: "8px", border: "2px solid #6c5a3c" }}
    />
  );
}
