"use client";

import { useMemo, useState } from "react";

const preprocessNotes = (text) =>
  text
    .replace(/\[[0-2]?\d:[0-5]\d(?::[0-5]\d)?\]/g, " ")
    .replace(/^\s*(?:발언자\s*\d*|참석자\s*\d*|Speaker\s*\d*|Participant\s*\d*)\s*[:\-]\s*/gim, "")
    .replace(/^\s*(?:-\s*)?(?:사회자|진행자)[:\-]\s*/gim, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const toChunks = (text, maxChars = 3200, overlap = 200) => {
  const output = [];
  for (let i = 0; i < text.length; i += maxChars - overlap) {
    const slice = text.slice(i, i + maxChars).trim();
    if (slice) output.push(slice);
  }
  return output;
};

export default function MeetingNotesPage() {
  const [rawNotes, setRawNotes] = useState("");
  const [status, setStatus] = useState("");
  const [partials, setPartials] = useState([]);
  const [finalSummary, setFinalSummary] = useState("");
  const [chunkPreview, setChunkPreview] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const characterCount = useMemo(() => rawNotes.trim().length, [rawNotes]);

  const handleSummarize = async () => {
    const trimmed = rawNotes.trim();
    if (!trimmed) {
      alert("회의록 텍스트를 입력하세요.");
      return;
    }

    const cleaned = preprocessNotes(trimmed);
    const chunks = toChunks(cleaned);

    if (chunks.length === 0) {
      alert("요약할 수 있는 텍스트가 없습니다.");
      return;
    }

    setIsLoading(true);
    setStatus(`총 ${chunks.length}개 청크 요약 중...`);
    setFinalSummary("");
    setPartials([]);
    setChunkPreview(chunks.map((c) => c.slice(0, 280)));

    try {
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chunks }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "요약 실패");

      setStatus("완료");
      setPartials(data.partials || []);
      setFinalSummary(data.finalSummary || "");
    } catch (error) {
      console.error(error);
      setStatus(`에러: ${error.message || error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 960, margin: "32px auto", padding: "0 16px" }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, marginBottom: 6 }}>회의록 정리 AI</h1>
        <p style={{ color: "#555", marginBottom: 12 }}>
          회의록, 음성 인식 결과, 고객 상담 기록 등을 붙여넣으면 핵심 액션과 주요 결정을 구조화해 드려요.
        </p>
        <ul style={{ color: "#555", paddingLeft: 20, margin: "8px 0 0" }}>
          <li>불필요한 발화, 타임스탬프를 정리하고 요점만 추립니다.</li>
          <li>Gemini 기반 요약: 핵심 요지, 주요 사실, 후속 액션까지 자동 생성.</li>
          <li>최대 수만 자 규모 회의록도 청크로 나눠 안전하게 처리합니다.</li>
        </ul>
      </header>

      <section style={{ marginBottom: 16 }}>
        <label htmlFor="notes" style={{ display: "block", fontWeight: 600, marginBottom: 8 }}>
          회의 텍스트 입력
        </label>
        <textarea
          id="notes"
          value={rawNotes}
          onChange={(e) => setRawNotes(e.target.value)}
          placeholder="예) 10시 주간 전략 회의 내용..."
          style={{
            width: "100%",
            minHeight: 220,
            borderRadius: 12,
            border: "1px solid #d9d9d9",
            padding: 14,
            fontSize: 15,
            lineHeight: 1.5,
            resize: "vertical",
          }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, color: "#666" }}>
          <span>글자 수: {characterCount.toLocaleString()}자</span>
          {chunkPreview.length > 0 && <span>청크: {chunkPreview.length}개</span>}
        </div>
      </section>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20 }}>
        <button
          onClick={handleSummarize}
          disabled={isLoading}
          style={{
            padding: "10px 18px",
            borderRadius: 10,
            border: "none",
            background: isLoading ? "#9aa9ff" : "#4a64ff",
            color: "white",
            fontWeight: 600,
            cursor: isLoading ? "not-allowed" : "pointer",
            transition: "background .15s ease",
          }}
        >
          {isLoading ? "요약 중..." : "요약 생성"}
        </button>
        <span style={{ color: "#666" }}>{status}</span>
      </div>

      {chunkPreview.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>전처리된 청크 미리보기</h2>
          <div style={{ display: "grid", gap: 12 }}>
            {chunkPreview.map((snippet, index) => (
              <article
                key={index}
                style={{ border: "1px solid #eee", borderRadius: 10, padding: 12, background: "#fafafa", whiteSpace: "pre-wrap" }}
              >
                <strong style={{ display: "block", marginBottom: 6 }}>Part {index + 1}</strong>
                {snippet}
                {snippet.length === 280 && "..."}
              </article>
            ))}
          </div>
        </section>
      )}

      {finalSummary && (
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, marginBottom: 10 }}>최종 요약</h2>
          <article style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16, whiteSpace: "pre-wrap", background: "#fff" }}>
            {finalSummary}
          </article>
        </section>
      )}

      {partials.length > 0 && (
        <section style={{ marginBottom: 40 }}>
          <h3 style={{ fontSize: 17, marginBottom: 10 }}>청크별 상세 요약</h3>
          {partials.map((partial, index) => (
            <details key={index} style={{ marginBottom: 10 }}>
              <summary>Part {index + 1}</summary>
              <div style={{ padding: "10px 14px", background: "#f7f8ff", borderRadius: 10, whiteSpace: "pre-wrap", border: "1px solid #e1e6ff" }}>
                {partial}
              </div>
            </details>
          ))}
        </section>
      )}
    </main>
  );
}
