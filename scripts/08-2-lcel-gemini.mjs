// scripts/08-2-lcel-gemini.mjs
import "dotenv/config";
import readline from "readline";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(q) {
  return new Promise((resolve) => rl.question(q, resolve));
}

// ==== 0) 공통: 모델 & 출력 파서 세팅 ====
const apiKey = process.env.GEMINI_API_KEY;
const modelName = process.env.GEMINI_MODEL;

const chatModel = new ChatGoogleGenerativeAI({
  model: process.env.GEMINI_MODEL,
  apiKey: process.env.GEMINI_API_KEY,
  temperature: 0.7,
});

const stringParser = new StringOutputParser();

// ==== 1) [실습] 출력 파서와 체인 ====
// 프롬프트 → 모델 → 문자열 변환까지 한 줄로 LCEL 체인 구성
const qaPrompt = ChatPromptTemplate.fromTemplate(`
너는 친절한 한국어 비서야.
사용자 질문에 간단하고 명확하게 답해줘.

질문: {question}
`);

// LCEL 스타일 체인: prompt.pipe(model).pipe(parser)
const qaChain = qaPrompt.pipe(chatModel).pipe(stringParser);

// ==== 2) [실습] 프롬프트 템플릿 이용하기 ====
// 스타일/언어를 변수로 받는 변환 체인
const transformPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "너는 글을 재작성해주는 비서야. 사용자가 요청한 언어와 스타일에 맞춰서 문장을 바꿔줘.",
  ],
  [
    "human",
    "다음 문장을 {language} 언어로, {style} 스타일로 바꿔줘.\n\n문장: {text}",
  ],
]);

const transformChain = transformPrompt.pipe(chatModel).pipe(stringParser);

// ==== 메인 루프 ====
async function main() {
  console.log("08-2 LCEL 실습 (1: Q&A 체인, 2: 스타일/언어 변환 체인)");
  const mode = await ask("어떤 데모를 실행할까요? (1/2, 종료: q) ");

  if (mode.trim().toLowerCase() === "q") {
    rl.close();
    return;
  }

  if (mode.trim() === "1") {
    // --- Q&A 체인 ---
    while (true) {
      const q = await ask("\n[Q&A] 질문을 입력하세요 (종료: q): ");
      if (q.trim().toLowerCase() === "q") break;

      const answer = await qaChain.invoke({ question: q });
      console.log("\n[답변]");
      console.log(answer);
    }
  } else if (mode.trim() === "2") {
    // --- 스타일/언어 변환 체인 ---
    while (true) {
      const text = await ask("\n[변환] 원본 문장을 입력하세요 (종료: q): ");
      if (text.trim().toLowerCase() === "q") break;

      const language = await ask("어떤 언어로 바꿀까요? (예: Korean, English, Japanese): ");
      const style = await ask("어떤 스타일로? (예: 공손하게, 캐주얼하게, 간단하게): ");

      const result = await transformChain.invoke({
        text,
        language,
        style,
      });

      console.log("\n[변환 결과]");
      console.log(result);
    }
  } else {
    console.log("1 또는 2 중에서 선택해주세요.");
  }

  rl.close();
}

main();
