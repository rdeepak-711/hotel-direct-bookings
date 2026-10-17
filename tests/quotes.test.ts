import { describe, expect, it } from "vitest";
import { quoteAppearsIn, verifyThemes } from "@/lib/quotes";
import reviews from "./fixtures/reviews.json";
import good from "./fixtures/llm-good.json";
import bad from "./fixtures/llm-hallucinated.json";

describe("quoteAppearsIn", () => {
  const text = "Great location, wish we'd known parking was a block away in a paid garage.";
  it("matches exact substrings", () => {
    expect(quoteAppearsIn("parking was a block away", text)).toBe(true);
  });
  it("ignores case, repeated whitespace and curly quotes", () => {
    expect(quoteAppearsIn("Wish We'd  known PARKING", text)).toBe(true);
    expect(quoteAppearsIn("wish we’d known parking", text)).toBe(true);
  });
  it("rejects text that is not there", () => {
    expect(quoteAppearsIn("the rooftop pool was a highlight", text)).toBe(false);
    expect(quoteAppearsIn("", text)).toBe(false);
  });
});

describe("verifyThemes", () => {
  it("keeps every theme when all quotes are real and recomputes counts", () => {
    const result = verifyThemes(good.praise, reviews);
    expect(result.dropped).toEqual([]);
    expect(result.themes.map((t) => t.name)).toEqual(["Location next to the Old Port", "Breakfast", "Friendly staff"]);
    expect(result.themes[0].reviewIds).toEqual(["g-1", "g-4", "ta-101", "ta-103"]);
    expect(result.themes[0].count).toBe(4);
    expect(result.themes[1].count).toBe(2);
  });

  it("drops invented quotes, unknown review ids and themes left with no quotes", () => {
    const result = verifyThemes(bad.praise, reviews);
    expect(result.themes.map((t) => t.name)).toEqual(["Location next to the Old Port", "Breakfast"]);
    // Breakfast lost its g-9 quote (no such review) but kept the real one
    expect(result.themes[1].reviewIds).toEqual(["g-4"]);
    expect(result.themes[1].count).toBe(1);
    expect(result.dropped).toHaveLength(2);
    expect(result.dropped).toContainEqual({ theme: "Rooftop pool", reviewId: "g-2", quote: "the rooftop pool was a highlight", reason: "quote not in review" });
    expect(result.dropped).toContainEqual({ theme: "Breakfast", reviewId: "g-9", quote: "best breakfast in Maine", reason: "unknown review id" });
  });

  it("counts a review once per theme even if quoted twice", () => {
    const themes = [{ name: "Staff", quotes: [
      { reviewId: "g-1", quote: "The staff remembered our names" },
      { reviewId: "g-1", quote: "remembered our names by day two" },
    ] }];
    const result = verifyThemes(themes, reviews);
    expect(result.themes[0].count).toBe(1);
    expect(result.themes[0].reviewIds).toEqual(["g-1"]);
  });

  it("sorts themes by count, highest first, ties in input order", () => {
    const result = verifyThemes([good.praise[2], good.praise[0], good.praise[1]], reviews);
    expect(result.themes.map((t) => t.count)).toEqual([4, 2, 2]);
    expect(result.themes.map((t) => t.name)).toEqual(["Location next to the Old Port", "Friendly staff", "Breakfast"]);
  });
});
