export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ===== 프롬프트 =====
const SYSTEM = `You are a professional research summarizer.
- Output in Korean.
- Keep numbers, names, and key terms faithful to the source.
- Be concise, factual, and structured.`;

const CHUNK_USER = (chunk) => `
${SYSTEM}

다음 본문을 7문장 이내로 구조화 요약하세요.
형식:
- 배경/문제
- 방법
- 결과/핵심 수치
- 결론/시사점

본문:
"""${chunk}"""`;

const MERGE_USER = (partials) => `
${SYSTEM}

여러 청크 요약을 하나로 통합하세요.
형식:
1) 핵심 요지(3~5문장)
2) 주요 수치·사실 목록(불릿)
3) 한계/주의사항(있다면 1~3개)
4) 실무 적용 포인트 3가지

청크 요약:
${partials.map((p, i) => `[${i + 1}] ${p}`).join("\n\n")}`;

// ===== Gemini 호출 유틸 (문자열 모드) =====
async function genText(model, prompt) {
  const r = await model.generateContent(prompt); // ✅ 문자열만 전달
  // SDK 버전에 따라 text()가 함수/문자열이 섞일 수 있어 안전 처리
  const t = r?.response?.text?.() ?? r?.response?.text ?? "";
  return typeof t === "function" ? t() : String(t);
}

export async function POST(req) {
  try {
    const { chunks } = await req.json();
    if (!Array.isArray(chunks) || chunks.length === 0) {
      return NextResponse.json({ error: "chunks가 비어 있습니다." }, { status: 400 });
    }
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY 누락" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // 먼저 안정 모델로 통신 확인 (필요 시 "gemini-2.5-flash"로 교체)
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { temperature: 0.2 },
    });

    // Map
    const partials = [];
    for (let i = 0; i < chunks.length; i++) {
      const s = await genText(model, CHUNK_USER(chunks[i]));
      partials.push(s);
    }

    // Reduce
    const finalSummary = await genText(model, MERGE_USER(partials));

    return NextResponse.json({ partials, finalSummary });
  } catch (e) {
    console.error("[/api/summarize]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// 선택: 헬스 체크
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "summarize" });
}
