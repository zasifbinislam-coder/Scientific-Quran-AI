# Scientific Quran AI — Roadmap

What's done, what's pending, what each item costs to ship. Updated 2026-05-13.

When Sir says **"resume"**, pick the highest-priority unchecked items and start.

---

## ✅ Done

### Core product
- [x] Next.js 16 + Tailwind v4 chat app scaffolded
- [x] RAG pipeline: Cloudflare `bge-m3` (1024d) embeddings + Supabase pgvector + Gemini 3 Flash chat
- [x] 36,562 chunks ingested: Quran (15,745) + Zakaria Kamal tafsir (3,401) + Bukhari hadith (12,503) + Bible KJV (4,913)
- [x] Authority hierarchy enforced in system prompt (Quran > tafsir > contextual)
- [x] Streaming responses with Arabic / Bengali / English support
- [x] Citations inline + RTL Amiri rendering

### UI/UX
- [x] Mobile-friendly sidebar drawer (hamburger menu)
- [x] Dark / light theme toggle (persists, no FOUC)
- [x] Fresh chat on hard page-load, restores chat on internal back-nav
- [x] Save-as-PDF export of any chat
- [x] Save-PDF rendering: no huge empty pages, proper labels
- [x] Bengali suggested prompts at the top
- [x] Safe-area insets honored on notched phones

### Auth & subscriptions
- [x] Supabase Auth wired up (browser + server clients via @supabase/ssr)
- [x] Google OAuth sign-in
- [x] Email + password sign-up / sign-in (`/login`)
- [x] OAuth callback route `/auth/callback`
- [x] Header auth widget: avatar dropdown when signed in, Sign-in pill when not
- [x] `/subscribe` page with bKash flow + form validation
- [x] `/api/subscribe` saves request to Supabase `subscriptions` table
- [x] `/admin` dashboard: list pending/verified/rejected, one-click verify (3 month expiry)
- [x] `/api/admin/verify` admin-only endpoint
- [x] Chat API enforces subscription: active subscriber → bypasses IP rate limit

### Static pages
- [x] `/privacy` — Privacy Policy
- [x] `/terms` — Terms of Service
- [x] `/about` — About / credits / authority hierarchy

### Infrastructure
- [x] Live on Vercel: <https://scientific-quran-ai.vercel.app>
- [x] GitHub source: <https://github.com/zasifbinislam-coder/Scientific-Quran-AI>
- [x] Free-tier across all providers (Vercel, Supabase, Cloudflare, Gemini)
- [x] Multi-Gemini-key rotation (3 keys) + cooldown for rate-limited keys
- [x] In-memory IP rate limiter on `/api/chat` (30 req / 60s)
- [x] Rate-limit cooldown UI + Upgrade modal

---

## 🟡 Pending — High priority (do these first on "resume")

### Auth polish
- [x] **Forgot password flow** — `/forgot-password` + `/reset-password` pages wired with Supabase `resetPasswordForEmail`
- [x] **`/signup` route opens login page in signup mode** — `?mode=signup` now respected
- [x] **"My subscription" page** — `/account` shows active/pending status + history
- [x] **Sign-out from /admin** — AuthButton mounted in admin header
- [x] **Tie subscription rows to `user_id`** — added nullable `user_id` column + backfill + index; `/api/subscribe` attaches the signed-in user's id at submit; `/account` queries by user_id OR email so legacy rows and anonymous submissions both stay visible

### Subscription robustness
- [x] **Email notifications (transactional)** — Resend wired with graceful no-key fallback. Fires on:
  - User submits subscription → bilingual "we received your payment" receipt with TrxID
  - Admin verifies → bilingual "your subscription is active until X" + CTA
  - Admin rejects → bilingual "we couldn't verify" with optional notes
- [x] **Email notifications (lifecycle, cron-driven)** — daily Vercel cron at 06:00 UTC scans verified rows for expiring-in-7-days (sends bilingual reminder) and already-expired (sends bilingual renew nudge); `reminder_sent_at` and `expired_notified_at` guard columns prevent re-sends. Bearer auth via `CRON_SECRET`.
- [x] **Cancel / refund flow** — `/account` Active card has a "Request cancellation" button + reason modal; POST `/api/cancel-request` stamps the row's notes with `[CANCEL REQUESTED ...]` (status preserved so access stays live until admin processes the bKash refund off-platform)
- [ ] **Automatic verification** if we ever integrate bKash payment API (long-term, requires merchant account)
- [ ] **Subscriber-only chat features**: maybe higher Gemini RPM, longer conversations, image upload

### Public launch must-haves
- [ ] **Custom domain** — Sir buys (~$10/yr at Namecheap/Porkbun), I configure DNS via Vercel
- [ ] **Logo & favicon** — replace default Next.js favicon with proper Quran AI branding
- [x] **SEO meta tags + OG image** — full Metadata (title template, OpenGraph, Twitter card, keywords, alternate locale bn_BD); programmatic 1200×630 OG image at `/opengraph-image` using next/og
- [x] **Sitemap.xml + robots.txt** — auto-generated via `src/app/sitemap.ts` and `src/app/robots.ts`; /admin, /api/, /auth/ disallowed
- [ ] **Analytics** — Plausible or Umami (privacy-friendly, free) instead of GA
- [ ] **Error monitoring** — Sentry free tier (5k errors/mo) so you know when prod breaks

---

## 🟠 Pending — Medium priority

### Chat UX
- [ ] **Cross-device chat sync** — currently chats live in localStorage. Move to Supabase `chat_sessions` table keyed by user_id so logged-in users see their chats on any device
- [ ] **Search across past conversations**
- [x] **Pin / rename chats** — per-row kebab menu opens Pin/Unpin, Rename (inline edit, Enter to save / Esc to cancel), Delete. Pinned rows float to top of sidebar with the Pin icon swapped in for the message bubble. `customTitle` field on `ChatSession` keeps user-set titles; `sortSessions()` enforces pinned-first ordering both on load and on every mutation.
- [x] **Copy answer button** on every message (user + assistant), with copied-confirmation flicker
- [x] **Regenerate** button on the most recent assistant message — peels the assistant turn off the tail and resends the prior user prompt through the same transport (respects the web-search toggle)
- [ ] **Edit my message** + delete from history
- [ ] **Source citation panel** — click a citation to expand and see the retrieved chunk text
- [x] **Voice input** — Web Speech API; mic button next to the textarea defaults to bn-BD with English code-switching falling back through Chrome's recognizer. Pulsing red while listening, interim transcript shown live above the input, final transcript appended to existing input. Hidden on browsers without `SpeechRecognition` support.
- [ ] **Markdown rendering improvements** — tables, code blocks, footnotes
- [ ] **Bengali UI language toggle** — translate buttons / labels / placeholders into Bengali for full localization

### Knowledge base
- [ ] **Ingest more hadith collections** — Muslim, Tirmidhi, Abu Dawud, Nasa'i, Ibn Majah (currently only Bukhari). All conversion already done; just rerun ingest
- [ ] **Re-ingest tafsir** with better chunking that respects book/chapter boundaries
- [ ] **Bengali Quran translation re-weighting** — boost when query is in Bengali

### Admin
- [ ] **Admin search + pagination** — currently /admin shows last 200 rows, no search
- [ ] **Admin notes per subscription** — already in schema (`notes` column), just add UI
- [ ] **Bulk verify / bulk reject** for handling many at once
- [ ] **Revenue dashboard** — total subscribers, MRR (monthly recurring revenue), churn

---

## 🟢 Pending — Lower priority / nice-to-have

- [ ] **Onboarding tour** for first-time users
- [ ] **Push notifications** (PWA install + service worker)
- [ ] **CAPTCHA / hCaptcha** before first chat to deter bots
- [ ] **Content moderation** — block hateful prompts at the API level
- [ ] **Multi-language UI** — Arabic, Urdu, Hindi
- [ ] **Daily ayah** widget on empty state
- [ ] **Bookmark ayahs** mentioned in chats
- [ ] **Shareable chat links** — paste a chat URL, anyone can view (read-only)
- [ ] **Embed widget** — let people add the AI to their own Islamic website as an iframe
- [ ] **API for developers** — let other apps query the Quran-grounded LLM

---

## 🛡 Security / abuse

- [x] IP rate limiting (basic in-memory)
- [ ] **Upgrade to Upstash Redis** for persistent rate-limit state across Vercel cold starts
- [ ] **Cookie consent banner** (if Sir gets EU users)
- [ ] **Subscription auth on /api/chat** — currently we check subscription, but we don't verify that the IP-based limit isn't being bypassed via incognito
- [ ] **Body size cap on /api/chat** — protect against megabyte-long prompts that drain context

---

## 📊 Open questions for Sir to decide

1. **Custom domain name?** — Suggestions: `scientificquranai.com`, `quranaibd.com`, `qurantafsir.ai`
2. **Pricing tiers?** — Currently single tier ৳300/3mo. Future: Daily / Monthly / Yearly?
3. **Trial period?** — Free 7-day trial of premium features before paywall?
4. **Refer-a-friend?** — Both get a free month?
5. **Group / org / mosque licenses?** — Bulk subscription for institutions?

---

## How to resume

1. Tell Claude: **"resume"**
2. Claude reads this file
3. Picks top of the **High priority** list
4. Implements it
5. Updates this file with the checkbox + commits

Or specify: **"resume — start with [item]"** to pick a particular item.
