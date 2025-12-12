// GeminiAI.js
import { GoogleGenerativeAI } from "@google/generative-ai";

class GeminiAI {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  // 모델 생성
  getGenerativeModel({ systemInstruction }) {
    return this.genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL,
      systemInstruction,
    });
  }
}

export default GeminiAI;
