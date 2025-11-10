export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { tools } from "@/lib/agent/tools";
import { handleToolCalls } from "@/lib/agent/dispatcher";

// 텍스트 히스토리만 허용
function buildApiHistory(history=[]) {
    const firstUser = history.findIndex(h => h?.role === "user");
    const trimmed = firstUser === -1 ? [] : history.slice(firstUser);
        return trimmed.map((h) => ({
            role: h.role === "assistant" ? "model" : h.role,
            parts: [{ text: h.text ?? "" }],
        }));
}

// SSE 유틸
function sse(send, event, data) {
    send(`event: ${event}\n`);
    send(`data: ${JSON.stringify(data)}\n\n`);
}

// 함수 결과는 항상 Object(Struct)
function toObjectStruct(x) {
    return x && typeof x === "object" && !Array.isArray(x) ? x : { result: x };
}

const MODEL = process.env.GEMINI_MODEL;

export async function POST(req) {
    const t0 = Date.now();
    console.log("[ASK] start", t0);

    const { message, history = [], system, stream = false } = await req.json();

    // 스트리밍 모드
    if (stream) {
        const encoder = new TextEncoder();

        const body = new ReadableStream({
            async start(controller) {
                const send = (chunk) => controller.enqueue(encoder.encode(chunk));

                try {
                    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                    const model = genAI.getGenerativeModel(
                        { model: MODEL, tools, systemInstruction: system },
                        { apiVersion: "v1beta" } // 함수콜 v1beta 권장
                    );
                    const chat = model.startChat({ history: buildApiHistory(history) });

                    // 루프: (텍스트 스트림) → (함수콜 있으면 실행/재주입) → (다시 스트림)
                    let prompt = message ?? "";
                    let turn = 0;

                    while (true) {
                        turn += 1;
                        sse(send, "phase", { type: "stream", turn });

                        // 1) 토큰 스트림
                        const result = await chat.sendMessageStream(prompt);
                        for await (const chunk of result.stream) {
                            const t = chunk.text();
                            if (t) sse(send, "token", { text: t });
                        }

                        // 2) 종합 응답 / 함수콜 추출
                        const agg = await result.response;
                        const text = agg.text();
                        const calls =
                        agg?.candidates?.[0]?.content?.parts
                            ?.filter((p) => p.functionCall)
                            ?.map((p) => p.functionCall) || [];

                        // 스트림 종결(함수콜 없음)
                        if (!calls.length) {
                            sse(send, "done", { text });
                            break;
                        }

                        // 함수콜 있으면 실행 → 재주입
                        sse(send, "tool_call", { calls });

                        for (const call of calls) {
                            const name = call.name;
                            const args = typeof call.args === "string" ? JSON.parse(call.args) : (call.args || {});
                            const fn = localFns[name];
                            let payload;

                            try {
                                payload = fn ? await fn(args) : { error: `Unknown function: ${name}` };
                            } catch (e) {
                                payload = { error: e?.message || "Function error" };
                            }

                            const responseObj = toObjectStruct(payload);
                            sse(send, "tool_result", { name, response: responseObj });

                            // 중요: v1beta 스키마 맞춰 snake_case 로 재주입
                            await chat.sendMessage([
                                {
                                    function_response: {
                                        name,
                                        response: responseObj,
                                    },
                                },
                            ]);
                        }

                        // 다음 턴은 빈 프롬프트로 이어감(모델이 이전 컨텍스트로 답 계속)
                        prompt = "";
                    }
                    controller.close();
                } catch (e) {
                    sse(send, "error", {
                        code: e?.cause?.code || e?.code || null,
                        name: e?.name,
                        message: e?.message,
                    });
                    controller.close();
                }
            }
        });
        return new Response(body, {
            headers: {
                "Content-Type": "text/event-stream; charset=utf-8",
                "Cache-Control": "no-cache, no-transform",
                Connection: "keep-alive",
            },
        });
    }

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
