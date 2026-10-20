import type { BookingEngine, WebsiteChecks } from "./types";

export const BOOKING_VENDORS: { vendor: string; domains: string[] }[] = [
  { vendor: "SynXis", domains: ["synxis.com"] },
  { vendor: "Cloudbeds", domains: ["cloudbeds.com"] },
  { vendor: "Mews", domains: ["mews.com", "mews.li"] },
  { vendor: "SiteMinder", domains: ["siteminder.com", "thebookingbutton.com"] },
  { vendor: "Hotelzify", domains: ["bookmystay.io", "hotelzify.com"] },
  { vendor: "Little Hotelier", domains: ["littlehotelier.com"] },
  { vendor: "WebRezPro", domains: ["webrezpro.com"] },
  { vendor: "ThinkReservations", domains: ["thinkreservations.com"] },
  { vendor: "innRoad", domains: ["innroad.com"] },
  { vendor: "RoomRaccoon", domains: ["roomraccoon.com"] },
  { vendor: "TravelClick", domains: ["travelclick.com", "ihotelier.com"] },
  { vendor: "RezTrip", domains: ["reztrip.com"] },
  { vendor: "RezStream", domains: ["rezstream.com"] },
  { vendor: "ResNexus", domains: ["resnexus.com"] },
  { vendor: "eviivo", domains: ["eviivo.com"] },
  { vendor: "GuestCentric", domains: ["guestcentric.net"] },
  { vendor: "Simple Booking", domains: ["simplebooking.it"] },
  { vendor: "Profitroom", domains: ["profitroom.com"] },
  { vendor: "D-EDGE", domains: ["d-edge.com"] },
  { vendor: "HotelRunner", domains: ["hotelrunner.com"] },
];

const BOOKING_PATH = /(book|booking|reserve|reservation|availability)/i;
const ASSET_FILE = /\.(css|js|jpe?g|png|gif|svg|webp|ico|woff2?)$/i;
// Words that contain "book" but are not about booking a room. Shared by the path check and isBookNowText.
const NOT_BOOKING = /facebook|guestbook|bookshop|bookstore/i;

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

// "be.synxis.com" is SynXis; "notsynxis.com" is not. The "." keeps lookalike domains out.
function hostIs(host: string, domain: string): boolean {
  return host === domain || host.endsWith("." + domain);
}

export function detectBookingEngine(urls: string[], ownHost: string): BookingEngine | null {
  let ownMatch: BookingEngine | null = null;
  for (const url of urls) {
    const host = hostOf(url);
    if (!host) continue;
    const vendor = BOOKING_VENDORS.find((v) => v.domains.some((d) => hostIs(host, d)));
    if (vendor) return { domain: host, vendor: vendor.vendor, onOwnDomain: false };
    if (!ownMatch && host === ownHost.toLowerCase()) {
      const path = new URL(url).pathname.replace(new RegExp(NOT_BOOKING, "gi"), "");
      if (BOOKING_PATH.test(path) && !ASSET_FILE.test(path)) ownMatch = { domain: ownHost, vendor: null, onOwnDomain: true };
    }
  }
  return ownMatch;
}

export function isBookNowText(text: string): boolean {
  const t = text.trim();
  return /\b(book|reserve|reservations?|check availability|availability)\b/i.test(t) && !NOT_BOOKING.test(t);
}

export const NOT_A_WEBSITE_HOSTS: string[] = [
  "facebook.com", "fb.com", "instagram.com", "booking.com", "expedia.com", "hotels.com",
  "airbnb.com", "vrbo.com", "tripadvisor.com", "agoda.com", "google.com", "linktr.ee",
];

// A Facebook or booking-site page listed as the "website" is not the hotel's own site.
export function isRealWebsite(url: string | null): boolean {
  if (!url) return false;
  const host = hostOf(url);
  if (!host) return false;
  return !NOT_A_WEBSITE_HOSTS.some((d) => hostIs(host, d));
}

function resolve(href: string, base: string): string | null {
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}

function linkText(innerHtml: string): string {
  return innerHtml.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

// Raw HTML only (DEC-7): anything JavaScript adds after load is invisible here.
export function analyzeHtml(html: string, pageUrl: string): WebsiteChecks {
  const urls: string[] = [];
  for (const m of html.matchAll(/\b(?:src|href)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
    const url = resolve(m[1] ?? m[2], pageUrl);
    if (url) urls.push(url);
  }

  let bookNow: WebsiteChecks["bookNow"] = { found: false };
  let tapToCall = false;
  for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const hrefMatch = m[1].match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
    const href = hrefMatch ? (hrefMatch[1] ?? hrefMatch[2]).trim() : "";
    if (/^tel:/i.test(href)) tapToCall = true;
    const text = linkText(m[2]);
    if (!bookNow.found && isBookNowText(text)) {
      bookNow = { found: true, text, href: resolve(href, pageUrl) ?? href };
    }
  }

  return {
    source: "html",
    mobileScore: null,
    https: pageUrl.toLowerCase().startsWith("https:"),
    viewport: null,
    tapTargetsOk: null,
    bookingEngine: detectBookingEngine(urls, hostOf(pageUrl) ?? ""),
    bookNow,
    tapToCall,
  };
}
