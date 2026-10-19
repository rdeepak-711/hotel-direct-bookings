import type { Dropped, Quote, RawTheme, Review, Theme } from "./types";

// Lowercase, curly quotes to straight, whitespace runs to one space, trim.
// Applied to both sides so formatting never decides a match; only the words do.
function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export function quoteAppearsIn(quote: string, text: string): boolean {
  const needle = normalise(quote);
  if (needle === "") return false;
  return normalise(text).includes(needle);
}

// The model proposes quotes; this keeps only the ones that are really in the review they cite.
export function verifyThemes(themes: RawTheme[], reviews: Review[]): { themes: Theme[]; dropped: Dropped[] } {
  const textById = new Map(reviews.map((r) => [r.id, r.text]));
  const dropped: Dropped[] = [];
  const kept: Theme[] = [];

  for (const theme of themes) {
    const quotes: Quote[] = [];
    for (const q of theme.quotes) {
      const text = textById.get(q.reviewId);
      if (text === undefined) {
        dropped.push({ theme: theme.name, reviewId: q.reviewId, quote: q.quote, reason: "unknown review id" });
      } else if (!quoteAppearsIn(q.quote, text)) {
        dropped.push({ theme: theme.name, reviewId: q.reviewId, quote: q.quote, reason: "quote not in review" });
      } else {
        quotes.push(q);
      }
    }
    if (quotes.length === 0) continue;
    const reviewIds = [...new Set(quotes.map((q) => q.reviewId))];
    kept.push({ name: theme.name, quotes, count: reviewIds.length, reviewIds });
  }

  // Array.prototype.sort is stable, so themes with equal counts keep their input order.
  kept.sort((a, b) => b.count - a.count);
  return { themes: kept, dropped };
}
