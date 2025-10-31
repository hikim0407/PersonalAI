// lib/agent/functions.js
import YahooFinance from "yahoo-finance2";
import { DateTime } from "luxon";

// ---- 구현 함수들 ----
async function getCityTime({ city }) {
  const tzMap = {
    seoul: "Asia/Seoul",
    "new york": "America/New_York",
    nyc: "America/New_York",
    tokyo: "Asia/Tokyo",
    london: "Europe/London",
    paris: "Europe/Paris",
    sydney: "Australia/Sydney",
    la: "America/Los_Angeles",
    "los angeles": "America/Los_Angeles",
  };
  const key = (city || "").trim().toLowerCase();
  const tz = tzMap[key] || "UTC";
  const now = DateTime.now().setZone(tz);
  return {
    city,
    timeZone: tz,
    iso: now.toISO(),
    formatted: now.toFormat("yyyy-LL-dd HH:mm:ss"),
  };
}

async function getCitiesTime({ cities }) {
  const list = Array.isArray(cities) ? cities : [];
  const out = [];
  for (const c of list) out.push(await getCityTime({ city: c }));
  return out;
}

async function getNYSETime() {
  return getCityTime({ city: "New York" });
}

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

async function getQuote({ symbol }) {
     try {
        const arr = await yf.quote([symbol]); // 단일 심볼도 배열로
        const q = Array.isArray(arr) ? arr[0] : arr;
        if (!q) return { error: "empty quote", symbol };

        return {
            symbol: q.symbol,
            shortName: q.shortName,
            currency: q.currency,
            marketState: q.marketState,
            regularMarketPrice: q.regularMarketPrice,
            regularMarketChange: q.regularMarketChange,
            regularMarketChangePercent: q.regularMarketChangePercent,
            regularMarketTime: q.regularMarketTime,
            fiftyTwoWeekRange: q.fiftyTwoWeekRange,
            marketCap: q.marketCap,
        };
    } catch (e) {
        console.error("[YF CHART ERR]", {
            name: e?.name, message: e?.message, code: e?.code,
            cause: {
                name: e?.cause?.name, message: e?.cause?.message,
                code: e?.cause?.code, errno: e?.cause?.errno,
                syscall: e?.cause?.syscall, address: e?.cause?.address, hostname: e?.cause?.hostname
            }
        });
        return { error: e?.message || "quote failed", symbol };
    }
}


async function getRecentPriceSeries({ symbol, range = "6mo", interval = "1d" }) {
    const { period1, period2 } = rangeToPeriods(range);
    const iv = normalizeInterval(interval);

    try {
        const res = await yf.chart(symbol, {
            period1,
            period2,
            interval: iv,
            includePrePost: false,
            return: "object", // 결과를 object 형태로 (필드명은 문서에 존재)
        });
        const points = (res?.quotes ?? []).map((d) => ({
            date: new Date(d.date).toISOString().slice(0, 10),
            close: d.close,
        }));
        if (!points.length) {
            return { error: "empty series", symbol, range, interval: iv };
        }
        return { symbol, range, interval: iv, points };
    } catch (e) {
        console.error("[YF CHART ERR]", {
            name: e?.name, message: e?.message, code: e?.code,
            cause: {
                name: e?.cause?.name, message: e?.cause?.message,
                code: e?.cause?.code, errno: e?.cause?.errno,
                syscall: e?.cause?.syscall, address: e?.cause?.address, hostname: e?.cause?.hostname
            }
        });
        return { error: e?.message || "chart failed", symbol, range, interval: iv }
    }
}

async function getRecommendationTrend({ symbol }) {
  const sum = await yf.quoteSummary(symbol, {
    modules: ["recommendationTrend"],
  });
  const trend = sum?.recommendationTrend?.trend ?? [];
  return { symbol, trend };
}

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

function monthsAgoSec(n) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return Math.floor(d.getTime() / 1000);
}


// 한글/비표준 입력 정규화는 계속 유지하되, chart에는 최종적으로 period1/period2를 넣습니다.
function rangeToPeriods(range) {
  const t = String(range || "6mo").toLowerCase();
  if (t === "6mo") return { period1: monthsAgoSec(6), period2: nowSec() };
  if (t === "3mo") return { period1: monthsAgoSec(3), period2: nowSec() };
  if (t === "1mo") return { period1: monthsAgoSec(1), period2: nowSec() };
  if (t === "5d")  { // 5일
    const d = new Date(); d.setDate(d.getDate() - 5);
    return { period1: Math.floor(d.getTime() / 1000), period2: nowSec() };
  }
  if (t === "1y")  return { period1: monthsAgoSec(12), period2: nowSec() };
  // 기본값
  return { period1: monthsAgoSec(6), period2: nowSec() };
}

function normalizeInterval(s) {
  const t = String(s || "1d").toLowerCase();
  if (/(^1d$|일봉|daily)/.test(t)) return "1d";
  if (/(^1h$|1\s*시간|hour)/.test(t)) return "1h";
  return "1d";
}


// ---- export: 개별 + 매핑 객체 ----
export {
  getCityTime,
  getCitiesTime,
  getNYSETime,
  getQuote,
  getRecentPriceSeries,
  getRecommendationTrend,
};

export const localFns = {
  getCityTime,
  getCitiesTime,
  getNYSETime,
  getQuote,
  getRecentPriceSeries,
  getRecommendationTrend,
};
