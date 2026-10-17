import { afterEach, describe, expect, it, vi } from "vitest";
import { POST as reportPOST } from "@/app/api/report/route";
import { GET as searchGET } from "@/app/api/search/route";
import { RateLimiter } from "@/lib/ratelimit";

afterEach(() => vi.unstubAllEnvs());

function req(url: string, init?: RequestInit) {
  return new Request("http://localhost" + url, init);
}

describe("fixture mode", () => {
  it("GET /api/search returns hotels from fixtures when SOURCES_MODE=fixture", async () => {
    vi.stubEnv("SOURCES_MODE", "fixture");
    const res = await searchGET(req("/api/search?q=harborside"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results[0]).toMatchObject({ placeId: "ChIJexampleHarborside", name: "Harborside Inn" });
  });

  it("GET /api/search rejects an empty query", async () => {
    vi.stubEnv("SOURCES_MODE", "fixture");
    expect((await searchGET(req("/api/search?q="))).status).toBe(400);
  });

  it("POST /api/report builds a full report from fixtures with the fake model", async () => {
    vi.stubEnv("SOURCES_MODE", "fixture");
    vi.stubEnv("LLM_MODE", "fake");
    const res = await reportPOST(req("/api/report", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ placeId: "ChIJexampleHarborside" }) }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.hotel.name).toBe("Harborside Inn");
    expect(body.sample.total).toBe(8);
    expect(body.topFixes).toHaveLength(3);
    expect(body.praise[0].name).toBe("Location next to the Old Port");
    expect(body.sections.website.available).toBe(true);
    expect(JSON.stringify(body)).not.toMatch(/hotelzify/i);
    // no raw review bodies beyond the quoted fragments are echoed back
    expect(JSON.stringify(body)).not.toContain("Took 40 minutes to sort out");
  });

  it("POST /api/report with audience=partner adds product names", async () => {
    vi.stubEnv("SOURCES_MODE", "fixture");
    vi.stubEnv("LLM_MODE", "fake");
    const res = await reportPOST(req("/api/report", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ placeId: "ChIJexampleHarborside", audience: "partner" }) }));
    expect(JSON.stringify(await res.json())).toMatch(/Hotelzify/);
  });

  it("POST /api/report rejects a missing placeId", async () => {
    vi.stubEnv("SOURCES_MODE", "fixture");
    const res = await reportPOST(req("/api/report", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }));
    expect(res.status).toBe(400);
  });

  it("POST /api/report accepts a viewer's own OpenRouter key only in the request body and never echoes it", async () => {
    vi.stubEnv("SOURCES_MODE", "fixture");
    vi.stubEnv("LLM_MODE", "fake");
    const res = await reportPOST(req("/api/report", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ placeId: "ChIJexampleHarborside", byok: { apiKey: "sk-or-viewer", model: "x:free" } }) }));
    expect(res.status).toBe(200);
    expect(JSON.stringify(await res.json())).not.toContain("sk-or-viewer");
  });

  it("returns 429 when the per-visitor limit is exceeded", async () => {
    vi.stubEnv("SOURCES_MODE", "fixture");
    vi.stubEnv("LLM_MODE", "fake");
    vi.stubEnv("REPORTS_PER_VISITOR_PER_HOUR", "2");
    const mk = () => reportPOST(req("/api/report", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.9" }, body: JSON.stringify({ placeId: "ChIJexampleHarborside" }) }));
    expect((await mk()).status).toBe(200);
    expect((await mk()).status).toBe(200);
    expect((await mk()).status).toBe(429);
  });
});

describe("RateLimiter", () => {
  it("allows n hits per key per window, then refuses, then resets", () => {
    let now = 1000;
    const rl = new RateLimiter({ limit: 2, windowMs: 100, now: () => now });
    expect(rl.hit("a")).toBe(true);
    expect(rl.hit("a")).toBe(true);
    expect(rl.hit("a")).toBe(false);
    expect(rl.hit("b")).toBe(true);
    now += 101;
    expect(rl.hit("a")).toBe(true);
  });
});
