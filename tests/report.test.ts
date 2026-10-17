import { describe, expect, it } from "vitest";
import { buildReport, CATEGORY_LABELS, type ReportInputs } from "@/lib/report";
import { analyzeLighthouse } from "@/lib/website";
import psi from "./fixtures/pagespeed.json";
import psiNoBooking from "./fixtures/pagespeed-no-booking.json";
import reviews from "./fixtures/reviews.json";

const base: ReportInputs = {
  hotel: {
    placeId: "ChIJexampleHarborside", name: "Harborside Inn", address: "12 Commercial St, Portland, ME 04101, USA",
    rating: 4.5, reviewCount: 1313, website: "https://www.harborside-inn-example.com/", phone: "(207) 555-0142",
    description: null, location: { lat: 43.6565, lng: -70.2525 }, reviews: reviews.filter((r) => r.source === "google") as never,
  },
  tripadvisor: { locationId: 555002, rating: 4.5, reviewCount: 980, ranking: { rank: 12, total: 48, text: "#12 of 48 hotels in Portland" }, url: "https://www.tripadvisor.com/Hotel_Review-555002", reviews: reviews.filter((r) => r.source === "tripadvisor") as never },
  website: analyzeLighthouse(psi),
  themes: {
    praise: [
      { name: "Location next to the Old Port", count: 4, reviewIds: ["g-1", "g-4", "ta-101", "ta-103"], quotes: [{ reviewId: "g-1", quote: "Steps from the Old Port and every restaurant we wanted" }] },
      { name: "Breakfast", count: 2, reviewIds: ["g-4", "ta-101"], quotes: [{ reviewId: "g-4", quote: "The blueberry pancakes alone are worth the stay" }] },
    ],
    questions: [
      { name: "Parking", count: 2, reviewIds: ["g-2", "ta-102"], quotes: [{ reviewId: "g-2", quote: "wish we'd known parking was a block away" }] },
      { name: "Check-in time", count: 1, reviewIds: ["g-5"], quotes: [{ reviewId: "g-5", quote: "Check-in isn't until 4 PM which we didn't realise" }] },
    ],
    headline: "Steps from the Old Port, with a breakfast guests write home about.",
    adLines: ["Walk to every restaurant in the Old Port."],
    dropped: [],
  },
  audience: "public",
  checkedAt: "2026-10-18",
};

describe("buildReport", () => {
  it("states the sample size and never shows percentages", () => {
    const r = buildReport(base);
    expect(r.sample).toEqual({ googleReviews: 5, tripadvisorReviews: 3, total: 8 });
    expect(JSON.stringify(r)).not.toMatch(/\d+%/);
  });

  it("produces findings with a category and a fix, mapped to generic labels for the public audience", () => {
    const r = buildReport(base);
    const ids = r.findings.map((f) => f.id);
    expect(ids).toEqual(expect.arrayContaining(["slow-mobile", "no-description", "booking-off-domain", "no-tap-to-call", "question-parking", "question-check-in-time"]));
    const slow = r.findings.find((f) => f.id === "slow-mobile")!;
    expect(slow.category).toBe("booking-website");
    expect(slow.severity).toBe("high");
    expect(slow.fix.toLowerCase()).toMatch(/mobile|speed|faster/);
    expect(slow.evidence).toContain("38");
    expect(slow.productName).toBeUndefined();
    expect(CATEGORY_LABELS["booking-website"]).toBe("Booking website");
    expect(JSON.stringify(r)).not.toMatch(/hotelzify/i);
  });

  it("adds partner product names only for the partner audience", () => {
    const r = buildReport({ ...base, audience: "partner" });
    const slow = r.findings.find((f) => f.id === "slow-mobile")!;
    expect(slow.productName).toMatch(/Hotelzify/);
    expect(r.findings.find((f) => f.id === "no-description")!.productName).toMatch(/Google Business Profile/);
  });

  it("ranks the top 3 fixes: high severity first, then by how many reviews back it", () => {
    const r = buildReport(base);
    expect(r.topFixes).toHaveLength(3);
    expect(r.topFixes[0].id).toBe("slow-mobile");
    expect(r.topFixes.map((f) => f.id)).toContain("no-description");
    expect(r.topFixes.map((f) => f.id)).not.toContain("question-check-in-time");
  });

  it("does not flag a fast, well-set-up site and says 'not found' rather than 'missing' for book-now", () => {
    const r = buildReport({ ...base, website: analyzeLighthouse(psiNoBooking) });
    const ids = r.findings.map((f) => f.id);
    expect(ids).not.toContain("slow-mobile");
    expect(ids).not.toContain("no-tap-to-call");
    expect(ids).toContain("no-https");
    expect(ids).toContain("no-viewport");
    const bn = r.findings.find((f) => f.id === "no-book-now")!;
    expect(bn.evidence.toLowerCase()).toContain("not found");
    expect(bn.evidence.toLowerCase()).not.toContain("missing");
  });

  it("includes praise themes with quotes and the draft headline for marketing", () => {
    const r = buildReport(base);
    expect(r.praise[0]).toMatchObject({ name: "Location next to the Old Port", count: 4 });
    expect(r.praise[0].quotes[0].quote).toBe("Steps from the Old Port and every restaurant we wanted");
    expect(r.praise[0].quotes[0].source).toBe("google");
    expect(r.praise[0].quotes[0].date).toBe("2026-09-14");
    expect(r.headline).toBe(base.themes.headline);
    expect(r.findings.find((f) => f.id === "no-description")!.fix).toContain("Location next to the Old Port");
  });

  it("marks a section unavailable instead of failing when a source is missing", () => {
    const r = buildReport({ ...base, website: null, tripadvisor: null });
    expect(r.sections.website.available).toBe(false);
    expect(r.sections.tripadvisor.available).toBe(false);
    expect(r.sample).toEqual({ googleReviews: 5, tripadvisorReviews: 0, total: 5 });
    expect(r.findings.some((f) => f.id === "slow-mobile")).toBe(false);
    expect(r.topFixes.length).toBeGreaterThan(0);
  });

  it("shows the Tripadvisor ranking in the listing section", () => {
    const r = buildReport(base);
    expect(r.sections.listing.tripadvisorRanking).toBe("#12 of 48 hotels in Portland");
  });

  it("writes owner-facing text without the word OTA", () => {
    const text = JSON.stringify(buildReport(base));
    expect(text).not.toMatch(/\bOTA/);
    expect(text).toMatch(/Expedia/);
  });
});
