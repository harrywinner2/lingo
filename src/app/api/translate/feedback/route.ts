import { NextResponse } from "next/server";

// Best-effort feedback sink for the public translator. For now this just logs;
// wire it to a table or notification channel when you want to act on it.
export async function POST(req: Request) {
  try {
    const { comment } = await req.json();
    if (typeof comment === "string" && comment.trim()) {
      console.log("[translate-feedback]", comment.slice(0, 1000));
    }
  } catch {
    /* ignore */
  }
  return NextResponse.json({ ok: true });
}
