import { afterEach, describe, expect, it, vi } from "vitest";
import { benchmark, nearbyHotels } from "@/lib/compare";
import nearbyFx from "./fixtures/google-nearby.json";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
afterEach(() => vi.unstubAllEnvs());

describe("nearbyHotels", () => {
  it("searches lodging within 1.5 km, drops the hotel itself and returns compact neighbours", async () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "g");
    const fetchImpl = vi.fn(async () => json(nearbyFx));
    const n = await nearbyHotels({ placeId: "ChIJexampleHarborside", lat: 43.6565, lng: -70.2525 }, { fetchImpl });
    expect(n).toHaveLength(5);
    expect(n.map((x) => x.placeId)).not.toContain("ChIJexampleHarborside");
    expect(n[0]).toEqual({ placeId: "ChIJn1", name: "Old Port Harbor Hotel", rating: 4.7, reviewCount: 2210, website: "https://www.oldport-harbor-example.com/", phoneListed: true, hasDescription: true });
    expect(n[4]).toMatchObject({ placeId: "ChIJn5", website: null, hasDescription: false });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://places.googleapis.com/v1/places:searchNearby");
    const body = JSON.parse(init.body as string);
    expect(body.includedTypes).toEqual(["lodging"]);
    expect(body.maxResultCount).toBeLessThanOrEqual(8);
    expect(body.locationRestriction.circle.radius).toBe(1500);
    const mask = (init.headers as Record<string, string>)["X-Goog-FieldMask"];
    expect(mask).not.toContain("reviews"); // neighbours never cost a reviews fetch
  });
});

describe("benchmark", () => {
  const you = { rating: 4.5, reviewCount: 1313, mobileScore: 38, hasDescription: false, phoneListed: true, websiteLinked: true };
  const neighbours = [
    { placeId: "a", name: "A", rating: 4.7, reviewCount: 2210, website: "x", phoneListed: true, hasDescription: true, mobileScore: 72 },
    { placeId: "b", name: "B", rating: 4.3, reviewCount: 640, website: "x", phoneListed: true, hasDescription: true, mobileScore: 65 },
    { placeId: "c", name: "C", rating: 4.1, reviewCount: 388, website: "x", phoneListed: false, hasDescription: false, mobileScore: 90 },
    { placeId: "d", name: "D", rating: 4.6, reviewCount: 1540, website: "x", phoneListed: true, hasDescription: true, mobileScore: null },
    { placeId: "e", name: "E", rating: 4.8, reviewCount: 212, website: null, phoneListed: true, hasDescription: false, mobileScore: null },
  ];

  it("compares each metric with the neighbours' average and gives a rank", () => {
    const b = benchmark(you, neighbours);
    expect(b.mobileScore).toEqual({ yours: 38, neighboursAvg: 76, rank: 4, of: 4, basis: 3 }); // only 3 neighbours had a score
    expect(b.rating).toEqual({ yours: 4.5, neighboursAvg: 4.5, rank: 4, of: 6, basis: 5 });
    expect(b.reviewCount).toEqual({ yours: 1313, neighboursAvg: 998, rank: 3, of: 6, basis: 5 });
    expect(b.hasDescription).toEqual({ yours: false, neighboursWith: 3, of: 5 });
    expect(b.phoneListed).toEqual({ yours: true, neighboursWith: 4, of: 5 });
    expect(b.websiteLinked).toEqual({ yours: true, neighboursWith: 4, of: 5 });
  });

  it("returns null metrics when there are no neighbours", () => {
    const b = benchmark(you, []);
    expect(b.mobileScore).toBeNull();
    expect(b.rating).toBeNull();
    expect(b.hasDescription).toBeNull();
  });

  it("skips a metric the hotel itself lacks", () => {
    const b = benchmark({ ...you, mobileScore: null }, neighbours);
    expect(b.mobileScore).toBeNull();
    expect(b.rating).not.toBeNull();
  });
});
