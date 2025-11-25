"use client";

import { useState, useRef } from "react";

export default function VisionQuizPage() {
  const [filePreview, setFilePreview] = useState("");   // img 미리보기용
  const [fileBase64, setFileBase64] = useState("");     // API로 보낼 data URL
  const [level, setLevel] = useState("beginner");
  const [numQuestions, setNumQuestions] = useState(3);

  const [quizzes, setQuizzes] = useState([]);           // {question, options, answerIndex}[]
  const [rawText, setRawText] = useState("");           // 파싱 실패 시 원본
  const [loading, setLoading] = useState(false);
  const btnRef = useRef(null);

  /** 파일 선택 */
  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) {
      setFilePreview("");
      setFileBase64("");
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const result = evt.target?.result;
      if (typeof result === "string") {
        setFilePreview(result);
        setFileBase64(result);
      }
    };
    reader.readAsDataURL(file);
  }

  /** 퀴즈 생성 요청 */
  async function generateQuiz() {
    if (!fileBase64) {
      alert("이미지 파일을 먼저 선택해 주세요.");
      return;
    }

    setLoading(true);
    setQuizzes([]);
    setRawText("");
    if (btnRef.current) btnRef.current.disabled = true;

    try {
      const res = await fetch(`/api/vision-quiz?t=${Date.now()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: fileBase64,
          level,
          numQuestions: Number(numQuestions) || 3,
        }),
      });

      const data = await res.json();
      if (data?.quizzes && Array.isArray(data.quizzes)) {
        setQuizzes(data.quizzes);
      } else {
        setRawText(data?.raw || JSON.stringify(data, null, 2));
      }
    } catch (e) {
      console.error(e);
      setRawText("에러가 발생했어요. 콘솔을 확인해 보세요.");
    } finally {
      setLoading(false);
      if (btnRef.current) btnRef.current.disabled = false;
    }
  }

  /** TTS - 영어로 읽어주기 */
  function speak(text) {
    if (typeof window === "undefined") return;
    try {
      const synth = window.speechSynthesis;
      synth.cancel(); // 이전 재생 중지
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "en-US";  // 영어
      utter.rate = 0.95;
      synth.speak(utter);
    } catch (e) {
      console.error("TTS error", e);
      alert("브라우저에서 음성 재생을 지원하지 않거나 오류가 발생했습니다.");
    }
  }

  function stopSpeak() {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
  }

  const hasQuiz = quizzes && quizzes.length > 0;

  return (
    <main
      style={{
        maxWidth: 960,
        margin: "40px auto",
        padding: 16,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>
        이미지를 활용해 영어 퀴즈 만들기 🎯
      </h1>
      <p style={{ fontSize: 14, color: "#555", marginBottom: 20 }}>
        이미지를 업로드하면, GPT 비전(Gemini)이 이미지를 보고 영어 객관식 문제를 만들어 줍니다.
        각 문제는 TTS로 들어볼 수도 있어요.
      </p>

      {/* 업로드 + 옵션 */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 20,
          marginBottom: 24,
        }}
      >
        {/* 왼쪽: 이미지 업로드 & 미리보기 */}
        <div>
          <div style={{ display: "grid", gap: 6, marginBottom: 10 }}>
            <label style={{ fontSize: 14 }}>이미지 파일 선택</label>
            <input type="file" accept="image/*" onChange={handleFileChange} />
          </div>

          <div
            style={{
              border: "1px solid #eee",
              borderRadius: 8,
              padding: 8,
              minHeight: 220,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#fafafa",
            }}
          >
            {filePreview ? (
              <img
                src={filePreview}
                alt="quiz source preview"
                style={{
                  maxWidth: "100%",
                  maxHeight: 260,
                  objectFit: "contain",
                  borderRadius: 6,
                }}
              />
            ) : (
              <span style={{ fontSize: 13, color: "#999" }}>
                이미지 파일을 선택하면 여기 미리보기가 표시됩니다.
              </span>
            )}
          </div>
        </div>

        {/* 오른쪽: 옵션 & 버튼 */}
        <div
          style={{
            border: "1px solid #eee",
            borderRadius: 8,
            padding: 12,
            background: "#fafafa",
          }}
        >
          <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
            <label style={{ fontSize: 14 }}>난이도 (Difficulty)</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              style={{
                padding: "8px 10px",
                borderRadius: 6,
                border: "1px solid #ccc",
                fontSize: 14,
              }}
            >
              <option value="beginner">Beginner (초급)</option>
              <option value="intermediate">Intermediate (중급)</option>
              <option value="advanced">Advanced (고급)</option>
            </select>
          </div>

          <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
            <label style={{ fontSize: 14 }}>문제 개수</label>
            <input
              type="number"
              min={1}
              max={5}
              value={numQuestions}
              onChange={(e) => setNumQuestions(e.target.value)}
              style={{
                padding: "8px 10px",
                borderRadius: 6,
                border: "1px solid #ccc",
                fontSize: 14,
                width: 100,
              }}
            />
          </div>

          <button
            ref={btnRef}
            onClick={generateQuiz}
            style={{
              padding: "10px 16px",
              fontSize: 15,
              borderRadius: 8,
              border: "1px solid #ccc",
              background: loading ? "#e5e7eb" : "#f9fafb",
              cursor: loading ? "default" : "pointer",
              width: "100%",
              marginBottom: 8,
            }}
          >
            {loading ? "퀴즈 생성 중..." : "이미지로 퀴즈 생성"}
          </button>

          <button
            onClick={stopSpeak}
            style={{
              padding: "8px 16px",
              fontSize: 13,
              borderRadius: 8,
              border: "1px solid #ddd",
              background: "#fff",
              cursor: "pointer",
              width: "100%",
            }}
          >
            🔇 음성 재생 중지
          </button>
        </div>
      </section>

      {/* 퀴즈 결과 영역 */}
      <section>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>
          생성된 퀴즈
        </h2>

        {!hasQuiz && !rawText && (
          <p style={{ fontSize: 14, color: "#777" }}>
            퀴즈를 생성하면 아래에 영어 문제들이 표시됩니다.
          </p>
        )}

        {hasQuiz && (
          <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
            {quizzes.map((q, idx) => (
              <div
                key={idx}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  padding: 12,
                  background: "#fff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <div style={{ fontWeight: 600 }}>
                    Q{idx + 1}. {q.question}
                  </div>
                  <button
                    onClick={() =>
                      speak(
                        `Question ${idx + 1}. ${q.question}. ` +
                          (Array.isArray(q.options)
                            ? q.options
                                .map(
                                  (opt, i) =>
                                    `Option ${String.fromCharCode(
                                      65 + i
                                    )}: ${opt}.`
                                )
                                .join(" ")
                            : "")
                      )
                    }
                    style={{
                      fontSize: 12,
                      padding: "4px 8px",
                      borderRadius: 999,
                      border: "1px solid #ddd",
                      cursor: "pointer",
                      background: "#f9fafb",
                    }}
                  >
                    ▶ 듣기 (TTS)
                  </button>
                </div>

                <ol type="A" style={{ paddingLeft: 20, marginBottom: 6 }}>
                  {Array.isArray(q.options) &&
                    q.options.map((opt, i) => (
                      <li key={i} style={{ marginBottom: 2 }}>
                        {opt}
                      </li>
                    ))}
                </ol>

                {typeof q.answerIndex === "number" && (
                  <div style={{ fontSize: 13, color: "#555" }}>
                    정답(Answer):{" "}
                    <strong>
                      {String.fromCharCode(65 + q.answerIndex)}.
                      {"  "}
                      {q.options?.[q.answerIndex]}
                    </strong>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* JSON 파싱 실패했을 때 디버깅용 원본 표시 */}
        {rawText && (
          <details
            style={{
              border: "1px dashed #ddd",
              borderRadius: 8,
              padding: 8,
              background: "#fafafa",
              fontSize: 12,
            }}
          >
            <summary style={{ cursor: "pointer" }}>
              원본 응답(raw) / 디버그 보기
            </summary>
            <pre style={{ whiteSpace: "pre-wrap" }}>{rawText}</pre>
          </details>
        )}
      </section>
    </main>
  );
}
