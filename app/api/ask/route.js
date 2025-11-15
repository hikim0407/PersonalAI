// app/api/ask/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { localFns } from "@/lib/agent/functions";   // 네가 쓰는 경로에 맞춰 수정
import { tools }   from "@/lib/agent/tools";        // 네가 쓰는 경로에 맞춰 수정

const MODEL = "gemini-2.5-flash";

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

export async function POST(req) {
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
      },
    });

    return new Response(body, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  // (기존) 비-스트리밍 모드
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel(
      { model: MODEL, tools, systemInstruction: system },
      { apiVersion: "v1beta" }
    );
    const chat = model.startChat({ history: buildApiHistory(history) });

    // 일반 모드에선 함수 루프를 동기 처리
    let prompt = message ?? "";
    while (true) {
      const res = await chat.sendMessage(prompt);
      const text = res.response.text();
      const calls =
        res?.response?.candidates?.[0]?.content?.parts
          ?.filter((p) => p.functionCall)
          ?.map((p) => p.functionCall) || [];

      if (!calls.length) return Response.json({ answer: text });

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
        await chat.sendMessage([{ function_response: { name, response: responseObj } }]);
      }
      prompt = "";
    }
  } catch (e) {
    const info = {
      code: e?.cause?.code || e?.code || null,
      name: e?.name,
      message: e?.message,
    };
    return new Response(JSON.stringify({ error: true, ...info }), { status: 500 });
  }
}
