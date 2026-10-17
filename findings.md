# Findings

## Requirements

- Job evidence for Hotelzify, Founding Engineer, US Business. The full job post reading is in `/Volumes/asus/career-ops/research/hotelzify/jd-read.md`.
- Built on real public review data only. No outreach to hotels (Deepak, 18 Oct).
- Version 1 in 2 days.

## Research findings

- Guest problems around booking and contact, with sources: `/Volumes/asus/career-ops/research/hotelzify/guest-problems.md`. Most of them come from OTA bookings: refused cancellations, no room on arrival, hidden fees, hotel unreachable. Cloudbeds' 2026 report says OTA bookings are cancelled 21.8% of the time against 10.6% for direct bookings.
- Hotel-owner problems and Hotelzify's products: `hotelier-problems.md` (agent still running on 18 Oct).

### Data sources (tested 18 Oct 2026)

- **Google Places API (New):** key works. At most 5 reviews per place, the ones Google rates "most relevant". Places content may not be stored or cached; place IDs may be. The Maps Platform terms prohibit scraping, so Playwright scraping of Google Maps is out.
- **Tripadvisor:** the legacy Content API (`api.content.tripadvisor.com`) was retired on 31 Aug 2026; a Terra key returns 403 on it. Terra: base `https://terra.tripadvisor.com/api`, header `X-API-Key`, search `GET /locations/search?query=…`, reviews `GET /locations/{id}/reviews`. The free Discover plan returns only the **3 most recent reviews** per location and allows 1,000 calls a month.
- In the feasibility run below, the Tripadvisor name match returned nothing for all 12 hotels, so all 60 reviews are Google's. This needs debugging; the search probably returns differently named locations.

### Feasibility check: what 60 real reviews talk about

Twelve Portland, Maine hotels, 5 Google reviews each, 16 of them rated 1–3 stars. A crude keyword tag gave this share of reviews per theme. Only counts were saved (`feasibility-counts.json`); no review text was stored.

| Theme | All reviews | 1–3 star reviews (of 16) |
|---|---|---|
| room / bed | 70% | 15 |
| location | 68% | 11 |
| staff | 61% | 12 |
| breakfast / food | 43% | 7 |
| clean | 38% | 7 |
| check-in info | 31% | 6 |
| parking | 23% | 3 |
| booking / OTA | 16% | 6 |
| noise | 16% | 2 |
| fees / price | 13% | 3 |
| contact / phone | 8% | 4 |
| cancel / refund | 3% | 2 |

**What it means:**

- At 5–8 reviews per hotel, booking, contact and cancellation problems are rare for any one hotel. A per-hotel "your booking problems" report would usually come out empty. That idea fails at this data size.
- Reviews mostly talk about the stay itself: rooms, location, staff, food. Software can't fix those, but **what guests praise is marketing material** (location, staff, breakfast). That feeds Hotelzify's AI ad engine, booking website and Google profile.
- **Check-in information (31%) and parking (23%) come up often.** These are questions guests had to work out for themselves, which are exactly what an AI concierge and a good booking site answer before arrival.
- The keyword tags are crude ("book", "app", "key" and "reach" match innocent text), so the percentages are rough. They are good enough to rule out the per-hotel complaints idea, not to rank themes precisely.

## Technical decisions

- **18 Oct · Model access (Deepak):** local build uses `claude -p` (the Claude Code CLI on Deepak's subscription). The shipped app is BYOK through OpenRouter (the viewer pastes their own key). Demos on X or for the founder use free OpenRouter models.
  - Consequence 1: the model layer needs three backends behind one interface: `claude -p` (local only), OpenRouter (BYOK, OpenAI-compatible API), and a scripted fake for tests.
  - Consequence 2: `claude -p` runs on a personal subscription. Keep it to local development; don't wire it into the public demo.
  - Consequence 3: free OpenRouter models (`:free` IDs) allow 20 requests a minute and 50 a day, or 1,000 a day after a one-time $10 credit purchase (third-party sources, 2026; check https://openrouter.ai/docs/api/reference/limits). One report should cost 1–2 model calls, so 50 a day is enough to demo but not for a public link that spreads on X.
  - Consequence 4: free models are weaker at sticking to their sources, so the citation check (every claim must quote a real review) matters more, not less.
  - Consequence 5: BYOK key handling becomes a security decision to show: the key lives only in the viewer's browser session, goes only to OpenRouter, and is never logged or stored on the server.
  - Consequence 6: free providers may log or train on prompts. Review text is public, but check Google's terms on sending Places content to a third-party model before going public.

## Issues and resolutions

- Tripadvisor 403 on first key → it was a Terra key used on the retired API; switched to the Terra base URL. Resolved.

## Resources

- Google Places policies: https://developers.google.com/maps/documentation/places/web-service/policies
- Terra docs: https://docs.terra.tripadvisor.com/docs
