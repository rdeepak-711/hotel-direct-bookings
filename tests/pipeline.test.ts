import { describe, expect, it } from "vitest";
import { runCheck } from "@/lib/pipeline";
import { FakeLLM } from "@/lib/llm";
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

const env = { GOOGLE_PLACES_API_KEY: "g", TRIPADVISOR_API_KEY: "t", PAGESPEED_API_KEY: "" };

describe("runCheck", () => {
  it("joins all sources into one report", async () => {
    const report = await runCheck({ placeId: "ChIJexampleHarborside", audience: "public" }, { fetchImpl: router(), llm: new FakeLLM([JSON.stringify(good)]), env, checkedAt: "2026-10-18" });
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
    await runCheck({ placeId: "ChIJexampleHarborside", audience: "public" }, { fetchImpl, llm: new FakeLLM([JSON.stringify(good)]), env, checkedAt: "2026-10-18" });
    const placeDetailCalls = seen.filter((s) => s.includes("places.googleapis.com/v1/places/") && s.includes("reviews"));
    expect(placeDetailCalls).toHaveLength(1);
  });

  it("still returns a report when the neighbour search fails", async () => {
    const fetchImpl = router({ "places:searchNearby": () => json({ error: "x" }, 500) });
    const report = await runCheck({ placeId: "ChIJexampleHarborside", audience: "public" }, { fetchImpl, llm: new FakeLLM([JSON.stringify(good)]), env, checkedAt: "2026-10-18" });
    expect(report.sections.comparison).toEqual({ available: false });
    expect(report.findings.find((f) => f.id === "slow-mobile")).toBeDefined();
  });

  it("still returns a report when Tripadvisor and PageSpeed fail", async () => {
    const fetchImpl = router({
      "terra.tripadvisor.com": () => json({ message: "boom" }, 500),
      "pagespeedonline": () => { throw new Error("timeout"); },
      "-example.com": () => { throw new Error("connection refused"); },
    });
    const report = await runCheck({ placeId: "ChIJexampleHarborside", audience: "public" }, { fetchImpl, llm: new FakeLLM([JSON.stringify(good)]), env, checkedAt: "2026-10-18" });
    expect(report.sections.tripadvisor.available).toBe(false);
    expect(report.sections.website.available).toBe(false);
    expect(report.sample).toEqual({ googleReviews: 5, tripadvisorReviews: 0, total: 5 });
    expect(report.hotel.name).toBe("Harborside Inn");
  });

  it("falls back to the plain page fetch for website checks when PageSpeed fails", async () => {
    const fetchImpl = router({ "pagespeedonline": () => json({ error: "quota" }, 429) });
    const report = await runCheck({ placeId: "ChIJexampleHarborside", audience: "public" }, { fetchImpl, llm: new FakeLLM([JSON.stringify(good)]), env, checkedAt: "2026-10-18" });
    expect(report.sections.website.available).toBe(true);
    expect(report.sections.website.source).toBe("html");
    expect(report.sections.website.bookingEngine?.vendor).toBe("SynXis");
    expect(report.sections.comparison.mobileScore).toBeNull(); // no PSI anywhere → no speed comparison
  });

  it("fails when Google fails, because the report has nothing to stand on", async () => {
    const fetchImpl = router({ "places.googleapis.com": () => json({ error: "x" }, 500) });
    await expect(runCheck({ placeId: "bad", audience: "public" }, { fetchImpl, llm: new FakeLLM([]), env, checkedAt: "2026-10-18" })).rejects.toThrow();
  });

  it("marks the AI section unavailable, not the whole report, when the model fails twice", async () => {
    const report = await runCheck({ placeId: "ChIJexampleHarborside", audience: "public" }, { fetchImpl: router(), llm: new FakeLLM(["nope", "nope"]), env, checkedAt: "2026-10-18" });
    expect(report.sections.ai.available).toBe(false);
    expect(report.praise).toEqual([]);
    expect(report.topFixes.length).toBeGreaterThan(0);
  });

  it("does not fetch or grade a Facebook page as the hotel's website", async () => {
    const seen: string[] = [];
    const base = router({ "places.googleapis.com/v1/places/": () => json({ ...placeFx, websiteUri: "https://www.facebook.com/HarborsideInn" }) });
    const fetchImpl = async (url: string) => { seen.push(url); return base(url); };
    const report = await runCheck({ placeId: "ChIJexampleHarborside", audience: "public" }, { fetchImpl, llm: new FakeLLM([JSON.stringify(good)]), env, checkedAt: "2026-10-18" });
    expect(seen.some((u) => u.includes("facebook.com") && !u.includes("pagespeedonline"))).toBe(false);
    expect(seen.some((u) => u.includes("pagespeedonline") && u.includes("facebook"))).toBe(false);
    expect(report.score.website).toBe(0);
    expect(report.findings.find((f) => f.id === "no-website")).toBeDefined();
    expect(report.sections.gapCheck).toEqual({ siteText: "no website" });
  });

  it("calls a page with almost no text unreadable and makes no 'not on your site' claims", async () => {
    const shell = "<html><body><div id=\"root\"></div><script>render()</script></body></html>";
    const fetchImpl = router({ "https://www.harborside-inn-example.com": () => html(shell) });
    const report = await runCheck({ placeId: "ChIJexampleHarborside", audience: "public" }, { fetchImpl, llm: new FakeLLM([JSON.stringify(good)]), env, checkedAt: "2026-10-18" });
    expect(report.sections.gapCheck).toEqual({ siteText: "unreadable" });
    expect(report.findings.some((f) => f.id.startsWith("gap-"))).toBe(false);
    expect(report.findings.find((f) => f.id === "site-unreadable")).toBeDefined();
    expect(report.findings.find((f) => f.id === "question-parking")).toBeDefined();
  });
});

describe("run log", () => {
  const secretEnv = { GOOGLE_PLACES_API_KEY: "g-secret-key-123", TRIPADVISOR_API_KEY: "t-secret-key-456", PAGESPEED_API_KEY: "" };
  const reviewTexts = (placeFx as { reviews: { text: { text: string } | string }[] }).reviews.map((r) => (typeof r.text === "string" ? r.text : r.text.text));

  it("writes exactly one line per successful run, with numbers only", async () => {
    const lines: unknown[] = [];
    await runCheck({ placeId: "ChIJexampleHarborside", audience: "public" }, { fetchImpl: router(), llm: new FakeLLM([JSON.stringify(good)]), env: secretEnv, checkedAt: "2026-10-18", log: (e) => lines.push(e) });
    expect(lines).toHaveLength(1);
    const entry = lines[0] as Record<string, unknown>;
    expect(entry).toMatchObject({
      event: "report_run", ok: true, failedAt: null,
      sections: { website: true, comparison: true, ai: true, tripadvisor: true },
      websiteSource: "lighthouse", siteText: "read", quotesOffered: 11, quotesDropped: 0, neighbours: 5,
    });
    expect(typeof entry.wallMs).toBe("number");
    expect(entry.wallMs as number).toBeGreaterThanOrEqual(0);
    expect(Object.keys(entry).sort()).toEqual(["event", "failedAt", "neighbours", "ok", "quotesDropped", "quotesOffered", "sections", "siteText", "wallMs", "websiteSource"]);
    const text = JSON.stringify(entry);
    expect(text).not.toContain("secret-key");
    expect(text).not.toContain("Harborside");
    expect(text).not.toContain("ChIJ");
    for (const t of reviewTexts) expect(text).not.toContain(t.slice(0, 30));
  });

  it("counts invented quotes when the model makes things up", async () => {
    const lines: { quotesOffered: number; quotesDropped: number }[] = [];
    await runCheck({ placeId: "ChIJexampleHarborside", audience: "public" }, { fetchImpl: router(), llm: new FakeLLM([JSON.stringify(bad)]), env, checkedAt: "2026-10-18", log: (e) => lines.push(e as never) });
    expect(lines[0].quotesOffered).toBe(6);
    expect(lines[0].quotesDropped).toBeGreaterThan(0);
  });

  it("records the AI as unavailable with null quote counts when the model fails twice", async () => {
    const lines: Record<string, unknown>[] = [];
    await runCheck({ placeId: "ChIJexampleHarborside", audience: "public" }, { fetchImpl: router(), llm: new FakeLLM(["nope", "nope"]), env, checkedAt: "2026-10-18", log: (e) => lines.push(e as never) });
    expect(lines[0]).toMatchObject({ ok: true, quotesOffered: null, sections: { ai: false } });
  });

  it("still logs once when Google fails, then rethrows", async () => {
    const lines: Record<string, unknown>[] = [];
    const fetchImpl = router({ "places.googleapis.com": () => json({ error: "x" }, 500) });
    await expect(runCheck({ placeId: "bad", audience: "public" }, { fetchImpl, llm: new FakeLLM([]), env, checkedAt: "2026-10-18", log: (e) => lines.push(e as never) })).rejects.toThrow();
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ event: "report_run", ok: false, failedAt: "google", sections: null, quotesOffered: null, neighbours: null });
  });

  it("never lets a broken logger break the report", async () => {
    const report = await runCheck({ placeId: "ChIJexampleHarborside", audience: "public" }, { fetchImpl: router(), llm: new FakeLLM([JSON.stringify(good)]), env, checkedAt: "2026-10-18", log: () => { throw new Error("log sink down"); } });
    expect(report.hotel.name).toBe("Harborside Inn");
  });
});
