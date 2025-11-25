// scripts/08-1-basic-gemini.mjs
import "dotenv/config";
import readline from "readline";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(q) {
  return new Promise((resolve) => rl.question(q, resolve));
}

// 1) 순정 Gemini SDK
async function callGeminiRaw(prompt) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL});

  const res = await model.generateContent([
    "너는 친절한 한국어 비서야.",
    prompt,
  ]);

  console.log("\n=== [1] 순정 Gemini SDK 응답 ===");
  console.log(res.response.text());
  console.log();
}

// 2) LangChain.js + ChatGoogleGenerativeAI
async function callLangChainGemini(prompt) {
  const model = new ChatGoogleGenerativeAI({
    model: process.env.GEMINI_MODEL,
    apiKey: process.env.GEMINI_API_KEY,
    temperature: 0.7,
  });

  const res = await model.invoke([
    new HumanMessage("너는 친절한 한국어 비서야."),
    new HumanMessage(prompt),
  ]);

  console.log("=== [2] LangChain ChatGoogleGenerativeAI 응답 ===");
  console.log(res.content);
  console.log();
}

(async () => {
  const q = await ask("질문을 입력하세요: ");
  //await callGeminiRaw(q);
  await callLangChainGemini(q);
  rl.close();
})();
