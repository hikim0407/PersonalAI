export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req) {
    const t0 = Date.now();
    console.log("[ASK] start", t0);

    try {
        const { message, history = [], system } = await req.json();
        console.log("[ASK] payload", { messageLen: (message||"").length, hist: history.length });

        // 히스토리: 첫 user 이전은 제거 (Gemini 요구사항)
        const firstUser = history.findIndex(h => h?.role === "user");
        const trimmed = firstUser === -1 ? [] : history.slice(firstUser);
        const apiHistory = trimmed.map(h => ({ role: h.role, parts: [{ text: h.text ?? "" }] }));

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            ...(system ? { systemInstruction: system } : {}),
        });

        const chat = model.startChat({ history: apiHistory });
        const result = await chat.sendMessage(message);
        const text = result.response.text();

        console.log("[ASK] ok in", Date.now() - t0, "ms");
        return Response.json({ answer: text });
    } catch (e) {
        const info = {
            code: e?.cause?.code || e?.code || null,
            name: e?.name,
            message: e?.message,
        };
        console.error("[ASK] ERR", info, e?.stack);
        // 브라우저 Network 탭에서 바로 원인 확인 가능
        return new Response(JSON.stringify({ error: true, ...info }), { status: 500 });
    }
}
