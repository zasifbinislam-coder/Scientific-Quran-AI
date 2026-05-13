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
- [ ] **Auto-create subscription row tied to user_id** on signup so we can show "My subscription status" without email matching (currently matches by email which works but is fragile)

### Subscription robustness
- [ ] **Email notifications** — Resend or SES integration. Send email when:
  - User submits subscription request → "We received your payment, verifying within 24h"
  - Admin verifies → "Your subscription is active!"
  - Subscription expiring in 7 days → renewal reminder
  - Subscription expired → "Renew now" email
- [ ] **Cancel / refund flow** — let user request cancellation
- [ ] **Automatic verification** if we ever integrate bKash payment API (long-term, requires merchant account)
- [ ] **Subscriber-only chat features**: maybe higher Gemini RPM, longer conversations, image upload

### Public launch must-haves
- [ ] **Custom domain** — Sir buys (~$10/yr at Namecheap/Porkbun), I configure DNS via Vercel
- [ ] **Logo & favicon** — replace default Next.js favicon with proper Quran AI branding
- [ ] **SEO meta tags + OG image** — for nice link previews on WhatsApp/Twitter/FB
- [ ] **Sitemap.xml + robots.txt**
- [ ] **Analytics** — Plausible or Umami (privacy-friendly, free) instead of GA
- [ ] **Error monitoring** — Sentry free tier (5k errors/mo) so you know when prod breaks

---

## 🟠 Pending — Medium priority

### Chat UX
- [ ] **Cross-device chat sync** — currently chats live in localStorage. Move to Supabase `chat_sessions` table keyed by user_id so logged-in users see their chats on any device
- [ ] **Search across past conversations**
- [ ] **Pin / rename chats** in sidebar
- [ ] **Copy answer button** on each AI message
- [ ] **Regenerate** button (re-ask same question)
- [ ] **Edit my message** + delete from history
- [ ] **Source citation panel** — click a citation to expand and see the retrieved chunk text
- [ ] **Voice input** — Web Speech API for the textarea (free)
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
