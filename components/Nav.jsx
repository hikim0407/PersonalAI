"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // 경로별 모달 내용 정의
  const getModalContent = (path) => {

    /*
    // 발표 노트(발표자용, 화면에는 안 보임)
    // LLM 자체로는 불가능한 답변들이 많음(현재시간, 오늘의 날씨, 주식 등등)
    // 모든걸 LLM 에 학습시킬 수는 없음.
    // 따라서 우리가 시간을 알고싶으면 시계를 보듯, LLM에게도 도구를 알려주어 답변을 할 수 있게 만들어주는 방법.
    // tools 에는 호출할 함수에 대해 정의를 한다. 이 tools 의 내용을 보고 LLM이 질문에 내용에 따라 어떤 함수를 실행할지 판단한다.
    // ② 펑션 콜링(도구 호출)
    "② 펑션 콜링: 챗봇이 직접 함수를 부르는 방법\n" +
      "- 펑션 콜링(도구 호출)은 챗봇이 스스로 \"이제는 코드를 실행해야겠다\"고 판단해서 미리 정의해 둔 함수를 호출하는 메커니즘입니다.\n" +
      "- 예시:\n" +
      "  · 현재 시간을 luxon 같은 라이브러리로 계산하는 함수\n" +
      "  · 주식 가격, 환율, 날씨처럼 외부 API에서 정보를 가져오는 함수\n" +
      "- 흐름은 다음과 같습니다:\n" +
      "  1) 우리가 함수의 이름, 설명, 파라미터 스키마(JSON)를 모델에 알려주고,\n" +
      "  2) 모델이 \"이 함수가 필요하다\"고 판단하면, 호출에 필요한 인자를 JSON 형태로 만들어 줍니다.\n" +
      "  3) 서버가 실제로 함수를 실행해 결과를 얻고,\n" +
      "  4) 그 결과를 다시 모델에게 넘겨 최종 답변을 완성합니다.\n" +
      "- 이런 구조 덕분에 챗봇이 학습 데이터에 없는 최신 정보나, 내부 시스템(사내 API 등)과도 안전하게 연동될 수 있습니다.",
    */
    if (path === "/chat") {
      return {
        title: "챗봇: 펑션 콜링과 스트리밍 이해하기",
        description:
          "펑션 콜링으로 함수 호출 흐름을 확인한 뒤, 스트리밍으로 응답이 실시간으로 흐르는 방식을 보여드리겠습니다.",
        tips: [
          // ① 펑션 콜링
          "① 펑션 콜링\n" +
            "- AI가 필요한 순간 외부 도구를 호출해 사실(데이터)·행동(계산/트리거)을 수행하는 방식.\n" +
            "- 더 빠르고, 더 정확하고, 더 신뢰 가능한 에이전트가 된다. (환각↓, 비용/지연↓, 감사/재현↑)\n" +
            "- 펑션 콜링은 데이터가 근거인 답변을 만들고, 스트리밍과 결합하면 즉시성·신뢰성까지 확보한 실전형 AI 에이전트가 된다.",

          // ③ 스트리밍 응답
          "③ 스트리밍\n" +
            "- 스트리밍은 모델이 생성한 전체 답변을 다 기다렸다가 보내는 대신, 단어·문장 단위로 잘라서 순차적으로 보내는 방식입니다.\n" +
            "- 장점:\n" +
            "  · 긴 답변도 바로바로 타이핑되는 것처럼 보여서 체감 속도가 빨라집니다.\n" +
            "  · 중간에 내용을 끊거나, 다음 질문으로 자연스럽게 이어가기 좋습니다.\n" +
            "- 기술적으로는 서버에서 Gemini의 스트리밍 API를 사용해 토큰 조각을 받으면서, 브라우저로도 스트림(ReadableStream/SSE 등) 형태로 전달합니다.\n" +
            "- 펑션 콜링과 스트리밍을 함께 쓰면, \"필요할 때 함수 호출 → 결과를 반영한 최종 답변을 스트리밍\"하는 식으로 보다 자연스러운 대화형 에이전트를 만들 수 있습니다.",
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
    // 발표 노트(발표자용, 화면에는 안 보임)
    // - /vision에서는 실습 시작 전에 이 모달을 잠깐 열어서
    //   · 오늘 다룰 주제가 "이미지까지 보는 AI"라는 점
    //   · Gemini 비전이 받는 입력 구조(텍스트 + 이미지)
    //   · 일부러 어려운 이미지를 넣었을 때의 실패 사례
    //   를 짧게 소개하고, 바로 실제 이미지 예시로 넘어가는 흐름으로 진행하면 좋음.
    if (path === "/vision") {
      return {
        title: "6장: Gemini 비전으로 이미지 이해하기",
        description:
          "/vision 페이지에서는 이미지를 입력해서 Gemini 비전이 장면과 텍스트를 어떻게 읽는지 확인하는 실습을 진행합니다. 아래 3가지 관점으로 정리해서 볼 수 있습니다.",
        tips: [
          // ① 6장의 목표
          "① 6장의 목표: 텍스트를 넘어 이미지를 이해하는 AI\n" +
            "- 텍스트만 처리하는 챗봇이 아니라, 이미지까지 함께 다루는 멀티모달 에이전트를 경험합니다.\n" +
            "- 인터넷 이미지나 화면 캡처를 넣고, 장면·구조·텍스트를 어떻게 설명하는지 살펴봅니다.\n" +
            "- 이미지 이해 기능이 요약, 설명, 문제점 분석 등 다양한 관점으로 확장될 수 있음을 확인합니다.",

          // ② Gemini 비전 동작 방식
          "② Gemini 비전: 이미지 + 텍스트를 함께 이해하는 방식\n" +
            "- Gemini 비전 모델은 텍스트와 이미지(사진, 스크린샷, 다이어그램 등)를 함께 입력으로 받습니다.\n" +
            "- 브라우저에서 이미지 업로드 또는 URL 입력 → 서버에서 Gemini API 호출 → 결과를 자연어로 출력하는 구조를 사용합니다.\n" +
            "- 어떤 정보를 중심으로 보게 할지(레이아웃, 텍스트 내용, 그래프 추세 등), 어떤 톤과 난이도로 설명할지(예: 초급자용, 기획자용)를 프롬프트로 지정할 수 있습니다.",

          // ③ 한계 정리
          "③ Gemini 비전의 한계\n" +
            "- 작은 글씨나 흐릿한 영역은 잘못 읽거나 아예 인식하지 못할 수 있습니다.\n" +
            "- 최신 로고, 특정 건물/장소/인물 인식은 항상 정확하지 않습니다.\n" +
            "- 확실하지 않은 내용을 그럴듯하게 추측해 말하는 경우가 있습니다.\n" +
            "- 실제로 사용할 때는 사람이 결과를 검수한다는 전제 아래 보조 도구로 활용하는 것이 안전합니다.",
        ],
      };
    }

    // 발표 노트(발표자용, 화면에는 안 보임)
    // - /vision-quiz에서는
    //   · 같은 이미지로 한국어/영어, 난이도 옵션을 바꿨을 때 문제 스타일이 어떻게 달라지는지
    //   · TTS를 붙였을 때 실제 듣기 평가처럼 동작하는 모습
    //   을 보여주면 참가자들이 활용 장면을 더 잘 떠올릴 수 있음.
    if (path === "/vision-quiz") {
      return {
        title: "이미지 기반 퀴즈 만들기 (Gemini 비전)",
        description:
          "/vision-quiz 페이지에서는 이미지를 분석해서 자동으로 퀴즈를 만들어 보는 실습을 진행합니다. 아래 3가지 관점으로 정리해서 볼 수 있습니다.",
        tips: [
          // ① 이미지 → 퀴즈 흐름
          "① 이미지에서 퀴즈로 이어지는 흐름\n" +
            "- 이미지를 입력하면 Gemini 비전이 장면, 텍스트, 상황을 분석합니다.\n" +
            "- 분석 결과를 바탕으로 질문, 보기, 정답, 해설까지 포함된 퀴즈 형태로 구조화합니다.\n" +
            "- 핵심은 이미지를 단순 설명하는 수준을 넘어서, 평가·학습에 바로 활용할 수 있는 문제 형식으로 바꾸는 데 있습니다.",

          // ② 영어 문제 / 난이도
          "② Gemini 비전으로 만드는 영어 문제와 난이도 조절\n" +
            "- 같은 이미지를 한국어뿐 아니라 영어 문제로도 만들 수 있습니다.\n" +
            "- 난이도(예: 초급/중급/고급)에 따라 어휘 수준과 문장 구조를 달리할 수 있습니다.\n" +
            "- 정답뿐 아니라 간단한 해설까지 함께 생성해, 학습용 퀴즈로 활용할 수 있습니다.",

          // ③ TTS + 응용
          "③ TTS 결합과 실무 응용 아이디어\n" +
            "- 생성된 퀴즈 텍스트를 TTS와 결합하면 듣기 평가나 음성 기반 퀴즈 형태로 확장할 수 있습니다.\n" +
            "- 예시 응용:\n" +
            "  · 제품 사진이나 매뉴얼 이미지를 기반으로 한 교육용 퀴즈 자동 생성\n" +
            "  · 안전/서비스 교육에서 현장 사진을 활용한 OJT용 문제 생성\n" +
            "  · 마케팅·디자인 시안을 넣고 내부 교육용 이해도 체크 퀴즈 제작\n" +
            "- 이런 흐름을 통해 \"이미지 분석 → 퀴즈 생성 → TTS\"까지 하나의 작은 파이프라인으로 묶어 볼 수 있습니다.",
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
          {
            pathname !== "/" && ( // ✅ 랜딩 페이지('/')에서는 버튼 숨기기
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
            )
          }
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
