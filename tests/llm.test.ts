import { describe, expect, it, vi, afterEach } from "vitest";
import { FakeLLM, OpenRouterLLM, buildThemesPrompt, extractThemes, parseThemesJson } from "@/lib/llm";
import reviews from "./fixtures/reviews.json";
import good from "./fixtures/llm-good.json";

afterEach(() => vi.unstubAllEnvs());

describe("buildThemesPrompt", () => {
  it("includes every review with its id, framed as data, and asks for the fixed JSON shape", () => {
    const { system, user } = buildThemesPrompt(reviews);
    for (const r of reviews) {
      expect(user).toContain(`[${r.id}]`);
      expect(user).toContain(r.text);
    }
    expect(system.toLowerCase()).toMatch(/word for word|verbatim|exact/);
    expect(system.toLowerCase()).toMatch(/not instructions|treat .* as data|do not follow/);
    expect(system).toContain('"praise"');
    expect(system).toContain('"questions"');
    expect(system).toContain('"headline"');
    expect(system).toContain('"adLines"');
  });
});

describe("parseThemesJson", () => {
  it("accepts the fixed shape", () => {
    expect(parseThemesJson(JSON.stringify(good))).toEqual(good);
  });
  it("accepts JSON wrapped in a markdown code fence", () => {
    expect(parseThemesJson("```json\n" + JSON.stringify(good) + "\n```")).toEqual(good);
  });
  it("rejects missing keys, wrong types and extra prose", () => {
    expect(() => parseThemesJson("Sure! Here you go: " + JSON.stringify(good))).toThrow();
    expect(() => parseThemesJson(JSON.stringify({ ...good, praise: "lots" }))).toThrow();
    const { questions: _q, ...noQuestions } = good;
    expect(() => parseThemesJson(JSON.stringify(noQuestions))).toThrow();
    expect(() => parseThemesJson(JSON.stringify({ ...good, praise: [{ name: "x", quotes: [{ reviewId: 1, quote: "y" }] }] }))).toThrow();
  });
});

describe("FakeLLM", () => {
  it("returns the scripted replies in order and records prompts", async () => {
    const llm = new FakeLLM(["one", "two"]);
    expect(await llm.complete({ system: "s", user: "u" })).toBe("one");
    expect(await llm.complete({ system: "s2", user: "u2" })).toBe("two");
    expect(llm.calls).toEqual([{ system: "s", user: "u" }, { system: "s2", user: "u2" }]);
  });
});

describe("OpenRouterLLM", () => {
  it("posts an OpenAI-style chat completion with the key and model and returns the text", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: "{\"ok\":true}" } }] }), { status: 200 }));
    const llm = new OpenRouterLLM({ apiKey: "sk-or-test", model: "meta-llama/llama-3.3-70b-instruct:free", fetchImpl });
    const text = await llm.complete({ system: "S", user: "U" });
    expect(text).toBe("{\"ok\":true}");
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer sk-or-test");
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe("meta-llama/llama-3.3-70b-instruct:free");
    expect(body.messages).toEqual([{ role: "system", content: "S" }, { role: "user", content: "U" }]);
    expect(body.temperature).toBe(0);
  });
  it("throws with the status and never includes the key in the error", async () => {
    const llm = new OpenRouterLLM({ apiKey: "sk-or-secret", model: "m", fetchImpl: async () => new Response("rate limited", { status: 429 }) });
    await expect(llm.complete({ system: "S", user: "U" })).rejects.toThrow(/429/);
    await expect(llm.complete({ system: "S", user: "U" })).rejects.not.toThrow(/sk-or-secret/);
  });
});

describe("extractThemes", () => {
  it("runs the prompt, parses, verifies quotes and returns verified themes plus drops", async () => {
    const llm = new FakeLLM([JSON.stringify(good)]);
    const out = await extractThemes(reviews, llm);
    expect(out.praise.map((t) => t.name)).toEqual(["Location next to the Old Port", "Breakfast", "Friendly staff"]);
    expect(out.praise[0].count).toBe(4);
    expect(out.questions.map((t) => t.name)).toEqual(["Parking", "Check-in time"]);
    expect(out.headline).toBe(good.headline);
    expect(out.dropped).toEqual([]);
    expect(llm.calls[0].user).toContain("[g-1]");
  });
  it("retries once on unparseable output, then fails", async () => {
    const llm = new FakeLLM(["garbage", "still garbage"]);
    await expect(extractThemes(reviews, llm)).rejects.toThrow(/parse/i);
    expect(llm.calls).toHaveLength(2);
  });
  it("returns empty themes without calling the model when there are no reviews", async () => {
    const llm = new FakeLLM([]);
    const out = await extractThemes([], llm);
    expect(out).toEqual({ praise: [], questions: [], headline: null, adLines: [], dropped: [] });
    expect(llm.calls).toEqual([]);
  });
});
