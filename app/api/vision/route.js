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
      imageUrl,      // 단일 URL
      prompt,        // 공통 프롬프트
      imageBase64,   // 단일 업로드 이미지
      mimeType,      // 단일 업로드 MIME 타입
      images,        // 여러 이미지: [{ imageBase64, mimeType }, ...]
    } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: true, message: "prompt는 필수입니다." }),
        { status: 400 }
      );
    }

    let inlineData = null;        // 단일 이미지용
    let inlineDataList = null;    // 여러 이미지용

    // 0) 여러 이미지가 들어온 경우 우선 처리
    if (Array.isArray(images) && images.length > 0) {
      console.log("[VISION] multiple images:", images.length);
      inlineDataList = images
        .map((img, idx) => {
          if (!img || !img.imageBase64) return null;

          let base64 = String(img.imageBase64).trim();
          const commaIndex = base64.indexOf(",");
          if (commaIndex !== -1) {
            base64 = base64.substring(commaIndex + 1);
          }

          const mt =
            img.mimeType ||
            guessMimeFromDataUrl(img.imageBase64) ||
            "image/png";

          return {
            mimeType: mt,
            data: base64,
          };
        })
        .filter(Boolean);

      if (!inlineDataList.length) {
        throw new Error("images 배열에서 유효한 이미지를 찾지 못했습니다.");
      }
    }

    // 1) 업로드된 단일 이미지가 있으면 그걸 사용
    else if (imageBase64) {
      let base64Data = imageBase64.trim();

      const commaIndex = base64Data.indexOf(",");
      if (commaIndex !== -1) {
        base64Data = base64Data.substring(commaIndex + 1);
      }

      inlineData = {
        mimeType:
          mimeType || guessMimeFromDataUrl(imageBase64) || "image/png",
        data: base64Data,
      };
      console.log("[VISION] using uploaded single image");
    }

    // 2) 아니면 imageUrl로 다운로드
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
          message:
            "imageUrl, imageBase64 또는 images 중 하나는 반드시 필요합니다.",
        }),
        { status: 400 }
      );
    }

    // 3) Gemini 비전(멀티모달) 모델 호출
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite", // 또는 "gemini-1.5-flash"
    });

    const parts = [{ text: prompt }];

    if (inlineDataList && inlineDataList.length > 0) {
      // 여러 이미지: 텍스트 뒤에 이미지들을 순서대로 붙이기
      for (const d of inlineDataList) {
        parts.push({ inlineData: d });
      }
    } else if (inlineData) {
      // 단일 이미지
      parts.push({ inlineData });
    }

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

function guessMimeFromDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== "string") return null;
  if (!dataUrl.startsWith("data:")) return null;
  const semi = dataUrl.indexOf(";");
  if (semi === -1) return null;
  return dataUrl.substring(5, semi) || null;
}
