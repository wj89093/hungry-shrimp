import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

export const GET = () => {
  try {
    const filePath = join(process.cwd(), "public", "skill.md");
    const content = readFileSync(filePath, "utf-8");
    return new NextResponse(content, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": "attachment; filename=\"skill.md\"",
      },
    });
  } catch {
    return NextResponse.json({ error: "skill.md not found" }, { status: 404 });
  }
};
