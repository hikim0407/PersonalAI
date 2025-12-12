// DeepCAI.js
import { DeepC_R1 } from "@deepc-r1/ai";

class DeepCAI {
  constructor(apiKey) {
    this.deepc = new DeepC_R1(apiKey);
  }

  // 모델 생성
  getGenerativeModel({ systemInstruction }) {
    return this.deepc.getGenerativeModel({
      model: process.env.DEEPC_MODEL,
      systemInstruction,
    });
  }
}

export default DeepCAI;
