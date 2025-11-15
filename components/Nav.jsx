"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // 경로별 모달 내용 정의
  const getModalContent = (path) => {
    if (path === "/" || path === "/chat") {
      return {
        title: "챗봇 사용 가이드",
        description: "이 페이지에서는 시스템 프롬프트를 설정하고, 자유롭게 질문을 던져볼 수 있습니다.",
        tips: [
          "위쪽 \"시스템 프롬프트\"에 역할을 자세히 적을수록 응답 스타일이 안정됩니다.",
          "대화 기록은 브라우저 localStorage 에 저장되므로 새로고침해도 유지됩니다.",
          "\"기록 지우기\" 버튼으로 언제든 초기화할 수 있습니다.",
        ],
      };
    }

    if (path === "/summarize") {
      return {
        title: "문서 요약 사용 가이드",
        description: "긴 텍스트나 문서를 붙여 넣으면 핵심만 추려서 요약해주는 도우미입니다.",
        tips: [
          "원문을 최대한 그대로 입력하고, 원하는 요약 스타일을 한 줄로 덧붙여 보세요.",
          "예: \"요약해줘 (5줄, 비개발자 기준으로 쉽게).\"",
        ],
      };
    }

    if (path === "/meeting-notes") {
      return {
        title: "회의록 정리 가이드",
        description: "회의 녹취록이나 메모를 넣으면 액션 아이템 중심으로 정리해 줍니다.",
        tips: [
          "참석자, 날짜, 안건을 먼저 적어두면 결과 정리가 더 명확해집니다.",
          "마지막에 \"TODO만 따로 모아서 정리해줘\" 같은 지시를 추가해 보세요.",
        ],
      };
    }

    // ✅ 여기: /vision 전용 안내
    if (path === "/vision") {
      return {
        title: "6장: Gemini 비전으로 이미지 이해하기",
        description:
          "이 모달은 6장 스터디 발표 때 PPT 대신 참고할 수 있는 요약 노트입니다. /vision 페이지에서 바로 서버를 띄워놓고, 아래 3가지 흐름에 맞춰 설명하면 됩니다.",
        tips: [
          // 1단락
          "① 6장의 목표: 텍스트를 넘어 이미지를 이해하는 AI\n" +
            "- 이번 장의 핵심은 \"텍스트만 이해하는 챗봇\"을 넘어서, 이미지를 함께 다루는 멀티모달 에이전트를 경험하는 것입니다.\n" +
            "- 이 페이지에서는 인터넷 이미지나 캡처 이미지를 그대로 넣고, Gemini가 장면/구조/텍스트를 어떻게 설명하는지 확인해 봤습니다.\n" +
            "- 여기서 확인할 수 있는 것은 두 가지입니다:\n" +
            "  · (1) 우리가 어떤 관점(예: 요약, 분위기, 문제점 분석)으로 설명해 달라고 요청하느냐에 따라 답이 얼마나 달라지는지\n" +
            "  · (2) \"이미지 이해\"라는 기능이 실제 서비스에서 어디에 녹아들 수 있을지 상상해 보는 것",

          // 2단락
          "② Gemini 비전: 이미지 + 텍스트를 함께 이해하는 방식\n" +
            "- Gemini 비전 모델은 텍스트뿐 아니라 이미지(사진, 스크린샷, 다이어그램 등)를 입력으로 받아 한 번에 처리할 수 있습니다.\n" +
            "- 실습에서는\n" +
            "  · 브라우저에서 이미지를 업로드하거나 URL로 전달하고,\n" +
            "  · 서버에서 Gemini API로 이미지를 보내 설명을 받아,\n" +
            "  · 그 결과를 화면에 자연어로 보여주는 구조를 사용했습니다.\n" +
            "- 중요한 포인트는 \"이미지만 던져두고 알아서 설명해줘\"가 아니라,\n" +
            "  · 어떤 정보를 중심으로 보게 할지(예: 레이아웃, 텍스트 내용, 그래프 추세),\n" +
            "  · 어떤 톤과 난이도로 설명할지(예: 초등학생 기준, 기획자 기준)를 프롬프트로 명확히 적어 주었을 때 품질이 확 달라진다는 점입니다.",

          // 3단락
          "③ Gemini 비전의 한계와 우리가 확인한 부분\n" +
            "- 실습에서 일부러 작은 글씨가 많은 이미지, 해상도가 떨어지는 이미지, 애매한 장면 등을 넣어보면 한계가 잘 드러납니다.\n" +
            "- 대표적인 한계는 다음과 같습니다:\n" +
            "  · 작은 텍스트, 흐릿한 영역은 잘못 읽거나 아예 읽지 못할 수 있습니다.\n" +
            "  · 최신 로고, 특정 건물/장소/인물은 항상 정확히 인식하지 못합니다.\n" +
            "  · 확실하지 않은 내용도 그럴듯하게 추측해서 말하는 경향이 있습니다.\n" +
            "- 그래서 발표할 때 강조할 부분은:\n" +
            "  · (1) 결과를 그대로 믿기보다, 사람이 검수한다는 전제를 깔고 사용하는 도구라는 점,\n" +
            "  · (2) 한계가 있는 상황(저해상도, 모호한 장면 등)을 직접 실습으로 보여주면서 \"어디까지가 강점이고 어디서부터 위험한지\"를 함께 체감하는 것입니다.",
        ],
      };
    }

    // 기타 페이지 공통(혹시 나중에 추가될 페이지용)
    return {
      title: "이 페이지 설명",
      description: "이 페이지에서 할 수 있는 작업을 간단히 정리해 둔 안내 모달입니다.",
      tips: [
        "좌측 상단 제목을 눌러 메인으로 이동할 수 있습니다.",
        "우측 상단 버튼으로 언제든 이 안내를 다시 볼 수 있습니다.",
      ],
    };
  };

  const { title, description, tips } = getModalContent(pathname || "/");

  return (
    <>
      <header style={{ borderBottom: "1px solid #eee", background: "#fff" }}>
        <nav
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: 16,
            justifyContent: "space-between",
          }}
        >
          {/* 로고 / 제목 */}
          <Link
            href="/"
            style={{
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: ".2px",
              color: "#111",
              textDecoration: "none",
            }}
          >
            Do it! AI 에이전트
          </Link>

          {/* 페이지 설명 모달 버튼 */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              border: "1px solid #d0d7e2",
              background: "#f8fafc",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ fontSize: 16 }}>❔</span>
            <span>이 페이지 설명</span>
          </button>
        </nav>
      </header>

      {/* 모달 */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.30)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(720px, 95vw)",   // ✅ 가로 크게
              maxHeight: "85vh",           // ✅ 세로도 조금 더 크게
              overflow: "auto",
              background: "#fff",
              borderRadius: 18,
              padding: 24,
              boxShadow: "0 22px 55px rgba(15,23,42,0.35)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>{title}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: 22,
                  cursor: "pointer",
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            <p
              style={{
                fontSize: 14,
                color: "#4b5563",
                marginBottom: 12,
                whiteSpace: "pre-line",
              }}
            >
              {description}
            </p>

            {tips && tips.length > 0 && (
              <ul
                style={{
                  fontSize: 13,
                  color: "#374151",
                  marginLeft: 18,
                  marginBottom: 14,
                  whiteSpace: "pre-line",
                }}
              >
                {tips.map((tip, idx) => (
                  <li key={idx} style={{ marginBottom: 6 }}>
                    {tip}
                  </li>
                ))}
              </ul>
            )}

            <div style={{ textAlign: "right", marginTop: 10 }}>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  padding: "7px 14px",
                  fontSize: 13,
                  borderRadius: 999,
                  border: "1px solid #d0d7e2",
                  background: "#f1f5f9",
                  cursor: "pointer",
                }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
