// app/api/vision/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req) {
  const t0 = Date.now();
  console.log("[VISION] start", t0);

  try {
    const {
      imageUrl,      // 인터넷 이미지 URL
      prompt,        // 공통 프롬프트
      imageBase64,   // 업로드 이미지 (data URL or 순수 base64)
      mimeType,      // 업로드 이미지 MIME 타입
    } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: true, message: "prompt는 필수입니다." }),
        { status: 400 }
      );
    }

    let inlineData = null;

    // 1) 업로드된 이미지가 있으면 그걸 우선 사용
    if (imageBase64) {
      let base64Data = imageBase64.trim();

      // "data:image/png;base64,...." 형태라면 콤마 뒤만 추출
      const commaIndex = base64Data.indexOf(",");
      if (commaIndex !== -1) {
        base64Data = base64Data.substring(commaIndex + 1);
      }

      inlineData = {
        mimeType: mimeType || "image/png",
        data: base64Data,
      };
      console.log("[VISION] using uploaded image");
    }
    // 2) 아니면 imageUrl로 다운로드해서 사용
    else if (imageUrl) {
      console.log("[VISION] fetch image from url:", imageUrl);

      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) {
        throw new Error(`이미지 다운로드 실패: HTTP ${imgRes.status}`);
      }

      const arrayBuf = await imgRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);
      const base64 = buffer.toString("base64");
      const contentType = imgRes.headers.get("content-type") || "image/jpeg";

      inlineData = {
        mimeType: contentType,
        data: base64,
      };
    } else {
      return new Response(
        JSON.stringify({
          error: true,
          message: "imageUrl 또는 imageBase64 중 하나는 반드시 필요합니다.",
        }),
        { status: 400 }
      );
    }

    // 3) Gemini 비전 모델 호출
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite", // 또는 "gemini-1.5-flash"
    });

    const parts = [
      { text: prompt },
      {
        inlineData,
      },
    ];

    const result = await model.generateContent({
      contents: [{ role: "user", parts }],
    });

    const text = result.response.text();

    console.log("[VISION] ok in", Date.now() - t0, "ms");
    return Response.json({ answer: text });
  } catch (e) {
    const info = {
      code: e?.cause?.code || e?.code || null,
      name: e?.name,
      message: e?.message,
    };
    console.error("[VISION] ERR", info, e?.stack);
    return new Response(JSON.stringify({ error: true, ...info }), {
      status: 500,
    });
  }
}
