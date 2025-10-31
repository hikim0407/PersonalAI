export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { tools } from "@/lib/agent/tools";
import { handleToolCalls } from "@/lib/agent/dispatcher";

export async function POST(req) {
    const t0 = Date.now();
    console.log("[ASK] start", t0);

    try {
        const { message, history = [], system } = await req.json();
        console.log("[ASK] payload", { messageLen: (message||"").length, hist: history.length });

        // 1) 허용 역할만(user/model) 사용. 'assistant'는 model로 치환.
        // 2) 클라이언트가 parts를 들고 왔어도 'text'만 안전 추출 (나머지 functionCall/Response/이상 구조 제거)
        // 3) tool/기타 역할, 그리고 Part 내부에 role/parts가 있는 오염 항목 전부 제거
        function coerceRole(r) {
            if (r === "assistant") return "model";
            if (r === "user" || r === "model") return r;
            return null; // drop others (e.g., 'tool', 'system' here)
        }

        function extractPlainText(h) {
            if (typeof h?.text === "string" && h.text.trim()) return h.text;
            // 혹시 parts 배열 형태로 들어왔다면 text 파트만 모아 합치기
            if (Array.isArray(h?.parts)) {
                const texts = h.parts
                .map((p) => (typeof p?.text === "string" ? p.text : ""))
                .filter(Boolean);
                if (texts.length) return texts.join("\n");
            }
            return "";
        }

        const firstUser = history.findIndex((h) => coerceRole(h?.role) === "user");
        const trimmed = firstUser === -1 ? [] : history.slice(firstUser);
        const apiHistory = trimmed
        .map((h) => {
            const role = coerceRole(h?.role);
            if (!role) return null; // drop invalid roles ('tool', 'system', etc.)
            const text = extractPlainText(h);
            return {
                role,
                parts: text ? [{ text }] : [{ text: "" }],
            };
        })
        .filter(Boolean);

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            ...(system ? { systemInstruction: system } : {}),
            tools,
        });

        console.log("apiHistory", JSON.stringify(apiHistory, null, 2));
        const chat = model.startChat({ history: apiHistory });
        let userContent = message;
        let finalText = "";
        let guard = 0;

        while (guard++ < 6) {
            const res = await chat.sendMessage(userContent);
            const resp = res.response;

            // 최종 텍스트?
            const text = resp.text?.();
            
            // 함수 호출?
            const calls =
                resp.functionCalls?.() ||
                resp.candidates?.flatMap((c) =>
                c.content?.parts?.filter((p) => p.functionCall)?.map((p) => p.functionCall)
                ) ||
                [];

            console.log("[functionCalls]", resp.functionCalls?.());
            console.log("[candidates parts]", JSON.stringify(resp.candidates?.[0]?.content?.parts, null, 2));

            if (!calls || calls.length === 0) {
                finalText = text || "(응답 없음)";
                break;
            }

            // 함수 실행 + 결과 재주입
            await handleToolCalls(chat, calls);

            // 다음 루프: 모델이 종합 답변을 생성하도록 빈 입력
            userContent = "";
        }

        return Response.json({ answer: finalText || "완료했어요." });
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
