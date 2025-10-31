// lib/agent/tools.js
// Gemini tools(functionDeclarations)만 정의
export const tools = [
  {
    functionDeclarations: [
      {
        name: "getCityTime",
        description: "도시의 현재 시간을 알려준다.",
        parameters: {
          type: "OBJECT",
          properties: {
            city: { type: "STRING", description: "예: Seoul, New York, Tokyo" },
          },
          required: ["city"],
        },
      },
      {
        name: "getCitiesTime",
        description: "여러 도시의 현재 시간을 한 번에 알려준다.",
        parameters: {
          type: "OBJECT",
          properties: {
            cities: { type: "ARRAY", items: { type: "STRING" } },
          },
          required: ["cities"],
        },
      },
      {
        name: "getNYSETime",
        description: "뉴욕(미 동부시간)의 현재 시간을 알려준다.",
        parameters: { type: "OBJECT", properties: {} },
      },
      {
        name: "getQuote",
        description: "미국 주식의 현재 시세 요약을 반환한다.",
        parameters: {
          type: "OBJECT",
          properties: {
            symbol: { type: "STRING", description: "예: AAPL, MSFT, TSLA" },
          },
          required: ["symbol"],
        },
      },
      {
        name: "getRecentPriceSeries",
        description: "최근 기간의 종가 시계열을 반환한다.",
        parameters: {
          type: "OBJECT",
          properties: {
            symbol: { type: "STRING" },
            range: { type: "STRING", description: "예: 5d, 1mo, 3mo, 6mo, 1y" },
            interval: { type: "STRING", description: "예: 1d, 1h" },
          },
          required: ["symbol"],
        },
      },
      {
        name: "getRecommendationTrend",
        description: "애널리스트 추천 트렌드(StrongBuy~Sell)를 반환한다.",
        parameters: {
          type: "OBJECT",
          properties: { symbol: { type: "STRING" } },
          required: ["symbol"],
        },
      },
    ],
  },
];
