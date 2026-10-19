# Decisions

## 2026-10-18 · What to build: Direct Booking Check

**Decided:** a web tool that checks a US hotel's public signs of lost direct bookings (Google listing, website as loaded on a phone, Tripadvisor rank, what guests praise and what they had to work out), with the top 3 fixes first. Job evidence for Hotelzify's Founding Engineer, US Business role; the founder already hands out a hand-made version of this report at AAHOA events.

**Considered:** per-hotel booking-complaint mining (killed by a feasibility run: in 60 real reviews, booking and contact complaints were 8–16%, so most per-hotel reports would be empty); an AI phone agent (guests say they'd hang up); a commission calculator (Hotelzify already has one); a grounded concierge (no real data, doesn't touch how they sell).

**Cost:** it's a diagnosis, not a product that books rooms. The "real users" line in the job post goes unmet; real data on real hotels stands in for it.

## 2026-10-18 · Name: "Direct Booking Check", not "leakage report"

**Why:** we see proxies (slow site, missing description), not bookings. "Leakage" promised a measurement we can't make. It stays in the explanation.

## 2026-10-18 · Real APIs only, no scraping

**Decided:** Google Places API (New), Tripadvisor Terra API, Google PageSpeed API. No Playwright scraping of Google Maps or Tripadvisor.

**Why:** both sites' terms prohibit scraping; a job that says "hotels trust us with guest data" shouldn't be won with scraped data.

**Cost:** 5 Google + 3 Tripadvisor reviews per hotel. Reports speak in patterns ("3 of 8 reviews"), never percentages. Production path: the hotel connects its Google Business Profile for full history (the day-60 integration to propose).

## 2026-10-18 · Review text is never stored

**Why:** Google's Places policy forbids caching review content (place IDs are exempt). Also: no store of guest-written text to leak. Reports echo only the verified quote fragments, never full reviews.

## 2026-10-18 · Quotes verified in code, counts recomputed in code

**Decided:** every AI quote must be a substring of the cited review (case, whitespace and curly quotes ignored) or it is dropped; theme counts come from the surviving review ids, not from the model.

**Considered:** trusting the prompt; a second "judge" model.

**Why:** free models (used for demos) invent more; a selling point a hotel can't back up is worse than none. Same idea as escalation-gate.

**Cost:** a real quote filed under the wrong theme passes. Named as a gap.

## 2026-10-18 · PageSpeed as the main website source, plain fetch as fallback

**Why:** PageSpeed loads the page in a real browser and returns every network request, so the booking-engine vendor is visible even on JavaScript-built sites. A plain fetch misses those. Cost: 10–45 s per run; it runs in parallel.

## 2026-10-18 · Tripadvisor matched by coordinates, not name text

**Why:** a name-text search matched none of 12 Portland hotels in the feasibility run. Nearby search by Google's coordinates plus name similarity is reliable and also yields the city ranking, a number owners recognise.

## 2026-10-18 · Two audiences, one codebase

**Decided:** public pages use generic categories; `audience=partner` adds Hotelzify product names.

**Why:** the public site must not carry Hotelzify's name or branding (not affiliated); the founder's copy should map each fix to their product line.

## 2026-10-18 · Spending guard is the Google Cloud quota, not app code

**Why:** Vercel runs many short-lived server instances, so an in-memory rate limiter resets per instance. Per-visitor limits stay in as best-effort; the hard daily quota on the Places key is what actually caps the bill.

## 2026-10-18 · Stack: Next.js + TypeScript on Vercel, Vitest

**Considered:** Python + FastAPI (Deepak's strongest backend).

**Why:** one project for page and API, one-command deploy, Deepak's web stack; Hotelzify lists no stack. Cost: a separate frontend would have been avoided either way; Python would have needed a second deploy target.

## 2026-10-18 · Model access: OpenRouter demo key, viewer's own key, fake for tests; `claude -p` local-only and optional

**Why (Deepak):** build locally on the Claude subscription, ship BYOK via OpenRouter, demo on free models. Cost: free models cap at 50 requests a day (1,000 after a one-time $10); the quote check matters more with weaker models. The viewer's key never touches the server.

## 2026-10-18 · No outreach to hotel owners

**Decided (Deepak):** evidence comes from public reviews only. Cost: the "real users" and "talk to hoteliers" lines in the post are answered with real data, not real conversations.

## 2026-10-18 · Revision 3: add the gap check and the neighbour comparison; Tripadvisor becomes optional

**Trigger (Deepak):** "doesn't it just get info from sites and showcase it? anything new!!" Correct: about 70% of the first design was data the owner already had.

**Decided:** two new parts carry the value. (1) **Gap check:** the questions guests raise in reviews (parking, check-in, pets…) are checked against the text of the hotel's own website; a question the site never answers is a high-severity finding. (2) **Neighbour comparison:** rating, review count, mobile speed, listing description and phone are shown against the 5 nearest hotels from Google's nearby search, counted and never named, with no reviews fetched for them. The home page is now always fetched (the gap check needs its text), not only as a fallback.

**Considered:** batch mode for the sales team (paste 50 hotels, get a ranked prospect list). Deferred to the day-60 roadmap: it is the most valuable form for Hotelzify but not buildable in the 2 days.

**Why:** both are inferences across sources that no single site offers, so the report says something the owner didn't know.

**Cost:** about half a day more. To stay inside 2 days, Tripadvisor moves to "if time remains" (its client and tests stay; the pipeline wiring is optional). 5 extra PageSpeed runs per report (free, concurrent) and one nearby search plus no per-neighbour detail calls (the nearby response already carries the fields). Keyword-based topic matching is crude: "Street noise" has no topic and gets no gap check.

## 2026-10-18 · A direct booking score, defined in code

**Decided:** the report leads with one number, 0–100, from four sub-scores weighted website 35, guest messaging 25, Google listing 20, reviews 20 (`lib/score.ts`, spec step 6). Website starts from the PageSpeed mobile score and deducts for http, no viewport, booking off the hotel's domain and no tap-to-call; messaging deducts 25 per guest question the site doesn't answer; listing is 40/30/30 for description, website, phone; reviews is the rating scaled, minus 10 under 50 reviews. Null sub-scores drop out and the weights renormalise.

**Considered:** no score (the leak flow leads); a model-generated score.

**Why:** the gauge is the one thing people remember from the page, and a formula in code is explainable to an owner line by line, which a model's number is not. Weights follow where the leak is: the website is what the owner controls and where this hotel loses most.

**Cost:** the weights are a judgement, not measured against bookings; the README must say so. On the fixture the formula gives 54, and the mock-up's sub-scores were changed to match it (23/65/60/90) rather than the other way round.

## 2026-10-18 · No visitor analytics at launch; measure with a per-run log line and a hand eval

**Decided:** the public page carries no tracking script, cookie or database. Measurement is three layers (plan section 14): one structured log line per report run (sections available, website source, quotes dropped / offered, wall time, neighbours found; never a key, a review text or an IP), a hand eval of the findings on 10 real hotels recorded in the README, and the founder's response. The log line and two "not a real website" rules (social-media URLs count as no website; under 200 characters of page text counts as "could not check") are proposed spec additions awaiting Deepak's decision before `handoff`.

**Considered:** Vercel Analytics or Umami on the page; a database of past runs.

**Why:** the page handles other people's reviews and sometimes a viewer's own API key; every third party on it is one more thing to explain and one more place for data to go. Visitor counts also answer nothing the job needs; "how often does the AI invent quotes" does.

**Cost:** no idea how many people open a shared link. Acceptable for a demo; revisit if it becomes a product.

## 2026-10-18 · Correction: the viewer's own key does pass through the server

**Decided:** plan section 6 said the viewer's OpenRouter key "never touches our server". The spec (step 11) and the architecture diagram say the key is sent in the POST body, used once on the server, never stored, logged or echoed. The plan line was wrong and is corrected; the spec stands.

**Why:** a browser-direct call to OpenRouter would expose the prompt and the request shape, and would need CORS handling on a third party we don't control. Holding the key for one request and writing it nowhere is the simpler, testable rule, and `tests/api.test.ts` asserts the response never echoes it.

**Cost:** the server does see the key in memory for the length of one request. The README must say so plainly.

## 2026-10-19 · Three spec additions before handoff: run log, "not a real website", "could not read the site"

**Decided (Deepak):** add all three to `spec/site.md` with failing tests before `handoff`. (1) `runCheck` writes one structured log line per run (sections available, PageSpeed fallback, quotes offered and dropped, neighbours, wall time), never a key, review text, hotel name, place id or IP. (2) `isRealWebsite`: a Facebook, Instagram, booking-site or link-page URL counts as no website: no fetch, no PageSpeed, website score 0, a `no-website` finding naming the host. (3) `isReadableText`: under 200 characters of home-page text means the gap check says "unknown", never "not mentioned", and the report adds a `site-unreadable` finding.

**Considered:** leaving all three as known weaknesses in the README, or adding the log line on day 3.

**Why:** each one removes a way the report could be confidently wrong about a real hotel, which is the failure that would hurt most in front of Hotelzify or on X. The log line is the only source for "how often does the AI invent quotes" as a number.

**Cost:** about 1 extra hour of build time, and the 200-character limit is a guess: a short but real page could be called unreadable. The hand check on 10 hotels (plan 14b) is where that gets tested.

## 2026-10-19 · "Fix all": the nine gaps from the review, decided in one go

**Decided (Deepak: "fix all"):** every gap in `docs/review-2026-10-19.html` goes into the spec and tests before handoff. (1) Partner view gated by `PARTNER_TOKEN`, checked on the server. (2) The gap check reads the home page plus up to four informational pages it links to, within a 20-second budget, and the finding says how many pages were checked. (3) Search is US only: `regionCode: "US"` and addresses ending in `USA`. (4) `maxDuration = 120` on the report route and a 50-second budget for the neighbours' PageSpeed runs. (5) `PAGESPEED_API_KEY` required in live mode. (6) Google display policy applied: author name and a link to the original review on every quote, and an ordering notice; the policies page has no rule against reading reviews with a model at request time, and nothing is stored, so the AI step stays on Google reviews. (7) The Reviews sub-score is dropped; weights become 40/30/30 and the fixture total 47. (8) A ten-minute in-memory cache for PageSpeed results and the neighbour list only. (9) Parking excludes for "Central Park", "Park Avenue", "parkway".

**Considered:** wording-only fix for (2); keeping the Reviews sub-score under a "readiness" name for (7); removing the partner audience entirely for (1).

**Why:** (1) and (2) were the two that could embarrass the tool in front of Hotelzify; the rest each remove a silent failure (throttled PageSpeed, a 504, a non-US hotel) or a question with no answer on the CEO call.

**Cost:** about an hour more build time; the mock-up's fourth gauge segment is gone; the 200-character and 20-second limits are guesses to be checked in the 10-hotel hand check. The Google terms question is closed on the policies page only; the broader Service Terms were not re-read.
