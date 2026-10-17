import { describe, expect, it } from "vitest";
import { TOPICS, extractText, findGaps, siteMentions, topicForTheme } from "@/lib/gaps";
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
