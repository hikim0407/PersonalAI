// scripts/08-1-multiturn-gemini.mjs
import "dotenv/config";
import readline from "readline";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, AIMessage } from "@langchain/core/messages";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(q) {
  return new Promise((resolve) => rl.question(q, resolve));
}

function buildModel() {
  const llm = new ChatGoogleGenerativeAI({
    model: process.env.GEMINI_MODEL,
    apiKey: process.env.GEMINI_API_KEY,
    temperature: 0.7,
  });

  return llm;
}

async function main() {
  console.log("Gemini 멀티턴 챗봇 시작! (종료: exit / quit)");

  const llm = buildModel();

  /** 🔥 여기서가 ‘메모리’ 역할을 하는 부분 */
  /** LangChain Memory 대신 그냥 메시지 배열로 관리 */
  const history = [
    new HumanMessage("너는 친절한 한국어 비서야."),
  ];

  while (true) {
    const input = await ask("\n나: ");
    if (["exit", "quit"].includes(input.trim().toLowerCase())) {
      console.log("챗봇 종료");
      break;
    }

    // 1) 사용자의 새 메시지를 history에 추가
    history.push(new HumanMessage(input));

    // 2) 지금까지의 전체 history를 모델에 넣어서 호출
    const res = await llm.invoke(history);

    // 3) 답변 출력
    console.log(`봇: ${res.content}`);

    // 4) AI의 응답도 history에 추가
    history.push(res);
  }

  rl.close();
}

main();
