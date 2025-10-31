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
const DEFAULT_SYSTEM =
  "당신은 한국어로 응답하는 개인 비서입니다. 간결하고 실용적으로 답하세요.";

export default function Home() {
  const [log, setLog] = useState([]);
  const [q, setQ] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM);

  const btnRef = useRef(null);
  const logRef = useRef(null);

  // 로컬 저장/복구
  useEffect(() => {
    try {
      const savedLog = localStorage.getItem("mini-assistant-log");
      const savedSystem = localStorage.getItem("persona-system");
      if (savedLog) setLog(JSON.parse(savedLog));
      if (savedSystem) setSystemPrompt(savedSystem);
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

  // 새 메시지 때 자동 스크롤(바닥 근처면 맨 아래로)
  useEffect(() => {
    const el = logRef.current;
    if (!el) return;
    const nearBottom =
      el.scrollTop + el.clientHeight >= el.scrollHeight - 80;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [log]);

  async function ask() {
    const message = (q || "").trim();
    if (!message) return;

    setQ("");
    setLog((L) => [...L, { role: "user", text: message }]);
    if (btnRef.current) btnRef.current.disabled = true;

    try {
      const res = await fetch(`/api/ask?t=${Date.now()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          //history: [...EXAMPLES, ...log],     // 예시 + 기존 대화
          history: [...log],     // 예시 + 기존 대화
          system: systemPrompt?.trim() || undefined, // textarea 값 사용
        }),
      });

      const data = await res.json();
      const answer = data?.answer ?? "(응답 없음)";
      setLog((L) => [...L, { role: "model", text: answer }]);
    } catch (e) {
      console.error(e);
      setLog((L) => [
        ...L,
        { role: "model", text: "에러가 발생했어요 😥" },
      ]);
    } finally {
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

      {/* 시스템 프롬프트 입력 textarea (프리셋 select 제거) */}
      <div style={{ display: "grid", gap: 6, marginBottom: 12 }}>
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

      {/* 대화 영역 (고정 높이 + 스크롤) */}
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
    </main>
  );
}
