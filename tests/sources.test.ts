import { afterEach, describe, expect, it, vi } from "vitest";
import { getPlace, searchHotels } from "@/lib/sources/google";
import { findLocation, getLocationDetails, getReviews as getTaReviews } from "@/lib/sources/tripadvisor";
import { runPageSpeed } from "@/lib/sources/pagespeed";
import { nameSimilarity } from "@/lib/match";
import placeFx from "./fixtures/google-place.json";
import searchFx from "./fixtures/google-search.json";
import nearbyFx from "./fixtures/tripadvisor-nearby.json";
import taReviewsFx from "./fixtures/tripadvisor-reviews.json";
import taDetailsFx from "./fixtures/tripadvisor-details.json";
import psiFx from "./fixtures/pagespeed.json";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

afterEach(() => vi.unstubAllEnvs());

describe("google", () => {
  it("searchHotels sends a text search with a field mask and returns compact results", async () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "test-key");
    const fetchImpl = vi.fn(async () => json(searchFx));
    const results = await searchHotels("Harborside Inn Portland", { fetchImpl });
    expect(results).toEqual([
      { placeId: "ChIJexampleHarborside", name: "Harborside Inn", address: "12 Commercial St, Portland, ME 04101, USA", rating: 4.5, reviewCount: 1313 },
      { placeId: "ChIJexampleOther", name: "Harbor View Suites", address: "40 Fore St, Portland, ME 04101, USA", rating: 4.2, reviewCount: 410 },
    ]);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://places.googleapis.com/v1/places:searchText");
    const headers = init.headers as Record<string, string>;
    expect(headers["X-Goog-Api-Key"]).toBe("test-key");
    expect(headers["X-Goog-FieldMask"]).toContain("places.id");
    expect(JSON.parse(init.body as string)).toMatchObject({ textQuery: "Harborside Inn Portland", includedType: "lodging" });
  });

  it("getPlace normalises the listing and reviews, with ids g-1..g-5 and attribution kept", async () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "test-key");
    const hotel = await getPlace("ChIJexampleHarborside", { fetchImpl: async () => json(placeFx) });
    expect(hotel).toMatchObject({
      placeId: "ChIJexampleHarborside", name: "Harborside Inn", rating: 4.5, reviewCount: 1313,
      website: "https://www.harborside-inn-example.com/", phone: "(207) 555-0142", description: null,
      location: { lat: 43.6565, lng: -70.2525 },
    });
    expect(hotel.reviews).toHaveLength(5);
    expect(hotel.reviews[0]).toEqual({ id: "g-1", source: "google", rating: 5, date: "2026-09-14", text: placeFx.reviews[0].text.text, author: "A. Guest", authorUrl: "https://www.google.com/maps/contrib/1" });
  });

  it("fails clearly without a key", async () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "");
    await expect(searchHotels("x", { fetchImpl: vi.fn() })).rejects.toThrow(/GOOGLE_PLACES_API_KEY/);
  });

  it("surfaces API errors with the status code", async () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "test-key");
    await expect(getPlace("bad", { fetchImpl: async () => json({ error: { message: "nope" } }, 403) })).rejects.toThrow(/403/);
  });
});

describe("nameSimilarity", () => {
  it("is 1 for the same name ignoring case, punctuation and the word 'the'", () => {
    expect(nameSimilarity("The Harborside Inn", "harborside inn")).toBe(1);
  });
  it("is high for a name with extra location words and low for a different place", () => {
    expect(nameSimilarity("Harborside Inn", "harborside inn portland maine")).toBeGreaterThan(0.6);
    expect(nameSimilarity("Harborside Inn", "Old Port Bistro")).toBeLessThan(0.2);
  });
});

describe("tripadvisor", () => {
  it("findLocation searches nearby by coordinates and picks the best name match, not the nearest", async () => {
    vi.stubEnv("TRIPADVISOR_API_KEY", "ta-key");
    const fetchImpl = vi.fn(async () => json(nearbyFx));
    const loc = await findLocation({ name: "Harborside Inn", lat: 43.6565, lng: -70.2525 }, { fetchImpl });
    expect(loc).toEqual({ locationId: 555002, name: "The Harborside Inn", similarity: expect.any(Number) });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/^https:\/\/terra\.tripadvisor\.com\/api\/locations\/nearby\?/);
    expect(url).toContain("43.6565");
    expect((init.headers as Record<string, string>)["X-API-Key"]).toBe("ta-key");
  });

  it("findLocation returns null when nothing is similar enough", async () => {
    vi.stubEnv("TRIPADVISOR_API_KEY", "ta-key");
    const loc = await findLocation({ name: "Completely Different Hotel", lat: 43.6, lng: -70.2 }, { fetchImpl: async () => json(nearbyFx) });
    expect(loc).toBeNull();
  });

  it("getReviews normalises with ids ta-<id> and joins title and text", async () => {
    vi.stubEnv("TRIPADVISOR_API_KEY", "ta-key");
    const reviews = await getTaReviews(555002, { fetchImpl: async () => json(taReviewsFx) });
    expect(reviews).toHaveLength(3);
    expect(reviews[1]).toEqual({ id: "ta-102", source: "tripadvisor", rating: 3, date: "2026-09-20", text: "Decent stay. Parking situation was confusing, no instructions anywhere before arrival.", url: "https://www.tripadvisor.com/ShowUserReviews-102" });
    expect(reviews[0].text.startsWith("Breakfast was excellent. Breakfast was excellent")).toBe(false); // title not duplicated when text already starts with it
  });

  it("getLocationDetails returns rating, review count and ranking", async () => {
    vi.stubEnv("TRIPADVISOR_API_KEY", "ta-key");
    const d = await getLocationDetails(555002, { fetchImpl: async () => json(taDetailsFx) });
    expect(d).toEqual({ locationId: 555002, rating: 4.5, reviewCount: 980, ranking: { rank: 12, total: 48, text: "#12 of 48 hotels in Portland" }, url: "https://www.tripadvisor.com/Hotel_Review-555002" });
  });
});

describe("pagespeed", () => {
  it("calls the PSI API for mobile with the performance category and returns the raw result", async () => {
    vi.stubEnv("PAGESPEED_API_KEY", "");
    const fetchImpl = vi.fn(async () => json(psiFx));
    const result = await runPageSpeed("https://www.harborside-inn-example.com/", { fetchImpl });
    expect(result.lighthouseResult.categories.performance.score).toBe(0.38);
    const [url] = fetchImpl.mock.calls[0] as unknown as [string];
    expect(url).toMatch(/^https:\/\/www\.googleapis\.com\/pagespeedonline\/v5\/runPagespeed\?/);
    expect(url).toContain("strategy=mobile");
    expect(url).toContain("category=performance");
    expect(url).not.toContain("key=");
  });
  it("adds the key when configured", async () => {
    vi.stubEnv("PAGESPEED_API_KEY", "psi-key");
    const fetchImpl = vi.fn(async () => json(psiFx));
    await runPageSpeed("https://x.example.com/", { fetchImpl });
    expect((fetchImpl.mock.calls[0] as unknown as [string])[0]).toContain("key=psi-key");
  });
});
