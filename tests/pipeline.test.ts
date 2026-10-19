import { describe, expect, it } from "vitest";
import { runCheck } from "@/lib/pipeline";
import { FakeLLM } from "@/lib/llm";
import { TtlCache } from "@/lib/cache";
import placeFx from "./fixtures/google-place.json";
import nearbyFx from "./fixtures/tripadvisor-nearby.json";
import taReviewsFx from "./fixtures/tripadvisor-reviews.json";
import taDetailsFx from "./fixtures/tripadvisor-details.json";
import psiFx from "./fixtures/pagespeed.json";
import psiFastFx from "./fixtures/pagespeed-no-booking.json";
import nearbyGoogleFx from "./fixtures/google-nearby.json";
import { readFileSync } from "node:fs";
import path from "node:path";
const home = readFileSync(path.join(__dirname, "fixtures/home.html"), "utf8");
const html = (body: string) => new Response(body, { status: 200, headers: { "content-type": "text/html" } });
import good from "./fixtures/llm-good.json";
import bad from "./fixtures/llm-hallucinated.json";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function router(overrides: Record<string, () => Response | Promise<Response>> = {}) {
  return async (url: string) => {
    for (const [prefix, fn] of Object.entries(overrides)) if (url.includes(prefix)) return fn();
    if (url.includes("places.googleapis.com/v1/places:searchNearby")) return json(nearbyGoogleFx);
    if (url.includes("places.googleapis.com/v1/places/")) return json(placeFx);
    if (url.includes("harborside-inn-example.com")) return html(home);
    if (url.includes("-example.com")) return html("<p>Parking is free on site. Pets welcome.</p>");
    if (url.includes("terra.tripadvisor.com/api/locations/nearby")) return json(nearbyFx);
    if (url.includes("terra.tripadvisor.com/api/locations/555002/reviews")) return json(taReviewsFx);
    if (url.includes("terra.tripadvisor.com/api/locations/555002")) return json(taDetailsFx);
    if (url.includes("pagespeedonline")) return url.includes("harborside") ? json(psiFx) : json(psiFastFx);
    throw new Error("unexpected url " + url);
  };
}

const env = { GOOGLE_PLACES_API_KEY: "g", TRIPADVISOR_API_KEY: "t", PAGESPEED_API_KEY: "p" };
const fresh = () => new TtlCache<unknown>({ ttlMs: 600_000 });

describe("runCheck", () => {
  it("joins all sources into one report", async () => {
    const report = await runCheck({ placeId: "ChIJexampleHarborside", audience: "public" }, { fetchImpl: router(), llm: new FakeLLM([JSON.stringify(good)]), env, checkedAt: "2026-10-18", cache: fresh() });
    expect(report.hotel.name).toBe("Harborside Inn");
    expect(report.sample.total).toBe(8);
    expect(report.sections.listing.tripadvisorRanking).toBe("#12 of 48 hotels in Portland");
    expect(report.sections.website.available).toBe(true);
    expect(report.praise[0].count).toBe(4);
    expect(report.aiDropped).toEqual([]);
    // gap check: parking is asked about and absent from the site; check-in is on the site
    expect(report.findings.find((f) => f.id === "gap-parking")).toBeDefined();
    expect(report.findings.find((f) => f.id === "gap-check-in")).toBeUndefined();
    // neighbour comparison: 5 neighbours, 4 with websites get a PageSpeed run (score 91 each)
    expect(report.sections.comparison).toMatchObject({ available: true, neighbours: 5 });
    expect(report.sections.comparison.mobileScore).toMatchObject({ yours: 38, neighboursAvg: 91, basis: 4 });
  });

  it("never fetches reviews for neighbours", async () => {
    const seen: string[] = [];
    const base = router();
    const fetchImpl = async (url: string, init?: RequestInit) => { seen.push(url + " " + ((init?.headers as Record<string, string>)?.["X-Goog-FieldMask"] ?? "")); return base(url); };
    await runCheck({ placeId: "ChIJexampleHarborside", audience: "public" }, { fetchImpl, llm: new FakeLLM([JSON.stringify(good)]), env, checkedAt: "2026-10-18", cache: fresh() });
    const placeDetailCalls = seen.filter((s) => s.includes("places.googleapis.com/v1/places/") && s.includes("reviews"));
    expect(placeDetailCalls).toHaveLength(1);
  });

  it("still returns a report when the neighbour search fails", async () => {
    const fetchImpl = router({ "places:searchNearby": () => json({ error: "x" }, 500) });
    const report = await runCheck({ placeId: "ChIJexampleHarborside", audience: "public" }, { fetchImpl, llm: new FakeLLM([JSON.stringify(good)]), env, checkedAt: "2026-10-18", cache: fresh() });
    expect(report.sections.comparison).toEqual({ available: false });
    expect(report.findings.find((f) => f.id === "slow-mobile")).toBeDefined();
  });

  it("still returns a report when Tripadvisor and PageSpeed fail", async () => {
    const fetchImpl = router({
      "terra.tripadvisor.com": () => json({ message: "boom" }, 500),
      "pagespeedonline": () => { throw new Error("timeout"); },
      "-example.com": () => { throw new Error("connection refused"); },
    });
    const report = await runCheck({ placeId: "ChIJexampleHarborside", audience: "public" }, { fetchImpl, llm: new FakeLLM([JSON.stringify(good)]), env, checkedAt: "2026-10-18", cache: fresh() });
    expect(report.sections.tripadvisor.available).toBe(false);
    expect(report.sections.website.available).toBe(false);
    expect(report.sample).toEqual({ googleReviews: 5, tripadvisorReviews: 0, total: 5 });
    expect(report.hotel.name).toBe("Harborside Inn");
  });

  it("falls back to the plain page fetch for website checks when PageSpeed fails", async () => {
    const fetchImpl = router({ "pagespeedonline": () => json({ error: "quota" }, 429) });
    const report = await runCheck({ placeId: "ChIJexampleHarborside", audience: "public" }, { fetchImpl, llm: new FakeLLM([JSON.stringify(good)]), env, checkedAt: "2026-10-18", cache: fresh() });
    expect(report.sections.website.available).toBe(true);
    expect(report.sections.website.source).toBe("html");
    expect(report.sections.website.bookingEngine?.vendor).toBe("SynXis");
    expect(report.sections.comparison.mobileScore).toBeNull(); // no PSI anywhere → no speed comparison
  });

  it("fails when Google fails, because the report has nothing to stand on", async () => {
    const fetchImpl = router({ "places.googleapis.com": () => json({ error: "x" }, 500) });
    await expect(runCheck({ placeId: "bad", audience: "public" }, { fetchImpl, llm: new FakeLLM([]), env, checkedAt: "2026-10-18", cache: fresh() })).rejects.toThrow();
  });

  it("marks the AI section unavailable, not the whole report, when the model fails twice", async () => {
    const report = await runCheck({ placeId: "ChIJexampleHarborside", audience: "public" }, { fetchImpl: router(), llm: new FakeLLM(["nope", "nope"]), env, checkedAt: "2026-10-18", cache: fresh() });
    expect(report.sections.ai.available).toBe(false);
    expect(report.praise).toEqual([]);
    expect(report.topFixes.length).toBeGreaterThan(0);
  });

  it("does not fetch or grade a Facebook page as the hotel's website", async () => {
    const seen: string[] = [];
    const base = router({ "places.googleapis.com/v1/places/": () => json({ ...placeFx, websiteUri: "https://www.facebook.com/HarborsideInn" }) });
    const fetchImpl = async (url: string) => { seen.push(url); return base(url); };
    const report = await runCheck({ placeId: "ChIJexampleHarborside", audience: "public" }, { fetchImpl, llm: new FakeLLM([JSON.stringify(good)]), env, checkedAt: "2026-10-18", cache: fresh() });
    expect(seen.some((u) => u.includes("facebook.com") && !u.includes("pagespeedonline"))).toBe(false);
    expect(seen.some((u) => u.includes("pagespeedonline") && u.includes("facebook"))).toBe(false);
    expect(report.score.website).toBe(0);
    expect(report.findings.find((f) => f.id === "no-website")).toBeDefined();
    expect(report.sections.gapCheck).toEqual({ siteText: "no website", pagesRead: 0 });
  });

  it("calls a page with almost no text unreadable and makes no 'not on your site' claims", async () => {
    const shell = "<html><body><div id=\"root\"></div><script>render()</script></body></html>";
    const fetchImpl = router({ "https://www.harborside-inn-example.com": () => html(shell) });
    const report = await runCheck({ placeId: "ChIJexampleHarborside", audience: "public" }, { fetchImpl, llm: new FakeLLM([JSON.stringify(good)]), env, checkedAt: "2026-10-18", cache: fresh() });
    expect(report.sections.gapCheck).toEqual({ siteText: "unreadable", pagesRead: 1 });
    expect(report.findings.some((f) => f.id.startsWith("gap-"))).toBe(false);
    expect(report.findings.find((f) => f.id === "site-unreadable")).toBeDefined();
    expect(report.findings.find((f) => f.id === "question-parking")).toBeDefined();
  });
});

describe("run log", () => {
  const secretEnv = { GOOGLE_PLACES_API_KEY: "g-secret-key-123", TRIPADVISOR_API_KEY: "t-secret-key-456", PAGESPEED_API_KEY: "p-secret-key-789" };
  const reviewTexts = (placeFx as { reviews: { text: { text: string } | string }[] }).reviews.map((r) => (typeof r.text === "string" ? r.text : r.text.text));

  it("writes exactly one line per successful run, with numbers only", async () => {
    const lines: unknown[] = [];
    await runCheck({ placeId: "ChIJexampleHarborside", audience: "public" }, { fetchImpl: router(), llm: new FakeLLM([JSON.stringify(good)]), env: secretEnv, checkedAt: "2026-10-18", cache: fresh(), log: (e) => lines.push(e) });
    expect(lines).toHaveLength(1);
    const entry = lines[0] as Record<string, unknown>;
    expect(entry).toMatchObject({
      event: "report_run", ok: true, failedAt: null,
      sections: { website: true, comparison: true, ai: true, tripadvisor: true },
      websiteSource: "lighthouse", siteText: "read", pagesRead: 1, quotesOffered: 11, quotesDropped: 0, neighbours: 5,
    });
    expect(typeof entry.wallMs).toBe("number");
    expect(entry.wallMs as number).toBeGreaterThanOrEqual(0);
    expect(Object.keys(entry).sort()).toEqual(["event", "failedAt", "neighbours", "ok", "pagesRead", "quotesDropped", "quotesOffered", "sections", "siteText", "wallMs", "websiteSource"]);
    const text = JSON.stringify(entry);
    expect(text).not.toContain("secret-key");
    expect(text).not.toContain("Harborside");
    expect(text).not.toContain("ChIJ");
    for (const t of reviewTexts) expect(text).not.toContain(t.slice(0, 30));
  });

  it("counts invented quotes when the model makes things up", async () => {
    const lines: { quotesOffered: number; quotesDropped: number }[] = [];
    await runCheck({ placeId: "ChIJexampleHarborside", audience: "public" }, { fetchImpl: router(), llm: new FakeLLM([JSON.stringify(bad)]), env, checkedAt: "2026-10-18", cache: fresh(), log: (e) => lines.push(e as never) });
    expect(lines[0].quotesOffered).toBe(6);
    expect(lines[0].quotesDropped).toBeGreaterThan(0);
  });

  it("records the AI as unavailable with null quote counts when the model fails twice", async () => {
    const lines: Record<string, unknown>[] = [];
    await runCheck({ placeId: "ChIJexampleHarborside", audience: "public" }, { fetchImpl: router(), llm: new FakeLLM(["nope", "nope"]), env, checkedAt: "2026-10-18", cache: fresh(), log: (e) => lines.push(e as never) });
    expect(lines[0]).toMatchObject({ ok: true, quotesOffered: null, sections: { ai: false } });
  });

  it("still logs once when Google fails, then rethrows", async () => {
    const lines: Record<string, unknown>[] = [];
    const fetchImpl = router({ "places.googleapis.com": () => json({ error: "x" }, 500) });
    await expect(runCheck({ placeId: "bad", audience: "public" }, { fetchImpl, llm: new FakeLLM([]), env, checkedAt: "2026-10-18", cache: fresh(), log: (e) => lines.push(e as never) })).rejects.toThrow();
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ event: "report_run", ok: false, failedAt: "google", sections: null, quotesOffered: null, neighbours: null });
  });

  it("never lets a broken logger break the report", async () => {
    const report = await runCheck({ placeId: "ChIJexampleHarborside", audience: "public" }, { fetchImpl: router(), llm: new FakeLLM([JSON.stringify(good)]), env, checkedAt: "2026-10-18", cache: fresh(), log: () => { throw new Error("log sink down"); } });
    expect(report.hotel.name).toBe("Harborside Inn");
  });
});

describe("key pages, budgets and cache", () => {
  const homeWithFaq = home.replace("</body>", '<a href="/faq">FAQ</a><a href="/gallery">Gallery</a></body>');

  it("reads the FAQ page too, so parking on the FAQ counts as answered", async () => {
    const seen: string[] = [];
    const base = router({
      "harborside-inn-example.com/faq": () => html("<h1>FAQ</h1><p>Parking: free parking garage behind the inn, first come first served, and we do allow pets.</p>" + " more text ".repeat(30)),
      "harborside-inn-example.com/gallery": () => html("<img src='a.jpg'>"),
      "harborside-inn-example.com": () => html(homeWithFaq),
    });
    const fetchImpl = async (url: string) => { seen.push(url); return base(url); };
    const report = await runCheck({ placeId: "ChIJexampleHarborside", audience: "public" }, { fetchImpl, llm: new FakeLLM([JSON.stringify(good)]), env, checkedAt: "2026-10-18", cache: fresh() });
    expect(seen).toContain("https://www.harborside-inn-example.com/faq");
    expect(seen.some((u) => u.endsWith("/gallery"))).toBe(false);
    expect(report.sections.gapCheck).toEqual({ siteText: "read", pagesRead: 2 });
    expect(report.findings.find((f) => f.id === "gap-parking")).toBeUndefined();
    expect(report.findings.find((f) => f.id === "question-parking")!.severity).toBe("low");
  });

  it("keeps going when an extra page fails or is too slow", async () => {
    const fetchImpl = router({
      "harborside-inn-example.com/faq": () => new Promise<Response>(() => { /* never resolves */ }),
      "harborside-inn-example.com": () => html(homeWithFaq),
    });
    const report = await runCheck({ placeId: "ChIJexampleHarborside", audience: "public" }, { fetchImpl, llm: new FakeLLM([JSON.stringify(good)]), env, checkedAt: "2026-10-18", cache: fresh(), extraPagesBudgetMs: 50 });
    expect(report.sections.gapCheck).toEqual({ siteText: "read", pagesRead: 1 });
    expect(report.findings.find((f) => f.id === "gap-parking")).toBeDefined();
  });

  it("gives up on a neighbour whose PageSpeed never returns, within the budget", async () => {
    const fetchImpl = router({ "pagespeedonline": () => Promise.race([new Promise<Response>(() => {}), new Promise<Response>((r) => setTimeout(() => r(json(psiFx)), 5))]) });
    const slow = router({ "pagespeedonline": () => new Promise<Response>(() => {}) });
    const mixed = async (url: string) => (url.includes("pagespeedonline") && url.includes("oldport-harbor") ? slow(url) : fetchImpl(url));
    const report = await runCheck({ placeId: "ChIJexampleHarborside", audience: "public" }, { fetchImpl: mixed, llm: new FakeLLM([JSON.stringify(good)]), env, checkedAt: "2026-10-18", cache: fresh(), neighbourBudgetMs: 100 });
    expect(report.sections.comparison).toMatchObject({ available: true, neighbours: 5 });
    expect(report.sections.comparison.mobileScore).toMatchObject({ basis: 3 });
  });

  it("reuses PageSpeed and neighbour results for ten minutes, never place details or reviews", async () => {
    const seen: string[] = [];
    const base = router();
    const fetchImpl = async (url: string) => { seen.push(url); return base(url); };
    const cache = fresh();
    const opts = { fetchImpl, llm: new FakeLLM([JSON.stringify(good), JSON.stringify(good)]), env, checkedAt: "2026-10-18", cache };
    await runCheck({ placeId: "ChIJexampleHarborside", audience: "public" }, opts);
    const firstPsi = seen.filter((u) => u.includes("pagespeedonline")).length;
    expect(firstPsi).toBe(5); // the hotel + 4 neighbours with websites
    await runCheck({ placeId: "ChIJexampleHarborside", audience: "public" }, opts);
    expect(seen.filter((u) => u.includes("pagespeedonline")).length).toBe(firstPsi);
    expect(seen.filter((u) => u.includes("places:searchNearby")).length).toBe(1);
    expect(seen.filter((u) => u.includes("places.googleapis.com/v1/places/ChIJ")).length).toBe(2);
  });
});

describe("TtlCache", () => {
  it("returns a value until it expires, and evicts the oldest past max", () => {
    let now = 1000;
    const c = new TtlCache<string>({ ttlMs: 100, now: () => now, max: 2 });
    c.set("a", "1");
    expect(c.get("a")).toBe("1");
    now += 101;
    expect(c.get("a")).toBeUndefined();
    c.set("b", "2"); c.set("c", "3"); c.set("d", "4");
    expect(c.get("b")).toBeUndefined();
    expect(c.get("d")).toBe("4");
  });
});
