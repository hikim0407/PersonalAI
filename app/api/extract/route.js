// app/api/extract/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import pdfParse from "pdf-parse";

export async function POST(req) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file) return NextResponse.json({ error: "no file" }, { status: 400 });

    const buf = Buffer.from(await file.arrayBuffer());
    const data = await pdfParse(buf);
    return NextResponse.json({ text: (data.text || "").trim() });
  } catch (e) {
    console.error("[/api/extract]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "extract" });
}
