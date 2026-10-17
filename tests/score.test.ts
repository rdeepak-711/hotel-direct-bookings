import { describe, expect, it } from "vitest";
import { SCORE_WEIGHTS, computeScore, listingScore, messagingScore, reviewsScore, websiteScore } from "@/lib/score";
import { analyzeLighthouse } from "@/lib/website";
import psi from "./fixtures/pagespeed.json";
import psiNoBooking from "./fixtures/pagespeed-no-booking.json";
import type { Gap, WebsiteChecks } from "@/lib/types";

const gaps: Gap[] = [
  { themeName: "Parking", topic: "parking", count: 2, mentionedOnSite: false },
  { themeName: "Check-in time", topic: "check-in", count: 1, mentionedOnSite: true },
];
const hotel = { description: null, website: "https://www.harborside-inn-example.com/", phone: "(207) 555-0142", rating: 4.5, reviewCount: 1313 };

describe("websiteScore", () => {
  it("is 0 with no website and null when the site could not be checked", () => {
    expect(websiteScore(null, false)).toBe(0);
    expect(websiteScore(null, true)).toBeNull();
  });
  it("starts from the mobile score and deducts for off-domain booking and no tap-to-call", () => {
    expect(websiteScore(analyzeLighthouse(psi), true)).toBe(23); // 38 - 10 (synxis) - 5 (no tel:)
  });
  it("deducts for http and no viewport", () => {
    expect(websiteScore(analyzeLighthouse(psiNoBooking), true)).toBe(66); // 91 - 15 - 10
  });
  it("uses 50 as the base when there is no mobile score", () => {
    const html: WebsiteChecks = { source: "html", mobileScore: null, https: true, viewport: null, tapTargetsOk: null, bookingEngine: null, bookNow: { found: true }, tapToCall: true };
    expect(websiteScore(html, true)).toBe(50);
  });
  it("never goes below 0", () => {
    const bad: WebsiteChecks = { source: "lighthouse", mobileScore: 5, https: false, viewport: false, tapTargetsOk: false, bookingEngine: { domain: "x.com", vendor: null, onOwnDomain: false }, bookNow: { found: false }, tapToCall: false };
    expect(websiteScore(bad, true)).toBe(0);
  });
});

describe("messagingScore", () => {
  it("is null without themes and 100 without questions", () => {
    expect(messagingScore(null)).toBeNull();
    expect(messagingScore([])).toBe(100);
  });
  it("charges 25 per unanswered question and 10 per answered or unknown one", () => {
    expect(messagingScore(gaps)).toBe(65);
    expect(messagingScore([{ themeName: "Street noise", topic: null, count: 1, mentionedOnSite: null }])).toBe(90);
  });
  it("floors at 0", () => {
    expect(messagingScore(Array.from({ length: 5 }, (_, i) => ({ themeName: "q" + i, topic: "parking", count: 1, mentionedOnSite: false })))).toBe(0);
  });
});

describe("listingScore", () => {
  it("adds 40 for a description, 30 for a website, 30 for a phone", () => {
    expect(listingScore(hotel)).toBe(60);
    expect(listingScore({ description: "x", website: "y", phone: "z" })).toBe(100);
    expect(listingScore({ description: null, website: null, phone: null })).toBe(0);
  });
});

describe("reviewsScore", () => {
  it("scales the rating and charges 10 for a thin review base", () => {
    expect(reviewsScore(hotel)).toBe(90);
    expect(reviewsScore({ rating: 4.0, reviewCount: 20 })).toBe(70);
    expect(reviewsScore({ rating: 4.0, reviewCount: null })).toBe(70);
    expect(reviewsScore({ rating: null, reviewCount: 10 })).toBeNull();
  });
});

describe("computeScore", () => {
  it("weights the four sub-scores 35/25/20/20 and gives 54 on the fixtures", () => {
    expect(SCORE_WEIGHTS).toEqual({ website: 35, messaging: 25, listing: 20, reviews: 20 });
    expect(computeScore({ hotel, website: analyzeLighthouse(psi), gaps })).toEqual({ website: 23, messaging: 65, listing: 60, reviews: 90, overall: 54 });
  });
  it("renormalises the weights when a sub-score is null", () => {
    const s = computeScore({ hotel, website: analyzeLighthouse(psi), gaps: null });
    expect(s.messaging).toBeNull();
    expect(s.overall).toBe(51); // (23*35 + 60*20 + 90*20) / 75
  });
  it("is null overall only when nothing could be scored", () => {
    const s = computeScore({ hotel: { description: null, website: "https://x.example.com", phone: null, rating: null, reviewCount: null }, website: null, gaps: null });
    expect(s).toEqual({ website: null, messaging: null, listing: 30, reviews: null, overall: 30 });
  });
});
