import { describe, expect, it } from "vitest";
import { quoteAppearsIn, verifyThemes } from "@/lib/quotes";
import type { RawTheme, Review } from "@/lib/types";
import reviewsJson from "./fixtures/reviews.json";

// Fixture review text is invented, never copied from a real review.
const reviews = reviewsJson as Review[];

describe("quoteAppearsIn", () => {
  it("1. matches an exact substring", () => {
    expect(quoteAppearsIn("the breakfast was great", "Lovely stay. The staff were so friendly and the breakfast was great.")).toBe(true);
  });

  it("2. ignores letter case", () => {
    expect(quoteAppearsIn("THE STAFF WERE SO FRIENDLY", "The staff were so friendly.")).toBe(true);
  });

  it("3. treats curly quotes and apostrophes as straight ones", () => {
    expect(quoteAppearsIn("couldn't find any info", "Couldn’t find any info.")).toBe(true);
    expect(quoteAppearsIn('on the "website"', "Nothing on the “website”.")).toBe(true);
    expect(quoteAppearsIn("couldn’t find", "Couldn't find it.")).toBe(true);
  });

  it("4. collapses runs of whitespace, including line breaks", () => {
    expect(quoteAppearsIn("clean room. where do we park?", "Friendly staff, clean room.\nWhere do we  park?")).toBe(true);
  });

  it("5. ignores spaces around the quote", () => {
    expect(quoteAppearsIn("   room was small   ", "Breakfast was great value. Room was small.")).toBe(true);
  });

  it("6. never matches an empty or blank quote", () => {
    expect(quoteAppearsIn("", "Any review text.")).toBe(false);
    expect(quoteAppearsIn("   \n ", "Any review text.")).toBe(false);
  });

  it("7. fails when a single word is changed", () => {
    expect(quoteAppearsIn("breakfast was amazing", "Breakfast was great value.")).toBe(false);
  });
});

describe("verifyThemes", () => {
  it("8. drops a quote whose review id does not exist", () => {
    const themes: RawTheme[] = [
      { name: "Friendly staff", quotes: [{ reviewId: "r1", quote: "the staff were so friendly" }, { reviewId: "r9", quote: "best staff ever" }] },
    ];
    const { dropped } = verifyThemes(themes, reviews);
    expect(dropped).toEqual([{ theme: "Friendly staff", reviewId: "r9", quote: "best staff ever", reason: "unknown review id" }]);
  });

  it("9. drops an invented quote and keeps the theme's real ones", () => {
    const themes: RawTheme[] = [
      { name: "Friendly staff", quotes: [{ reviewId: "r1", quote: "the staff were so friendly" }, { reviewId: "r3", quote: "staff were lovely" }] },
    ];
    const result = verifyThemes(themes, reviews);
    expect(result.dropped).toEqual([{ theme: "Friendly staff", reviewId: "r3", quote: "staff were lovely", reason: "quote not in review" }]);
    expect(result.themes).toEqual([
      { name: "Friendly staff", quotes: [{ reviewId: "r1", quote: "the staff were so friendly" }], count: 1, reviewIds: ["r1"] },
    ]);
  });

  it("10. removes a theme whose quotes all fail, but still records the drops", () => {
    const themes: RawTheme[] = [
      { name: "Great breakfast", quotes: [{ reviewId: "r3", quote: "breakfast was amazing" }, { reviewId: "r9", quote: "best breakfast ever" }] },
    ];
    const result = verifyThemes(themes, reviews);
    expect(result.themes).toEqual([]);
    expect(result.dropped.map((d) => d.reason)).toEqual(["quote not in review", "unknown review id"]);
  });

  it("11. counts two quotes from the same review as one review", () => {
    const themes: RawTheme[] = [
      { name: "Breakfast", quotes: [{ reviewId: "r1", quote: "the breakfast was great" }, { reviewId: "r1", quote: "lovely stay" }] },
    ];
    const [theme] = verifyThemes(themes, reviews).themes;
    expect(theme.count).toBe(1);
    expect(theme.reviewIds).toEqual(["r1"]);
    expect(theme.quotes).toHaveLength(2);
  });

  it("12. lists review ids in the order they first appear", () => {
    const themes: RawTheme[] = [
      {
        name: "Parking",
        quotes: [
          { reviewId: "r2", quote: "where do we park?" },
          { reviewId: "r1", quote: "parking was a nightmare" },
          { reviewId: "r2", quote: "couldn't find any info" },
        ],
      },
    ];
    expect(verifyThemes(themes, reviews).themes[0].reviewIds).toEqual(["r2", "r1"]);
  });

  it("13. sorts themes by count, highest first, keeping ties in their original order", () => {
    const themes: RawTheme[] = [
      { name: "A, one review", quotes: [{ reviewId: "r3", quote: "room was small" }] },
      { name: "B, two reviews", quotes: [{ reviewId: "r1", quote: "friendly" }, { reviewId: "r2", quote: "friendly staff" }] },
      { name: "C, one review", quotes: [{ reviewId: "r1", quote: "lovely stay" }] },
    ];
    expect(verifyThemes(themes, reviews).themes.map((t) => t.name)).toEqual(["B, two reviews", "A, one review", "C, one review"]);
  });
});
