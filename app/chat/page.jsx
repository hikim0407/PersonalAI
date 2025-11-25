"use client";

import { useEffect, useRef, useState } from "react";

/** ✅ 말풍선 컴포넌트 */
function Bubble({ role, text }) {
  const isUser = role === "user";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        marginBottom: 10,
      }}
    >
      {!isUser && (
        <div style={{ fontSize: 18, marginRight: 8, lineHeight: 1 }}>🤖</div>
      )}
      <div
        style={{
          position: "relative",
          maxWidth: "75%",
          padding: "10px 12px",
          borderRadius: 14,
          borderTopLeftRadius: isUser ? 14 : 6,
          borderTopRightRadius: isUser ? 6 : 14,
          background: isUser ? "#DCFCE7" : "#F1F5F9",
          color: "#111827",
          boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
          wordBreak: "break-word",
          whiteSpace: "pre-wrap",
        }}
      >
        {text}
      </div>
      {isUser && (
        <div style={{ fontSize: 18, marginLeft: 8, lineHeight: 1 }}>🙋</div>
      )}
    </div>
  );
}

/** ✅ 기본 시스템 프롬프트 */
const DEFAULT_SYSTEM = "당신은 한국어로 응답하는 개인 비서입니다.";

export default function Home() {
  const [log, setLog] = useState([]); // [{role:'user'|'model', text:string}]
  const [q, setQ] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM);
  const [loading, setLoading] = useState(false);
  const [debug, setDebug] = useState([]); // 도구 이벤트 로그(선택)
  const [streamMode, setStreamMode] = useState(true); // ✅ 스트리밍 on/off

  const btnRef = useRef(null);
  const logRef = useRef(null);
  const streamBufRef = useRef(""); // 현재 스트리밍 누적 버퍼

  // 로컬 저장/복구
  useEffect(() => {
    try {
      const savedLog = localStorage.getItem("mini-assistant-log");
      const savedSystem = localStorage.getItem("persona-system");
      const savedStream = localStorage.getItem("mini-assistant-stream");

      if (savedLog) setLog(JSON.parse(savedLog));
      if (savedSystem) setSystemPrompt(savedSystem);
      if (savedStream != null) {
        setStreamMode(savedStream === "1");
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("mini-assistant-log", JSON.stringify(log));
    } catch {}
  }, [log]);

  useEffect(() => {
    try {
      localStorage.setItem("persona-system", systemPrompt);
    } catch {}
  }, [systemPrompt]);

  useEffect(() => {
    try {
      localStorage.setItem("mini-assistant-stream", streamMode ? "1" : "0");
    } catch {}
  }, [streamMode]);

  // 새 메시지 때 자동 스크롤(바닥 근처면 맨 아래로)
  useEffect(() => {
    const el = logRef.current;
    if (!el) return;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 80;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [log]);

  /** ✅ 서버로 보낼 history: 텍스트만 */
  function buildApiHistory(list) {
    return list.map((m) => ({
      role: m.role === "assistant" ? "model" : m.role,
      text: m.text ?? "",
    }));
  }

  /** ✅ ask: stream 모드 on/off 지원 */
  async function ask() {
    const message = (q || "").trim();
    if (!message) return;

    const useStream = streamMode;

    setQ("");
    setLoading(true);
    streamBufRef.current = "";

    // 서버에 보낼 history: 기존 로그 + 현재 user 메시지
    const historyForApi = [
      ...buildApiHistory(log),
      { role: "user", text: message },
    ];

    // 1) UI에 먼저 user 메시지 반영
    setLog((L) =>
      useStream
        ? [...L, { role: "user", text: message }, { role: "model", text: "" }] // 스트리밍: placeholder 추가
        : [...L, { role: "user", text: message }]
    );

    if (btnRef.current) btnRef.current.disabled = true;

    try {
      const res = await fetch(`/api/ask?t=${Date.now()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stream: useStream, // ✅ 서버에 스트림 여부 전달(서버가 지원한다면)
          message,
          history: historyForApi,
          system: systemPrompt?.trim() || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error("응답이 유효하지 않습니다.");
      }

      // ✅ 스트림 OFF: 한 번에 JSON 받기
      if (!useStream || !res.body || res.headers.get("content-type")?.includes("application/json")) {
        const data = await res.json();
        const answer = data?.answer ?? "(응답 없음)";
        setLog((L) => [...L, { role: "model", text: answer }]);
        return;
      }

      // ✅ 스트림 ON: SSE 처리
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let chunkBuf = "";

      // SSE 청크 처리
      const flush = () => {
        let idx;
        while ((idx = chunkBuf.indexOf("\n\n")) !== -1) {
          const raw = chunkBuf.slice(0, idx).trim();
          chunkBuf = chunkBuf.slice(idx + 2);

          if (!raw) continue;

          const lines = raw.split("\n");
          const event =
            lines.find((l) => l.startsWith("event:"))?.slice(6).trim() ||
            "message";
          const dataLine = lines.find((l) => l.startsWith("data:"));
          const data = dataLine ? JSON.parse(dataLine.slice(5)) : null;

          if (event === "token") {
            // 토큰 누적 → 마지막 assistant 말풍선 업데이트
            const t = data?.text || "";
            if (!t) return;
            streamBufRef.current += t;
            setLog((L) => {
              const arr = [...L];
              arr[arr.length - 1] = {
                role: "model",
                text: streamBufRef.current,
              };
              return arr;
            });
          } else if (
            event === "tool_call" ||
            event === "tool_result" ||
            event === "phase"
          ) {
            // 선택: 툴 이벤트 패널에 출력
            setDebug((D) => [...D, { event, data }]);
          } else if (event === "done") {
            setLoading(false);
          } else if (event === "error") {
            setLoading(false);
            setLog((L) => {
              const arr = [...L];
              arr[arr.length - 1] = {
                role: "model",
                text:
                  (arr[arr.length - 1]?.text || "") +
                  `\n\n(에러) ${data?.message || "알 수 없는 오류"}`,
              };
              return arr;
            });
          }
        }
      };

      // 스트림 루프
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        chunkBuf += decoder.decode(value, { stream: true });
        flush();
      }
    } catch (e) {
      console.error(e);
      setLog((L) => {
        const arr = [...L];
        // 스트림 모드일 때 placeholder가 이미 있으므로 거기 덮어쓰기,
        // 아니면 새 assistant 말풍선 추가
        if (useStream && arr.length > 0 && arr[arr.length - 1].role === "model") {
          arr[arr.length - 1] = { role: "model", text: "에러가 발생했어요 😥" };
          return arr;
        }
        return [...arr, { role: "model", text: "에러가 발생했어요 😥" }];
      });
    } finally {
      setLoading(false);
      if (btnRef.current) btnRef.current.disabled = false;
    }
  }

  function clearLog() {
    if (!confirm("대화 기록을 모두 지울까요?")) return;
    setLog([]);
    try {
      localStorage.removeItem("mini-assistant-log");
    } catch {}
  }

  return (
    <main
      style={{
        maxWidth: 720,
        margin: "40px auto",
        padding: 16,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 12 }}>
        나만의 초간단 비서 🤖
      </h1>

      {/* 시스템 프롬프트 입력 */}
      <div style={{ display: "grid", gap: 6, marginBottom: 8 }}>
        <label style={{ fontSize: 14 }}>시스템 프롬프트</label>
        <textarea
          placeholder={DEFAULT_SYSTEM}
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={3}
          style={{
            width: "100%",
            padding: 10,
            border: "1px solid #ccc",
            borderRadius: 6,
            fontSize: 14,
          }}
        />
      </div>

      {/* ✅ 스트리밍 토글 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
          fontSize: 13,
          color: "#64748b",
        }}
      >
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={streamMode}
            onChange={(e) => setStreamMode(e.target.checked)}
          />
          <span>스트리밍 응답 사용</span>
        </label>
      </div>

      {/* 대화 영역 */}
      <div
        ref={logRef}
        style={{
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: 12,
          height: "40vh",
          overflowY: "auto",
          overscrollBehavior: "contain",
          background: "#fff",
        }}
      >
        {log.length === 0 && (
          <div style={{ marginBottom: 12, opacity: 0.8 }}>
            <Bubble role="model" text="안녕하세요! 무엇을 도와드릴까요?" />
          </div>
        )}
        {log.map((t, i) => (
          <Bubble key={i} role={t.role} text={t.text} />
        ))}
        {loading && (
          <div style={{ fontSize: 12, color: "#64748b" }}>생성 중…</div>
        )}
      </div>

      {/* 입력/버튼 */}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          placeholder="질문을 입력하세요"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
          style={{
            flex: 1,
            padding: "10px 12px",
            fontSize: 16,
            border: "1px solid #ccc",
            borderRadius: 6,
          }}
        />
        <button
          ref={btnRef}
          onClick={ask}
          style={{
            padding: "10px 16px",
            fontSize: 16,
            border: "1px solid #ccc",
            borderRadius: 6,
            background: "#fff",
          }}
        >
          전송
        </button>
        <button
          onClick={clearLog}
          title="대화 기록 지우기"
          style={{
            padding: "10px 12px",
            fontSize: 14,
            border: "1px solid #ddd",
            borderRadius: 6,
            background: "#fafafa",
          }}
        >
          기록 지우기
        </button>
      </div>

      {/* 선택: 도구 이벤트 패널 */}
      {debug.length > 0 && (
        <details style={{ marginTop: 12 }}>
          <summary
            style={{ cursor: "pointer", fontSize: 13, color: "#64748b" }}
          >
            도구 이벤트
          </summary>
          <pre
            style={{
              fontSize: 12,
              whiteSpace: "pre-wrap",
              background: "#f8fafc",
              padding: 8,
              borderRadius: 6,
              border: "1px solid #e5e7eb",
            }}
          >
            {JSON.stringify(debug, null, 2)}
          </pre>
        </details>
      )}
    </main>
  );
}
