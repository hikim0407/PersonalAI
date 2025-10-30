"use client";

import { useEffect, useRef, useState } from "react";

export default function MeetingNotesPage() {
  // Audio states
  const [audioFile, setAudioFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordTimerRef = useRef(null);
  const recordedChunksRef = useRef([]);

  // Result states
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [partials, setPartials] = useState([]);
  const [finalSummary, setFinalSummary] = useState("");
  const [transcript, setTranscript] = useState("");
  const [ytUrl, setYtUrl] = useState("");

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [audioUrl]);

  const pickBestMimeType = () => {
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4",
    ];
    for (const c of candidates) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported?.(c)) return c;
    }
    return "audio/webm";
  };

  const startRecording = async () => {
    if (!navigator?.mediaDevices?.getUserMedia) {
      alert("이 브라우저는 녹음을 지원하지 않습니다.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      recordedChunksRef.current = [];

      const mimeType = pickBestMimeType();
      const mr = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const fileName = `meeting-recording-${Date.now()}.${
          mimeType.includes("mp4") ? "m4a" : mimeType.includes("ogg") ? "ogg" : "webm"
        }`;
        const file = new File([blob], fileName, { type: blob.type });
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        const url = URL.createObjectURL(blob);
        setAudioFile(file);
        setAudioUrl(url);
      };

      mr.start(250);
      setIsRecording(true);
      setRecordSeconds(0);
      setStatus("녹음 중...");
      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch (e) {
      console.error(e);
      alert("마이크 권한을 확인해 주세요.");
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;
    try {
      mediaRecorderRef.current?.stop();
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    } finally {
      setIsRecording(false);
      clearInterval(recordTimerRef.current);
      setStatus("녹음 종료");
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    const url = URL.createObjectURL(file);
    setAudioFile(file);
    setAudioUrl(url);
    setStatus(`${file.name} 선택됨`);
  };

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, "0");
    const s = Math.floor(sec % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleTranscribeAndSummarize = async () => {
    if (!audioFile) {
      alert("오디오를 업로드하거나 녹음해 주세요.");
      return;
    }
    setIsLoading(true);
    setStatus("업로드 및 처리 중...");
    setFinalSummary("");
    setPartials([]);
    setTranscript("");

    try {
      const form = new FormData();
      form.append("audio", audioFile);
      // 옵션이 필요하면 여기에 추가하세요. 예: form.append('language', 'ko');

      const res = await fetch("/api/audio-transcribe", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "전사 실패");

      setStatus("전사 완료");
      if (data?.transcript) setTranscript(data.transcript);
    } catch (e) {
      console.error(e);
      setStatus(`에러: ${e.message || e}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchYouTubeOneMinute = async () => {
    if (!ytUrl.trim()) {
      alert("YouTube 링크를 입력해 주세요.");
      return;
    }
    try {
      setIsLoading(true);
      setStatus("YouTube에서 1분 오디오 추출 중...");
      const res = await fetch("/api/youtube-audio-1min", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: ytUrl.trim(), secs: 60 }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `요청 실패 (${res.status})`);
      }
      const blob = await res.blob();
      const name = `youtube-clip-${Date.now()}.mp3`;
      const file = new File([blob], name, { type: blob.type || "audio/mpeg" });
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      const url = URL.createObjectURL(blob);
      setAudioFile(file);
      setAudioUrl(url);
      setStatus("YouTube 1분 오디오 준비 완료");
    } catch (e) {
      console.error(e);
      setStatus(`에러: ${e.message || e}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 960, margin: "32px auto", padding: "0 16px" }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, marginBottom: 6 }}>회의록 작성 AI (음성 기반)</h1>
        <p style={{ color: "#555", marginBottom: 12 }}>
          음성을 녹음하거나 오디오 파일을 업로드하면 자동으로 전사하고 요약합니다.
        </p>
        <ul style={{ color: "#555", paddingLeft: 20, margin: "8px 0 0" }}>
          <li>브라우저 내 마이크 녹음 또는 파일 업로드 지원</li>
          <li>전사 + 요약을 한 번에 처리 (서버 API 필요)</li>
          <li>긴 오디오도 안전하게 단계적으로 처리</li>
        </ul>
      </header>

      <section style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="ytUrl" style={{ display: "block", fontWeight: 600, marginBottom: 8 }}>
            YouTube 링크 (처음 1분 오디오 추출)
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              id="ytUrl"
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={ytUrl}
              onChange={(e) => setYtUrl(e.target.value)}
              style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid #d9d9d9" }}
            />
            <button
              onClick={handleFetchYouTubeOneMinute}
              disabled={isLoading || !ytUrl.trim()}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "none",
                background: isLoading || !ytUrl.trim() ? "#bfbfbf" : "#0ea5e9",
                color: "white",
                fontWeight: 700,
                cursor: isLoading || !ytUrl.trim() ? "not-allowed" : "pointer",
              }}
            >
              1분 오디오 추출
            </button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          {!isRecording ? (
            <button
              onClick={startRecording}
              style={{
                padding: "10px 18px",
                borderRadius: 10,
                border: "none",
                background: "#e53e3e",
                color: "white",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              마이크로 녹음 시작
            </button>
          ) : (
            <button
              onClick={stopRecording}
              style={{
                padding: "10px 18px",
                borderRadius: 10,
                border: "none",
                background: "#dd6b20",
                color: "white",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              녹음 종료 ({formatTime(recordSeconds)})
            </button>
          )}

          <label
            style={{
              display: "inline-block",
              padding: "10px 14px",
              border: "1px dashed #b3b3b3",
              borderRadius: 10,
              cursor: "pointer",
              background: "#fafafa",
              color: "#333",
              fontWeight: 600,
            }}
          >
            오디오 파일 선택
            <input
              type="file"
              accept="audio/*,.m4a,.mp3,.wav,.webm,.ogg"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
          </label>
          <span style={{ color: "#666" }}>{status}</span>
        </div>

        {audioUrl && (
          <div style={{ marginTop: 12 }}>
            <audio src={audioUrl} controls style={{ width: "100%" }} />
            {audioFile && (
              <div style={{ color: "#555", marginTop: 6 }}>
                선택된 파일: <strong>{audioFile.name}</strong> ({Math.round(audioFile.size / 1024)} KB)
              </div>
            )}
          </div>
        )}
      </section>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20 }}>
        <button
          onClick={handleTranscribeAndSummarize}
          disabled={isLoading || !audioFile}
          style={{
            padding: "10px 18px",
            borderRadius: 10,
            border: "none",
            background: isLoading || !audioFile ? "#9aa9ff" : "#4a64ff",
            color: "white",
            fontWeight: 600,
            cursor: isLoading || !audioFile ? "not-allowed" : "pointer",
            transition: "background .15s ease",
          }}
        >
          {isLoading ? "처리 중..." : "전사 + 요약"}
        </button>
        <span style={{ color: "#666" }}>{isLoading ? "잠시만 기다려 주세요" : ""}</span>
      </div>

      {transcript && (
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>전사 결과</h2>
          <article style={{ border: "1px solid #e5e5e5", borderRadius: 12, padding: 12, background: "#fff", whiteSpace: "pre-wrap" }}>
            {transcript}
          </article>
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
          <h3 style={{ fontSize: 17, marginBottom: 10 }}>파트별 요약</h3>
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
