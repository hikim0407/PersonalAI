"use client";

import { useRef, useState } from "react";

export default function SummarizePage() {
  const fileRef = useRef(null);
  const [status, setStatus] = useState("");
  const [extracted, setExtracted] = useState("");
  const [finalSummary, setFinalSummary] = useState("");
  const [partials, setPartials] = useState([]);

  // 간단 전처리 & 청크
  const preprocess = (t) =>
    t.replace(/\n\s*\d+\s*\n/g, "\n").replace(/[^\S\r\n]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  const chunk = (text, maxChars = 3800, overlap = 200) => {
    const out = [];
    for (let i = 0; i < text.length; i += (maxChars - overlap)) {
      const s = text.slice(i, i + maxChars).trim();
      if (s) out.push(s);
    }
    return out;
  };

  const onRun = async () => {
    const f = fileRef.current?.files?.[0];
    if (!f) return alert("PDF 파일을 선택하세요.");

    setStatus("서버에서 텍스트 추출 중...");
    setExtracted(""); setFinalSummary(""); setPartials([]);

    try {
      // 1) /api/extract 로 파일 전송 (서버에서 pdf-parse)
      const fd = new FormData();
      fd.append("file", f);
      const r1 = await fetch("/api/extract", { method: "POST", body: fd });
      const d1 = await r1.json();
      if (!r1.ok) throw new Error(d1.error || "추출 실패");
      const text = (d1.text || "").trim();
      setExtracted(text);

      // 2) (선택) /api/summarize 호출 — 이미 만들어 두었다면 자동 연동
      if (text) {
        setStatus("전처리/청크 → 요약 중...");
        const clean = preprocess(text);
        const chunks = chunk(clean);

        const r2 = await fetch("/api/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chunks }),
        });
        const d2 = await r2.json();
        if (!r2.ok) throw new Error(d2.error || "요약 실패");

        setPartials(d2.partials || []);
        setFinalSummary(d2.finalSummary || "");
        setStatus("완료");
      } else {
        setStatus("추출 완료(빈 텍스트)");
      }
    } catch (e) {
      console.error(e);
      setStatus(`에러: ${e.message || e}`);
    }
  };

  return (
    <main style={{ maxWidth: 980, margin: "32px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>문서 요약 (서버 추출)</h1>
      <p style={{ color: "#555", marginBottom: 16 }}>
        PDF는 브라우저에서 선택하고, 텍스트 추출은 서버(API)에서 수행합니다.
      </p>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <input type="file" accept="application/pdf" ref={fileRef} />
        <button onClick={onRun} style={{ padding: "8px 14px" }}>요약하기</button>
        <span style={{ color: "#666" }}>{status}</span>
      </div>

      {extracted && (
        <section style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>추출된 텍스트(일부)</h2>
          <pre style={{ whiteSpace: "pre-wrap", border: "1px solid #ddd", borderRadius: 8, padding: 12, maxHeight: 220, overflow: "auto" }}>
            {extracted.slice(0, 3000)}
          </pre>
        </section>
      )}

      {finalSummary && (
        <section style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>최종 요약</h2>
          <article style={{ border: "1px solid #ddd", borderRadius: 8, padding: 14, whiteSpace: "pre-wrap" }}>
            {finalSummary}
          </article>
        </section>
      )}

      {partials.length > 0 && (
        <section style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 16, marginBottom: 8 }}>청크별 요약</h3>
          {partials.map((p, i) => (
            <details key={i} style={{ marginBottom: 8 }}>
              <summary>Part {i + 1}</summary>
              <div style={{ whiteSpace: "pre-wrap", borderLeft: "3px solid #eee", paddingLeft: 10 }}>{p}</div>
            </details>
          ))}
        </section>
      )}
    </main>
  );
}
