// app/api/vision-quiz/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * 요청 바디 형식:
 * {
 *   imageBase64: "data:image/png;base64,...." 또는 순수 base64,
 *   mimeType: "image/png",
 *   level: "beginner" | "intermediate" | "advanced",
 *   numQuestions: 3
 * }
 */
export async function POST(req) {
  const started = Date.now();
  console.log("[VISION_QUIZ] start", started);

  try {
    const body = await req.json();
    let { imageBase64, mimeType, imageUrl, level, numQuestions } = body;

    level = level || "beginner";
    numQuestions = numQuestions || 3;

    if (!imageBase64 && !imageUrl) {
      return new Response(
        JSON.stringify({
          error: true,
          message: "imageBase64 또는 imageUrl 중 하나는 필수입니다.",
        }),
        { status: 400 }
      );
    }

    // 1) inlineData 만들기 (업로드 우선)
    let inlineData = null;

    if (imageBase64) {
      let base64 = imageBase64.trim();
      const commaIndex = base64.indexOf(",");
      if (commaIndex !== -1) {
        base64 = base64.substring(commaIndex + 1);
      }

      inlineData = {
        mimeType: mimeType || guessMimeFromDataUrl(imageBase64) || "image/png",
        data: base64,
      };
      console.log("[VISION_QUIZ] using uploaded image");
    } else if (imageUrl) {
      console.log("[VISION_QUIZ] fetch image from url:", imageUrl);
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) {
        throw new Error(`이미지 다운로드 실패: HTTP ${imgRes.status}`);
      }
      const arr = await imgRes.arrayBuffer();
      const buf = Buffer.from(arr);
      const base64 = buf.toString("base64");
      const contentType = imgRes.headers.get("content-type") || "image/jpeg";

      inlineData = {
        mimeType: contentType,
        data: base64,
      };
    }

    if (!inlineData) {
      throw new Error("inlineData 생성에 실패했습니다.");
    }

    // 2) 프롬프트(문제 생성 규칙)
    const instruction = `
You are an English teacher.
Create ${numQuestions} multiple-choice questions in ENGLISH based on the image.

Rules:
- Return ONLY a JSON array. No explanation, no extra text.
- Format:
[
  {
    "question": "What is the boy doing?",
    "options": ["Running", "Sleeping", "Eating", "Reading"],
    "answerIndex": 0
  }
]
- "question" and "options" must be written in English.
- "options" must have exactly 4 items.
- "answerIndex" is an integer 0-3 indicating the correct option.
- Do NOT include any comments, backticks, markdown, or additional fields.
- Difficulty level: ${level}.
`;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite", // 또는 "gemini-1.5-flash"
    });

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: instruction }, { inlineData }],
        },
      ],
    });

    const raw = result.response.text();
    console.log("[VISION_QUIZ] raw:", raw);

    const jsonText = cleanupToJson(raw);
    let quizzes = null;
    let parseError = null;

    try {
      quizzes = JSON.parse(jsonText);
      if (!Array.isArray(quizzes)) {
        throw new Error("JSON 형식이 배열이 아닙니다.");
      }
    } catch (e) {
      console.error("[VISION_QUIZ] JSON parse error", e);
      parseError = e?.message || String(e);
    }

    console.log("[VISION_QUIZ] done in", Date.now() - started, "ms");

    return Response.json({
      error: false,
      quizzes,
      raw, // 디버깅용 원본 텍스트
      parseError,
    });
  } catch (e) {
    const info = {
      code: e?.cause?.code || e?.code || null,
      name: e?.name,
      message: e?.message,
    };
    console.error("[VISION_QUIZ] ERR", info, e?.stack);
    return new Response(JSON.stringify({ error: true, ...info }), {
      status: 500,
    });
  }
}

function cleanupToJson(text) {
  if (!text) return "[]";
  let t = text.trim();

  // ```json ... ``` 같은 코드블럭 제거
  t = t.replace(/```json/gi, "").replace(/```/g, "").trim();

  // 앞뒤에 이상한 설명 문장 있으면, 첫 "["부터 마지막 "]"까지만 추출
  const firstBracket = t.indexOf("[");
  const lastBracket = t.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    t = t.substring(firstBracket, lastBracket + 1);
  }

  return t.trim();
}

function guessMimeFromDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== "string") return null;
  if (!dataUrl.startsWith("data:")) return null;
  const semi = dataUrl.indexOf(";");
  if (semi === -1) return null;
  return dataUrl.substring(5, semi) || null;
}
