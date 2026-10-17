import { describe, expect, it } from "vitest";
import { runCheck } from "@/lib/pipeline";
import { FakeLLM } from "@/lib/llm";
import placeFx from "./fixtures/google-place.json";
import nearbyFx from "./fixtures/tripadvisor-nearby.json";
import taReviewsFx from "./fixtures/tripadvisor-reviews.json";
import taDetailsFx from "./fixtures/tripadvisor-details.json";
import psiFx from "./fixtures/pagespeed.json";
import good from "./fixtures/llm-good.json";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function router(overrides: Record<string, () => Response | Promise<Response>> = {}) {
  return async (url: string) => {
    for (const [prefix, fn] of Object.entries(overrides)) if (url.includes(prefix)) return fn();
    if (url.includes("places.googleapis.com/v1/places/")) return json(placeFx);
    if (url.includes("terra.tripadvisor.com/api/locations/nearby")) return json(nearbyFx);
    if (url.includes("terra.tripadvisor.com/api/locations/555002/reviews")) return json(taReviewsFx);
    if (url.includes("terra.tripadvisor.com/api/locations/555002")) return json(taDetailsFx);
    if (url.includes("pagespeedonline")) return json(psiFx);
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
  });

  it("still returns a report when Tripadvisor and PageSpeed fail", async () => {
    const fetchImpl = router({
      "terra.tripadvisor.com": () => json({ message: "boom" }, 500),
      "pagespeedonline": () => { throw new Error("timeout"); },
    });
    const report = await runCheck({ placeId: "ChIJexampleHarborside", audience: "public" }, { fetchImpl, llm: new FakeLLM([JSON.stringify(good)]), env, checkedAt: "2026-10-18" });
    expect(report.sections.tripadvisor.available).toBe(false);
    expect(report.sections.website.available).toBe(false);
    expect(report.sample).toEqual({ googleReviews: 5, tripadvisorReviews: 0, total: 5 });
    expect(report.hotel.name).toBe("Harborside Inn");
  });

  it("falls back to a plain page fetch when PageSpeed fails but the site answers", async () => {
    const fetchImpl = router({
      "pagespeedonline": () => json({ error: "quota" }, 429),
      "harborside-inn-example.com": () => new Response("<a href='https://be.synxis.com/?h=1'>Book Now</a><a href='tel:+1207'>call</a>", { status: 200, headers: { "content-type": "text/html" } }),
    });
    const report = await runCheck({ placeId: "ChIJexampleHarborside", audience: "public" }, { fetchImpl, llm: new FakeLLM([JSON.stringify(good)]), env, checkedAt: "2026-10-18" });
    expect(report.sections.website.available).toBe(true);
    expect(report.sections.website.source).toBe("html");
    expect(report.sections.website.bookingEngine?.vendor).toBe("SynXis");
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
});
