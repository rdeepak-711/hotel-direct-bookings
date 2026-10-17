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
