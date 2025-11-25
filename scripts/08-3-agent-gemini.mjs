// scripts/08-3-agent-gemini.mjs
import "dotenv/config";
import * as z from "zod";
import { createAgent, tool } from "langchain";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

/** 1) Gemini 모델 설정 */
const llm = new ChatGoogleGenerativeAI({
  model: process.env.GEMINI_MODEL,
  apiKey: process.env.GEMINI_API_KEY,
  temperature: 0,
  streaming: true, // 🔥 스트리밍 활성화
});

/** 2) 일반 JS 함수 → LangChain 도구로 감싸기
 *
 *  - 두 숫자의 합, 곱, 차, 나눗셈을 계산해주는 도구
 *  - 파이썬의 @tool + Pydantic 역할을
 *    JS에서는 tool() + zod 가 대신해줌
 */
const calculatorTool = tool(
  async ({ a, b }) => {
    // 실제 비즈니스 로직
    const sum = a + b;
    const diff = a - b;
    const prod = a * b;
    const div = b !== 0 ? a / b : null;

    return {
      a,
      b,
      sum,
      diff,
      prod,
      div,
      message:
        b === 0
          ? "0으로는 나눌 수 없어서 나눗셈 결과는 null 로 돌려줬어요."
          : "계산이 완료되었습니다.",
    };
  },
  {
    // 도구 메타데이터 (이름/설명/스키마)
    name: "calculator",
    description:
      "두 숫자의 합, 차, 곱, 나눗셈 결과를 계산해주는 도구입니다. " +
      "금융/통계/간단한 수학 계산을 도와줄 때 사용하세요.",
    schema: z.object({
      a: z
        .number()
        .describe("첫 번째 숫자. 사용자 질문에서 추출한 실수/정수."),
      b: z
        .number()
        .describe("두 번째 숫자. 사용자 질문에서 추출한 실수/정수."),
    }),
  }
);

/** 2) 텍스트 통계 도구: 글자 수, 단어 수 등 */
const textStatsTool = tool(
  async ({ text }) => {
    const length = text.length;
    // 단순 공백 기준 단어 수
    const words = text
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0);
    const wordCount = words.length;
    const approxCharNoSpaces = text.replace(/\s+/g, "").length;

    return {
      text,
      length,
      wordCount,
      approxCharNoSpaces,
      message:
        "문장 길이와 단어 수를 계산했어요. 요약에 참고해서 설명해 주세요.",
    };
  },
  {
    name: "text_stats",
    description:
      "주어진 문장의 길이, 단어 수 등을 계산해서 텍스트 통계를 알려주는 도구입니다.",
    schema: z.object({
      text: z.string().describe("분석할 원본 문장."),
    }),
  }
);

/** 3) 날짜 차이 도구: 두 날짜 사이 일수 계산 */
const dateDiffTool = tool(
  async ({ from, to }) => {
    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return {
        from,
        to,
        daysDiff: null,
        message:
          "날짜 형식이 잘못되었습니다. 가능하면 YYYY-MM-DD 형태로 넣어 주세요.",
      };
    }

    const diffMs = toDate.getTime() - fromDate.getTime();
    const days = Math.round(diffMs / (1000 * 60 * 60 * 24));

    return {
      from,
      to,
      daysDiff: days,
      message: "두 날짜 사이의 일수 차이를 계산했습니다.",
    };
  },
  {
    name: "date_diff",
    description:
      "두 날짜(from, to) 사이의 일수 차이를 계산해주는 도구입니다. " +
      "YYYY-MM-DD 형식의 날짜에 가장 잘 동작합니다.",
    schema: z.object({
      from: z
        .string()
        .describe("시작 날짜. 가능하면 YYYY-MM-DD 형태의 문자열."),
      to: z
        .string()
        .describe("끝 날짜. 가능하면 YYYY-MM-DD 형태의 문자열."),
    }),
  }
);

/** 3) 에이전트 만들기
 *
 *  - model: Gemini LLM
 *  - tools: calculatorTool
 *  - systemPrompt: 이 에이전트의 성격 / 역할 정의
 */
const agent = createAgent({
  model: llm,
  tools: [calculatorTool, textStatsTool, dateDiffTool],
  systemPrompt: `
너는 한국어로 대답하는 똑똑한 도우미야.

너에게는 다음 세 가지 도구가 있어:
1) calculator: 숫자 계산(합, 차, 곱, 나눗셈)
2) text_stats: 문장 길이, 단어 수 등의 텍스트 통계
3) date_diff: 두 날짜 사이의 일수 차이 계산

중요:
- 사용자 질문에 "숫자 계산"이 포함되어 있으면,
  반드시 calculator 도구를 사용해서 계산해.
  (절대로 머릿속으로 대충 계산하지 마.)
- 사용자 질문에 "문장 분석"이나 "글자 수/단어 수"가 포함되어 있으면,
  반드시 text_stats 도구를 사용해서 분석해.
- 사용자의 질문이 여러 개의 요구사항을 담고 있다면,
  각각의 요구사항을 모두 처리해야 해.
  (예: 첫째는 계산, 둘째는 문장 분석 → 두 도구를 모두 사용)

도구 사용 결과(JSON)를 그대로 보여주지 말고,
사람이 읽기 좋은 자연어로 풀어서 설명해 줘.
`.trim(),
});

/** 4) 실행 부분
 *
 *  - node scripts/08-3-agent-gemini.mjs "질문..."
 *  - 인자가 없으면 기본 예제 질문 사용
 */
const userInput =
  process.argv.slice(2).join(" ") ||
  "첫째, 10과 25의 합과 곱, 차를 알려주고, 둘째, 'LangChain으로 에이전트 만들기 재밌네' 문장의 글자 수와 단어 수를 분석해줘.";

console.log("사용자:", userInput);

const result = await agent.invoke({
  messages: [
    {
      role: "user",
      content: userInput,
    },
  ],
});

// createAgent()의 결과는 상태(state) 형태라서
// 마지막 메시지가 최종 답변이라고 보면 됨
const messages = result.messages ?? [];
const lastMessage = messages[messages.length - 1];

console.log("\n에이전트 응답:\n");
console.log(lastMessage?.content ?? "(응답 메시지를 찾을 수 없습니다)");
