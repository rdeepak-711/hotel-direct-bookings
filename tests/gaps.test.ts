import { describe, expect, it } from "vitest";
import { INTERNAL_PAGE_PATTERN, MIN_PAGE_TEXT, TOPICS, TOPIC_EXCLUDES, extractInternalLinks, extractText, findGaps, isReadableText, siteMentions, topicForTheme } from "@/lib/gaps";
import { readFileSync } from "node:fs";
import path from "node:path";

const home = readFileSync(path.join(__dirname, "fixtures/home.html"), "utf8");

describe("extractText", () => {
  it("returns visible text and the meta description, without tags or scripts", () => {
    const text = extractText("<html><head><meta name=\"description\" content=\"Cosy inn\"><script>var x=1;</script><style>a{}</style></head><body><h1>Hi</h1><p>Parking is free.</p></body></html>");
    expect(text).toContain("Cosy inn");
    expect(text).toContain("Parking is free.");
    expect(text).not.toContain("var x");
    expect(text).not.toContain("<p>");
  });
});

describe("topicForTheme", () => {
  it.each([
    ["Parking", "parking"],
    ["Where to park", "parking"],
    ["Check-in time", "check-in"],
    ["Early check in", "check-in"],
    ["Late checkout", "check-out"],
    ["Dog policy", "pets"],
    ["Breakfast hours", "breakfast"],
    ["Wifi password", "wifi"],
    ["Airport shuttle", "airport"],
    ["Cancellation terms", "cancellation"],
    ["Wheelchair access", "accessibility"],
    ["Resort fee", "fees"],
    ["Noise from the street", null],
  ])("%s → %s", (name, topic) => expect(topicForTheme(name)).toBe(topic));

  it("has keywords for every topic", () => {
    for (const t of ["parking", "check-in", "check-out", "pets", "breakfast", "wifi", "airport", "cancellation", "accessibility", "fees"]) {
      expect(TOPICS[t].length).toBeGreaterThan(0);
    }
  });
});

describe("siteMentions", () => {
  const text = extractText(home);
  it("finds topics the page talks about", () => {
    expect(siteMentions(text, "check-in")).toBe(true);
    expect(siteMentions(text, "breakfast")).toBe(true);
    expect(siteMentions(text, "wifi")).toBe(true);
  });
  it("reports topics the page is silent on", () => {
    expect(siteMentions(text, "parking")).toBe(false);
    expect(siteMentions(text, "pets")).toBe(false);
  });
  it("does not count Central Park, Park Avenue or a parkway as parking", () => {
    expect(TOPIC_EXCLUDES.parking.length).toBeGreaterThan(0);
    expect(siteMentions("Rooms with views of Central Park. Walk to Park Avenue.", "parking")).toBe(false);
    expect(siteMentions("Minutes from the Garden State Parkway.", "parking")).toBe(false);
    expect(siteMentions("Views of Central Park and a free parking garage.", "parking")).toBe(true);
  });
});

describe("findGaps", () => {
  const questions = [
    { name: "Parking", count: 2, reviewIds: ["g-2", "ta-102"], quotes: [] },
    { name: "Check-in time", count: 1, reviewIds: ["g-5"], quotes: [] },
    { name: "Street noise", count: 1, reviewIds: ["g-7"], quotes: [] },
  ];
  it("marks each question answered or not on the site", () => {
    const gaps = findGaps(questions, extractText(home));
    expect(gaps).toEqual([
      { themeName: "Parking", topic: "parking", count: 2, mentionedOnSite: false },
      { themeName: "Check-in time", topic: "check-in", count: 1, mentionedOnSite: true },
      { themeName: "Street noise", topic: null, count: 1, mentionedOnSite: null },
    ]);
  });
  it("returns null for every mention when there is no page text", () => {
    const gaps = findGaps(questions, null);
    expect(gaps.every((g) => g.mentionedOnSite === null)).toBe(true);
  });
});

describe("unreadable pages", () => {
  const questions = [{ name: "Parking", count: 2, reviewIds: ["g-2"], quotes: [] }];
  it("treats under 200 characters of page text as could not check, never as not mentioned", () => {
    expect(MIN_PAGE_TEXT).toBe(200);
    const jsShell = extractText("<html><body><div id=\"root\"></div><script>render()</script><noscript>Enable JavaScript</noscript></body></html>");
    expect(isReadableText(jsShell)).toBe(false);
    expect(findGaps(questions, jsShell)).toEqual([{ themeName: "Parking", topic: "parking", count: 2, mentionedOnSite: null }]);
  });
  it("counts whitespace-only padding as no text", () => {
    expect(isReadableText(" ".repeat(500))).toBe(false);
    expect(isReadableText(null)).toBe(false);
    expect(isReadableText("a".repeat(200))).toBe(true);
  });
});

describe("extractInternalLinks", () => {
  const page = "https://www.harborside-inn-example.com/";
  const html = `<nav>
    <a href="/">Home</a>
    <a href="/rooms">Rooms</a>
    <a href="https://www.harborside-inn-example.com/faq">FAQ</a>
    <a href="https://harborside-inn-example.com/policies#pets">Policies</a>
    <a href="/about-us">About</a>
    <a href="/gallery">Gallery</a>
    <a href="/brochure.pdf">Parking map</a>
    <a href="https://www.facebook.com/harborside">Guest reviews</a>
    <a href="mailto:hi@harborside-inn-example.com">Guest services</a>
    <a href="/contact">Contact</a>
    <a href="/parking">Where to park</a>
  </nav>`;
  it("returns up to four same-host pages whose path or text looks informational, in document order", () => {
    expect(extractInternalLinks(html, page)).toEqual([
      "https://www.harborside-inn-example.com/rooms",
      "https://www.harborside-inn-example.com/faq",
      "https://harborside-inn-example.com/policies",
      "https://www.harborside-inn-example.com/about-us",
    ]);
    expect(extractInternalLinks(html, page, 10)).toContain("https://www.harborside-inn-example.com/parking");
  });
  it("skips other hosts, files, mail links and the page itself", () => {
    const links = extractInternalLinks(html, page, 10);
    expect(links.some((l) => l.includes("facebook.com") || l.includes(".pdf") || l.startsWith("mailto:") || l === page)).toBe(false);
    expect(links).not.toContain("https://www.harborside-inn-example.com/gallery");
  });
  it("matches the agreed words", () => {
    for (const w of ["faq", "policies", "amenities", "rooms", "about", "parking", "pets", "guest-info", "your-stay"]) expect(INTERNAL_PAGE_PATTERN.test(w)).toBe(true);
    expect(INTERNAL_PAGE_PATTERN.test("gallery")).toBe(false);
  });
});
