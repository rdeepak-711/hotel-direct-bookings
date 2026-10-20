# Direct Booking Check: execution flow

How execution travels between files and functions. Written as the code lands, so it only covers what exists. Anything still planned is marked **not built**.

## What exists today (20 Oct 2026, ENG-010 and ENG-011a)

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

### lib/website.ts (ENG-011a)

```
lib/website.ts
  hostOf(url) -> lowercase hostname, or null if the URL does not parse
  hostIs(host, domain) -> host === domain || host ends in "." + domain
  detectBookingEngine(urls, ownHost) -> BookingEngine | null
      for each url: hostOf(url)
          host matches a BOOKING_VENDORS domain (hostIs)  -> return { domain: host, vendor, onOwnDomain: false } at once
          host === ownHost, path (with NOT_BOOKING words facebook|guestbook|bookshop|bookstore removed)
          matches book|booking|reserve|reservation|availability,
          path is not an asset file (.css .js .jpg ... .woff2) -> remember the first one
      no vendor found -> the remembered own-domain match { domain: ownHost, vendor: null, onOwnDomain: true }, or null
  isBookNowText(text) -> booking word present AND no NOT_BOOKING word (facebook|guestbook|bookshop|bookstore)
  isRealWebsite(url) -> false for null, unparseable, or a host that hostIs one of NOT_A_WEBSITE_HOSTS
  analyzeHtml(html, pageUrl) -> WebsiteChecks (source "html")
      every src="..." / href="..." -> resolved against pageUrl -> urls
      every <a ...>inner</a>:
          href starts with tel:                     -> tapToCall = true
          inner with tags stripped, spaces collapsed -> isBookNowText? first hit is bookNow { text, resolved href }
      bookingEngine = detectBookingEngine(urls, hostname of pageUrl)
      https = pageUrl starts with https:; mobileScore, viewport, tapTargetsOk = null
```

**Who calls it:** today only `tests/website.test.ts`. In the planned path, `analyzeLighthouse` (ENG-011b, **not built**) calls `detectBookingEngine` on PageSpeed's network-request URLs and takes `bookNow` and `tapToCall` from an `analyzeHtml` result (DEC-7); `isRealWebsite` decides whether the hotel's listed website is checked at all; `lib/pipeline.ts` `runCheck` (step 10, **not built**) wires them together.

**Boundaries:** none. `lib/website.ts` is pure: it never fetches. The HTML it reads is handed to it by the caller, which will get it through `lib/safeFetch.ts` (step 3, **not built**). Because it reads raw HTML, a "Book now" button that JavaScript draws after load is invisible to it (DEC-7 cost; ENG-011h measures it).

## Touched this session

- 20 Oct, ENG-010: added `lib/types.ts`, `lib/quotes.ts`, `tests/quotes.test.ts`, `tests/fixtures/reviews.json`.
- 20 Oct, ENG-011a: added `lib/website.ts` (everything in step 2 except `analyzeLighthouse`, which is ENG-011b).
