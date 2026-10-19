# Direct Booking Check: execution flow

How execution travels between files and functions. Written as the code lands, so it only covers what exists. Anything still planned is marked **not built**.

## What exists today (20 Oct 2026, ENG-010)

```
lib/types.ts        shared types only, no runtime code
lib/quotes.ts
  quoteAppearsIn(quote, text) -> boolean
      normalise(quote), normalise(text), substring test
  verifyThemes(themes, reviews) -> { themes, dropped }
      builds a Map reviewId -> review text
      for each theme, for each quote:
          review id not in the map      -> dropped, "unknown review id"
          quoteAppearsIn(...) is false  -> dropped, "quote not in review"
          otherwise                     -> kept
      theme with no kept quotes         -> removed (its drops stay in `dropped`)
      reviewIds = distinct kept ids, first-seen order; count = reviewIds.length
      sort by count, highest first (stable)
```

**Who calls it:** today only `tests/quotes.test.ts`. In the planned path, `lib/llm.ts` `extractThemes` (step 9, **not built**) calls `verifyThemes` on the model's raw JSON, and `lib/pipeline.ts` `runCheck` (step 10, **not built**) calls `extractThemes`.

**Boundaries:** none yet. `lib/quotes.ts` is pure: no network, no files, no environment variables. That is why it is tested first: it can be tested completely with a fixture and nothing else.

## Touched this session

- 20 Oct, ENG-010: added `lib/types.ts`, `lib/quotes.ts`, `tests/quotes.test.ts`, `tests/fixtures/reviews.json`.
