import { describe, expect, it } from "vitest";
import { analyzeHtml, analyzeLighthouse, detectBookingEngine, BOOKING_VENDORS, isRealWebsite, NOT_A_WEBSITE_HOSTS } from "@/lib/website";
import psi from "./fixtures/pagespeed.json";
import psiNoBooking from "./fixtures/pagespeed-no-booking.json";
import { readFileSync } from "node:fs";
import path from "node:path";

const home = readFileSync(path.join(__dirname, "fixtures/home.html"), "utf8");

describe("detectBookingEngine", () => {
  it("names the vendor from a known booking-engine domain", () => {
    expect(detectBookingEngine(["https://www.x.com/", "https://be.synxis.com/widget/loader.js"], "www.x.com"))
      .toEqual({ domain: "be.synxis.com", vendor: "SynXis", onOwnDomain: false });
  });
  it("knows at least these vendors", () => {
    for (const v of ["SynXis", "Cloudbeds", "Mews", "SiteMinder", "Hotelzify", "Little Hotelier", "WebRezPro", "ThinkReservations", "innRoad", "RoomRaccoon"]) {
      expect(BOOKING_VENDORS.some((e) => e.vendor === v)).toBe(true);
    }
    expect(BOOKING_VENDORS.find((e) => e.vendor === "Hotelzify")?.domains).toContain("bookmystay.io");
  });
  it("ignores analytics, fonts and the hotel's own domain", () => {
    expect(detectBookingEngine([
      "https://www.x.com/", "https://fonts.googleapis.com/css", "https://www.googletagmanager.com/gtm.js",
    ], "www.x.com")).toBeNull();
  });
  it("reports a booking path on the hotel's own domain as onOwnDomain", () => {
    expect(detectBookingEngine(["https://www.x.com/book/availability", "https://www.x.com/"], "www.x.com"))
      .toEqual({ domain: "www.x.com", vendor: null, onOwnDomain: true });
  });
});

describe("analyzeLighthouse", () => {
  it("reads score, security, viewport, booking engine, book-now and tap-to-call", () => {
    const checks = analyzeLighthouse(psi);
    expect(checks.mobileScore).toBe(38);
    expect(checks.https).toBe(true);
    expect(checks.viewport).toBe(true);
    expect(checks.tapTargetsOk).toBe(false);
    expect(checks.bookingEngine).toEqual({ domain: "be.synxis.com", vendor: "SynXis", onOwnDomain: false });
    expect(checks.bookNow).toEqual({ found: true, text: "Book Now", href: "https://be.synxis.com/?hotel=12345" });
    expect(checks.tapToCall).toBe(false);
    expect(checks.source).toBe("lighthouse");
  });
  it("handles a site with no booking engine and a tel: link", () => {
    const checks = analyzeLighthouse(psiNoBooking);
    expect(checks.mobileScore).toBe(91);
    expect(checks.https).toBe(false);
    expect(checks.viewport).toBe(false);
    expect(checks.bookingEngine).toBeNull();
    expect(checks.bookNow.found).toBe(false);
    expect(checks.tapToCall).toBe(true);
  });
  it("treats book-now text loosely but not too loosely", () => {
    const mk = (text: string) => ({ ...psiNoBooking, lighthouseResult: { ...psiNoBooking.lighthouseResult, audits: { ...psiNoBooking.lighthouseResult.audits, "link-text": { details: { type: "table", items: [{ href: "https://x.com/a", text }] } } } } });
    for (const t of ["Book Now", "BOOK", "Reserve", "Check availability", "Book your stay", "Reservations"]) {
      expect(analyzeLighthouse(mk(t)).bookNow.found, t).toBe(true);
    }
    for (const t of ["Facebook", "Our story", "Guestbook"]) {
      expect(analyzeLighthouse(mk(t)).bookNow.found, t).toBe(false);
    }
  });
});

describe("analyzeHtml (fallback)", () => {
  it("finds the same signals in raw HTML", () => {
    const checks = analyzeHtml(home, "https://www.harborside-inn-example.com/");
    expect(checks.source).toBe("html");
    expect(checks.mobileScore).toBeNull();
    expect(checks.https).toBe(true);
    expect(checks.bookNow).toEqual({ found: true, text: "Book Now", href: "https://be.synxis.com/?hotel=12345" });
    expect(checks.bookingEngine).toEqual({ domain: "be.synxis.com", vendor: "SynXis", onOwnDomain: false });
    expect(checks.tapToCall).toBe(true);
  });
});

describe("isRealWebsite", () => {
  it.each([
    ["https://www.harborside-inn-example.com/", true],
    ["http://seasideinn.us", true],
    ["https://www.facebook.com/SeasideMotel", false],
    ["https://m.facebook.com/pages/x", false],
    ["https://instagram.com/seaside", false],
    ["https://www.booking.com/hotel/us/seaside.html", false],
    ["https://www.expedia.com/Seaside-Hotel.h123", false],
    ["https://linktr.ee/seaside", false],
    ["not a url", false],
    [null, false],
  ])("%s → %s", (url, real) => expect(isRealWebsite(url as string | null)).toBe(real));

  it("does not treat a hotel whose own domain merely contains a blocked word as fake", () => {
    expect(isRealWebsite("https://www.bookingsfacebookinn.com/")).toBe(true);
    expect(NOT_A_WEBSITE_HOSTS).toContain("facebook.com");
  });
});
