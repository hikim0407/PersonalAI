"use client";

import { useState, useRef } from "react";

export default function VisionPage() {
  // 1) 인터넷 이미지용 상태
  const [imageUrl, setImageUrl] = useState("");
  const [urlPrompt, setUrlPrompt] = useState(
    "이미지 속 장면을 한국어로 자세히 설명해줘."
  );
  const [urlAnswer, setUrlAnswer] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const urlBtnRef = useRef(null);

  // 2) 업로드 이미지용 상태
  const [filePrompt, setFilePrompt] = useState(
    "이 사진의 내용을 한국어로 자세히 설명해줘."
  );
  const [filePreview, setFilePreview] = useState(""); // <img src>용 data URL
  const [fileBase64, setFileBase64] = useState("");   // API로 보낼 data URL 또는 base64
  const [fileAnswer, setFileAnswer] = useState("");
  const [fileLoading, setFileLoading] = useState(false);
  const fileBtnRef = useRef(null);

  /** 1) 인터넷 이미지 분석 */
  async function analyzeByUrl() {
    const url = imageUrl.trim();
    const q = urlPrompt.trim();
    if (!url || !q) {
      alert("이미지 URL과 프롬프트를 모두 입력해 주세요.");
      return;
    }

    setUrlLoading(true);
    setUrlAnswer("");
    if (urlBtnRef.current) urlBtnRef.current.disabled = true;

    try {
      const res = await fetch(`/api/vision?t=${Date.now()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: url, prompt: q }),
      });

      const data = await res.json();
      if (data?.answer) {
        setUrlAnswer(data.answer);
      } else {
        setUrlAnswer("응답이 비어 있어요. 요청을 다시 시도해 보세요.");
      }
    } catch (e) {
      console.error(e);
      setUrlAnswer("에러가 발생했어요 😥 콘솔을 확인해 보세요.");
    } finally {
      setUrlLoading(false);
      if (urlBtnRef.current) urlBtnRef.current.disabled = false;
    }
  }

  /** 2) 파일 선택 시 base64로 읽어오기 */
  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) {
      setFilePreview("");
      setFileBase64("");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === "string") {
        // result는 data URL("data:image/png;base64,....") 형태
        setFilePreview(result);
        setFileBase64(result);
      }
    };
    reader.readAsDataURL(file);
  }

  /** 2) 업로드 이미지 분석 */
  async function analyzeByFile() {
    const q = filePrompt.trim();
    if (!fileBase64) {
      alert("이미지 파일을 먼저 선택해 주세요.");
      return;
    }
    if (!q) {
      alert("프롬프트를 입력해 주세요.");
      return;
    }

    setFileLoading(true);
    setFileAnswer("");
    if (fileBtnRef.current) fileBtnRef.current.disabled = true;

    try {
      const res = await fetch(`/api/vision?t=${Date.now()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: fileBase64,
          mimeType: guessMimeTypeFromDataUrl(fileBase64),
          prompt: q,
        }),
      });

      const data = await res.json();
      if (data?.answer) {
        setFileAnswer(data.answer);
      } else {
        setFileAnswer("응답이 비어 있어요. 다시 시도해 보세요.");
      }
    } catch (e) {
      console.error(e);
      setFileAnswer("에러가 발생했어요 😥 콘솔을 확인해 보세요.");
    } finally {
      setFileLoading(false);
      if (fileBtnRef.current) fileBtnRef.current.disabled = false;
    }
  }

  // data URL에서 mimeType 추출 (예: "data:image/png;base64,...")
  function guessMimeTypeFromDataUrl(dataUrl) {
    if (!dataUrl.startsWith("data:")) return "image/png";
    const semi = dataUrl.indexOf(";");
    if (semi === -1) return "image/png";
    return dataUrl.substring(5, semi) || "image/png";
  }

  return (
    <main
      style={{
        maxWidth: 900,
        margin: "40px auto",
        padding: 16,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>
        이미지 분석하기 🖼️
      </h1>
      <p style={{ fontSize: 14, color: "#555", marginBottom: 24 }}>
        1) 인터넷에 있는 이미지 URL로 설명 요청하기, 2) 내 컴퓨터에 있는 이미지로 설명 요청하기.
      </p>

      {/* 섹션 1: 인터넷 이미지 URL */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>
          1. 인터넷 이미지로 설명 요청하기
        </h2>

        <div style={{ display: "grid", gap: 6, marginBottom: 12 }}>
          <label style={{ fontSize: 14 }}>이미지 URL</label>
          <input
            placeholder="https://unsplash.com/"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #ccc",
              borderRadius: 6,
              fontSize: 14,
            }}
          />
        </div>

        <div style={{ display: "grid", gap: 6, marginBottom: 16 }}>
          <label style={{ fontSize: 14 }}>프롬프트</label>
          <textarea
            value={urlPrompt}
            onChange={(e) => setUrlPrompt(e.target.value)}
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

        <div
          style={{
            display: "flex",
            gap: 16,
            alignItems: "flex-start",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              flex: 1,
              border: "1px solid #eee",
              borderRadius: 8,
              padding: 8,
              minHeight: 180,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#fafafa",
            }}
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="미리보기"
                style={{
                  maxWidth: "100%",
                  maxHeight: 260,
                  objectFit: "contain",
                  borderRadius: 6,
                }}
              />
            ) : (
              <span style={{ fontSize: 13, color: "#999" }}>
                이미지 URL을 입력하면 이곳에 미리 보기가 나옵니다.
              </span>
            )}
          </div>

          <button
            ref={urlBtnRef}
            onClick={analyzeByUrl}
            style={{
              padding: "10px 16px",
              fontSize: 15,
              borderRadius: 8,
              border: "1px solid #ccc",
              background: urlLoading ? "#e5e7eb" : "#f9fafb",
              cursor: urlLoading ? "default" : "pointer",
              minWidth: 120,
              height: 44,
            }}
          >
            {urlLoading ? "분석 중..." : "URL 이미지 분석"}
          </button>
        </div>

        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: 12,
            minHeight: 100,
            background: "#fff",
            whiteSpace: "pre-wrap",
            fontSize: 14,
          }}
        >
          {urlAnswer || "여기에 URL 이미지 분석 결과가 표시됩니다."}
        </div>
      </section>

      <hr style={{ marginBottom: 32 }} />

      {/* 섹션 2: 내 이미지 업로드 */}
      <section>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>
          2. 내 컴퓨터에 있는 이미지로 설명 요청하기
        </h2>

        {/* 파일 업로드 */}
        <div style={{ display: "grid", gap: 6, marginBottom: 12 }}>
          <label style={{ fontSize: 14 }}>이미지 파일 선택</label>
          <input type="file" accept="image/*" onChange={handleFileChange} />
        </div>

        <div style={{ display: "grid", gap: 6, marginBottom: 16 }}>
          <label style={{ fontSize: 14 }}>프롬프트</label>
          <textarea
            value={filePrompt}
            onChange={(e) => setFilePrompt(e.target.value)}
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

        <div
          style={{
            display: "flex",
            gap: 16,
            alignItems: "flex-start",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              flex: 1,
              border: "1px solid #eee",
              borderRadius: 8,
              padding: 8,
              minHeight: 180,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#fafafa",
            }}
          >
            {filePreview ? (
              <img
                src={filePreview}
                alt="업로드 미리보기"
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

          <button
            ref={fileBtnRef}
            onClick={analyzeByFile}
            style={{
              padding: "10px 16px",
              fontSize: 15,
              borderRadius: 8,
              border: "1px solid #ccc",
              background: fileLoading ? "#e5e7eb" : "#f9fafb",
              cursor: fileLoading ? "default" : "pointer",
              minWidth: 120,
              height: 44,
            }}
          >
            {fileLoading ? "분석 중..." : "업로드 이미지 분석"}
          </button>
        </div>

        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: 12,
            minHeight: 100,
            background: "#fff",
            whiteSpace: "pre-wrap",
            fontSize: 14,
          }}
        >
          {fileAnswer || "여기에 업로드한 이미지 분석 결과가 표시됩니다."}
        </div>
      </section>
    </main>
  );
}
