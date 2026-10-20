import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BOOKING_VENDORS, analyzeHtml, detectBookingEngine, isBookNowText, isRealWebsite } from "@/lib/website";

// The fixture page is an invented hotel, never copied from a real site.
const home = readFileSync(new URL("./fixtures/home.html", import.meta.url), "utf8");
const OWN = "www.harborlaneinn.com";

describe("detectBookingEngine", () => {
  it("1. finds SynXis on its own domain", () => {
    expect(detectBookingEngine(["https://synxis.com/rez"], OWN)).toEqual({ domain: "synxis.com", vendor: "SynXis", onOwnDomain: false });
  });

  it("2. finds a vendor on a subdomain", () => {
    expect(detectBookingEngine(["https://be.synxis.com/?hotel=1"], OWN)).toEqual({ domain: "be.synxis.com", vendor: "SynXis", onOwnDomain: false });
  });

  it("3. does not treat a lookalike domain as the vendor", () => {
    expect(detectBookingEngine(["https://notsynxis.com/rez"], OWN)).toBeNull();
  });

  it("4. knows a vendor's second domain", () => {
    expect(detectBookingEngine(["https://app.mews.li/distributor/abc"], OWN)?.vendor).toBe("Mews");
  });

  it("5. finds a booking page on the hotel's own domain, vendor unknown", () => {
    expect(detectBookingEngine([`https://${OWN}/booking`], OWN)).toEqual({ domain: OWN, vendor: null, onOwnDomain: true });
  });

  it("6. prefers a vendor match over an own-domain match, in either order", () => {
    const own = `https://${OWN}/reservations`;
    const vendor = "https://hotels.cloudbeds.com/reservation/abc";
    expect(detectBookingEngine([own, vendor], OWN)?.vendor).toBe("Cloudbeds");
    expect(detectBookingEngine([vendor, own], OWN)?.vendor).toBe("Cloudbeds");
  });

  it("7. ignores fonts, analytics, images and stylesheets", () => {
    const urls = [
      "https://fonts.googleapis.com/css2?family=Lora",
      "https://www.googletagmanager.com/gtag/js?id=G-TEST",
      `https://${OWN}/images/booking-hero.jpg`,
      `https://${OWN}/css/reservation.css`,
    ];
    expect(detectBookingEngine(urls, OWN)).toBeNull();
  });

  it("8. returns null when nothing matches", () => {
    expect(detectBookingEngine([], OWN)).toBeNull();
    expect(detectBookingEngine([`https://${OWN}/about`], OWN)).toBeNull();
  });

  it("9. lists every vendor the spec requires", () => {
    const required: Record<string, string[]> = {
      SynXis: ["synxis.com"],
      Cloudbeds: ["cloudbeds.com"],
      Mews: ["mews.com", "mews.li"],
      SiteMinder: ["siteminder.com", "thebookingbutton.com"],
      Hotelzify: ["bookmystay.io", "hotelzify.com"],
      "Little Hotelier": ["littlehotelier.com"],
      WebRezPro: ["webrezpro.com"],
      ThinkReservations: ["thinkreservations.com"],
      innRoad: ["innroad.com"],
      RoomRaccoon: ["roomraccoon.com"],
    };
    for (const [vendor, domains] of Object.entries(required)) {
      const entry = BOOKING_VENDORS.find((v) => v.vendor === vendor);
      expect(entry, vendor).toBeDefined();
      expect(entry!.domains).toEqual(expect.arrayContaining(domains));
    }
  });
});

describe("isBookNowText", () => {
  it("10. accepts the usual booking words", () => {
    for (const text of ["Book Now", "Reserve", "Check Availability", "Reservations", "  BOOK YOUR STAY  "]) {
      expect(isBookNowText(text), text).toBe(true);
    }
  });

  it("11. rejects words that only contain 'book'", () => {
    for (const text of ["Facebook", "Guestbook", "Bookshop", "Bookstore", "Visit the bookshop or book a tour"]) {
      expect(isBookNowText(text), text).toBe(false);
    }
  });

  it("12. rejects ordinary link text", () => {
    for (const text of ["Our story", "Contact", "All rights reserved.", ""]) {
      expect(isBookNowText(text), text).toBe(false);
    }
  });
});

describe("isRealWebsite", () => {
  it("13. rejects a missing or broken URL", () => {
    expect(isRealWebsite(null)).toBe(false);
    expect(isRealWebsite("")).toBe(false);
    expect(isRealWebsite("not a url")).toBe(false);
  });

  it("14. rejects social pages, booking sites and link pages", () => {
    for (const url of ["https://www.facebook.com/harborlaneinn", "https://m.facebook.com/harborlaneinn", "https://www.booking.com/hotel/us/x.html", "https://linktr.ee/harborlaneinn"]) {
      expect(isRealWebsite(url), url).toBe(false);
    }
  });

  it("15. accepts the hotel's own domain, even one that ends in a blocked name", () => {
    expect(isRealWebsite("https://www.harborlaneinn.com/")).toBe(true);
    expect(isRealWebsite("https://notfacebook.com/")).toBe(true);
  });
});

describe("analyzeHtml", () => {
  it("16. finds the Book Now link with its text and address", () => {
    expect(analyzeHtml(home, `https://${OWN}/`).bookNow).toEqual({ found: true, text: "Book Now", href: "https://be.synxis.com/?hotel=12345" });
  });

  it("17. finds the booking engine in a script or an iframe", () => {
    expect(analyzeHtml(home, `https://${OWN}/`).bookingEngine?.vendor).toBe("SynXis");
    const iframe = '<iframe src="https://hotels.cloudbeds.com/reservation/abc"></iframe>';
    expect(analyzeHtml(iframe, `https://${OWN}/`).bookingEngine?.vendor).toBe("Cloudbeds");
  });

  it("18. sees a tap-to-call link", () => {
    expect(analyzeHtml(home, `https://${OWN}/`).tapToCall).toBe(true);
    expect(analyzeHtml('<a href="/about">Our story</a>', `https://${OWN}/`).tapToCall).toBe(false);
  });

  it("19. takes HTTPS from the page address and leaves the speed fields empty", () => {
    const checks = analyzeHtml("<p>No links</p>", `http://${OWN}/`);
    expect(checks).toEqual({
      source: "html",
      mobileScore: null,
      https: false,
      viewport: null,
      tapTargetsOk: null,
      bookingEngine: null,
      bookNow: { found: false },
      tapToCall: false,
    });
    expect(analyzeHtml("<p>No links</p>", `https://${OWN}/`).https).toBe(true);
  });
});
