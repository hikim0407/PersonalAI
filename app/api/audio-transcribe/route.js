export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

async function genText(model, promptParts) {
  const r = await model.generateContent({ contents: [{ role: "user", parts: promptParts }] });
  const t = r?.response?.text?.() ?? r?.response?.text ?? "";
  return typeof t === "function" ? t() : String(t);
}

export async function POST(req) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY 환경변수가 필요합니다." }, { status: 500 });
    }

    const input = await req.formData();
    const audio = input.get("audio");
    const language = (input.get("language") || "ko").toString(); // 기본 한국어
    if (!audio || typeof audio === "string") {
      return NextResponse.json({ error: "'audio' 파일을 multipart/form-data로 전송해 주세요." }, { status: 400 });
    }

    // 파일 바이트 → base64 인라인 데이터로 변환
    const arrayBuf = await audio.arrayBuffer();
    const bytes = Buffer.from(arrayBuf);
    const base64 = bytes.toString("base64");
    const mimeType = audio.type || "audio/webm";

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      generationConfig: { temperature: 0.0 },
    });

    const instruction = `You are a transcription system. Transcribe the following audio and output plain text in ${language}. Do not add commentary.`;
    const parts = [
      { text: instruction },
      { inlineData: { mimeType, data: base64 } },
    ];

    const transcript = await genText(model, parts);
    return NextResponse.json({ transcript });
  } catch (e) {
    console.error("[/api/audio-transcribe]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "audio-transcribe", provider: "gemini" });
}
