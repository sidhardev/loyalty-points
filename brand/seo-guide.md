# Regularhood SEO guide — from Search Console (10 Nov 2026)

Data: Google Search Console, `sc-domain:regularhood.in`, last 3 months (12 Oct – 8 Nov 2026).

## Where we stand

| Metric | Value |
|---|---|
| Clicks | 22 |
| Impressions | 1,540 |
| Avg CTR | 1.4% |
| Avg position | 11.7 |
| Indexed pages | 96 |
| Not indexed | 11 |

**The one-line takeaway:** Google already shows our Hindi guides on page 1 (position 7–9), but nobody clicks them. Fixing titles and adding pages that match the actual searches beats creating 50 more pages.

## What the data says

### 1. Hindi guides get the impressions and almost no clicks

| Page | Impr. | Clicks | Position |
|---|---|---|---|
| /hi/guide/get-customers-for-new-shop | 309 | 1 | 7.2 |
| /hi/guide/win-back-old-customers | 195 | 0 | 7.9 |
| /hi/guide/how-to-increase-shop-sales | 189 | 2 | 8.6 |
| /hi/guide/how-to-get-repeat-customers | 160 | 0 | 7.9 |
| /guide/how-to-get-repeat-customers | 111 | 1 | 10.4 |
| /guide/messages-to-bring-customers-back | 102 | 1 | 5.3 |

Hindi guides = ~60% of all impressions. Top query: **"दुकान में बिक्री कैसे बढ़ाए"** (100 impr, pos 8.1). The titles didn't use the searcher's exact question, so they got skipped.

### 2. People search in Hinglish and ask for a "mantra"
Queries with no matching page: *dukan ki sale kaise badhaye, shop pe customer kaise banaye, customer bulane ka mantra, customer ko bulane ka mantra, dukaan mein grahak bulane ki dua, दुकान में ग्राहक लाने का टोटका, dukan par grahak kaise badhaye*. All rank around position 3–10 even without a page made for them, so this is easy to win.

### 3. A "follow-up message" assignment query ranks #4 with 0 clicks
"create a simple follow-up message… write a short and polite message asking your customer for a repeat service… create different offers…" shows up in 4 variants (~127 impr, pos 3.9–9). It looks like a course/assignment prompt. Students and shop owners both search it, and a page that answers it step by step can take that traffic.

### 4. Restaurant and salon searches are too far down to get clicks
- "salon loyalty programs" 60 impr at **pos 82**; /for/salon at pos 79.6; /guide/salon-loyalty-program at 58.9.
- "restaurant loyalty program app", "loyalty rewards program for restaurants", "loyality program for restaurant in jaipur": pos 60–97. No restaurant guide existed.
- These are English, high-intent, competitive queries (global SaaS ranks for them). Win them with India-specific angles + backlinks, not just content.

### 5. Indexing
- **Discovered – not indexed (7):** /for/electronics-shop, /hi/city/indore, /hi/city/jaipur, /hi/city/lucknow, /hi/for, /hi/for/boutique, /terms. Cause: weak internal links to Hindi city pages.
- **Redirect error (1):** `https://regularhood.in/for`. It now returns a clean 308 to www, so this is stale.
- **Page with redirect (3):** http/non-www variants. Expected, no action.
- Both `http://regularhood.in/` and `https://www.regularhood.in/` get impressions. The canonical is www, so Google should merge them over time.

## What I shipped (in code, `server/src/guides.ts`, `seo-render.ts`)

**New pages**
1. `/hi/guide/customer-bulane-ke-upay`: "दुकान में ग्राहक बुलाने का मंत्र: 9 उपाय जो सच में काम करते हैं". Targets the mantra/totka/Hinglish cluster. It respects belief and points to practical steps.
2. `/guide/follow-up-message-for-repeat-service` + Hindi twin: step 1 message → step 2 offer table → step 3 finished examples. Matches the assignment query structure exactly.
3. `/guide/restaurant-loyalty-program` + Hindi twin: no-app, visit-based, margin-safe rewards (dessert, starter, lassi), dhaba/café/cloud kitchen.

**Title/description rewrites (CTR fixes)**
| Page | New title |
|---|---|
| /hi/guide/how-to-increase-shop-sales | दुकान में बिक्री कैसे बढ़ाएँ? 8 आसान तरीके, बिना विज्ञापन |
| /hi/guide/get-customers-for-new-shop | दुकान पर ग्राहक कैसे आएँ? नई दुकान के लिए पहला महीना, हफ़्ते-दर-हफ़्ते |
| /hi/guide/win-back-old-customers | पुराने ग्राहक वापस कैसे लाएँ? 3 कदम + तैयार WhatsApp मैसेज |
| /hi/guide/how-to-get-repeat-customers | ग्राहक बार-बार दुकान पर कैसे आएँ? पक्के ग्राहक बनाने के 10 तरीके |

Rules used: lead with the searcher's exact question, add a question mark and a number, and put the Hinglish spelling in the description, e.g. *(dukan ki sale kaise badhaye)*.

**Internal links:** every guide page and both guide hubs now link to the city hub (`/city`, `/hi/city`) so Hindi city pages get crawled.

## Your to-do in Search Console (after deploy)

1. **Sitemaps → resubmit** `https://www.regularhood.in/sitemap.xml`.
2. **URL inspection → Request indexing** for:
   - `/hi/guide/customer-bulane-ke-upay`
   - `/guide/follow-up-message-for-repeat-service`
   - `/hi/guide/follow-up-message-for-repeat-service`
   - `/guide/restaurant-loyalty-program`
   - `/hi/guide/restaurant-loyalty-program`
   - the 4 retitled Hindi guides above
   - `/hi/city/indore`, `/hi/city/jaipur`, `/hi/city/lucknow`, `/hi/for`
3. **Pages → Redirect error → Validate fix.**
4. Check back on **24 Nov**: compare CTR on the 4 retitled pages (Performance → Pages, compare to previous 14 days).

## Next pages to build (priority order)

| # | Page | Why |
|---|---|---|
| 1 | /hi/guide/dukan-ki-sale-kaise-badhaye in Hinglish (Roman script) | Hinglish queries don't match Devanagari titles well. Test one Roman-Hindi page. |
| 2 | /city/indore → strengthen (pos 28.7, 35 impr) + "discount app for local stores indore" / "rewards network indore" | Indore queries already appear; city page is too thin. |
| 3 | /guide/loyalty-program-app-without-qr ("how do merchants identify returning customers without an app", "stamps with qr code") | Our no-app/no-QR angle is unique. |
| 4 | Salon cluster: hair-salon / beauty-parlour loyalty, with real pricing for India | Pos 58–93 now; needs depth + backlinks. |
| 5 | /guide/pharmacy-loyalty-program, /guide/laundry-loyalty-program | Single-impression queries already showing up. |

## Ongoing rules

- **One question per page.** Title = how the shop owner would type it.
- **Hindi first.** Hindi gets 60% of impressions with far less competition.
- **Every new page links to 3+ others** (guide → /for page → city page).
- **Backlinks for English salon/restaurant terms:** use `brand/backlinks-kit.md`. Content alone won't move pos 80 → 10.
- **Review Search Console every 2 weeks:** look for queries at pos 5–15 with 0 clicks → rewrite title. Queries at pos 30+ with impressions → new dedicated page.
- No "chai" in examples or copy.
