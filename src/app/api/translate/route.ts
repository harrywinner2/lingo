import { NextResponse } from "next/server";
import { translate } from "@/lib/translate";

export async function POST(req: Request) {
  let body: { text?: string; models?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const text = (body.text ?? "").trim();
  const models = Array.isArray(body.models) ? body.models : [];

  if (!text) return NextResponse.json({ error: "Nothing to translate" }, { status: 400 });
  if (text.length > 2000)
    return NextResponse.json({ error: "Text too long" }, { status: 413 });
  if (models.length === 0)
    return NextResponse.json(
      { error: "No translation path between those languages" },
      { status: 400 },
    );

  try {
    const output = await translate(text, models, 45000);
    return NextResponse.json({ output });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Translation failed";
    return NextResponse.json(
      { error: msg === "timeout" ? "The translation server didn't respond." : msg },
      { status: 504 },
    );
  }
}
