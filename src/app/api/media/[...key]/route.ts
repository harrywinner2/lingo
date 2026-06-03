import { NextResponse } from "next/server";
import { getObject } from "@/lib/storage";

const TYPES: Record<string, string> = {
  webm: "audio/webm",
  m4a: "audio/mp4",
  ogg: "audio/ogg",
  wav: "audio/wav",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key } = await params;
  const path = key.join("/");
  try {
    const buf = await getObject(path);
    const ext = path.split(".").pop() ?? "";
    const body = new Uint8Array(buf);
    return new NextResponse(body, {
      headers: {
        "Content-Type": TYPES[ext] ?? "application/octet-stream",
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
