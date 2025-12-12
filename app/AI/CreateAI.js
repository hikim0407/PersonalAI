// CreateAI.js
import GeminiAI from './Models/GeminiAI';
import DeepCAI from './Models/DeepCAI';

class CreateAI {
  constructor(name) {
    switch (name) {
      case "Gemini":
        this.model = new GeminiAI(process.env.GEMINI_API_KEY);
        break;
      case "DeepC":
        this.model = new DeepCAI(process.env.DEEPC_API_KEY);
        break;
      default:
        throw new Error("지원하지 않는 모델입니다.");
    }
  }

  // 모델을 반환만 함
  getModel() {
    return this.model;
  }
}

export default CreateAI;
