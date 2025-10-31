import { localFns } from "./functions";

export async function handleToolCalls(chat, calls) {
    console.log("[DISPATCHER] localFns keys =", Object.keys(localFns || {}));
    for (const call of calls) {
        const { name, args } = call;
        const fn = localFns[name];
        console.log("[DISPATCHER] incoming call =", name, "fn exists?", !!fn, "args =", args);
        let resultPayload = { error: `Unknown function: ${name}` };

        if (fn) {
            try {
                const parsed = typeof args === "string" ? JSON.parse(args) : args;
                resultPayload = await fn(parsed || {});
                console.log(`[TOOL RESULT:${name}]`, JSON.stringify(resultPayload)?.slice(0, 500)); // 500자만
            } catch (e) {
                resultPayload = { error: e?.message || "Function error" };
            }
        } else {
            console.warn(`[TOOL MISSING] ${name} not found in localFns`);
        }

        // ✅ v1beta: response는 항상 Object(Struct)여야 함
        const responseObj =
          resultPayload && typeof resultPayload === "object" && !Array.isArray(resultPayload)
            ? resultPayload
            : { result: resultPayload }; // 배열/원시 → 감싸기

        console.log("responseObj", responseObj);
        await chat.sendMessage([{function_response: { name, response: responseObj }}]);
    }
}
