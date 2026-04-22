import { readFileSync } from "fs";
import { join } from "path";

export async function GET() {
  const filePath = join(process.cwd(), "public", "skill.md");
  const content = readFileSync(filePath, "utf-8");
  return new Response(content, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": "attachment; filename=\"skill.md\"",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
