# Scientific Quran AI

A specialised, source-grounded AI assistant that answers life, scientific, and
theological questions from the **Holy Quran** (primary authority), authentic
**Hadith**, and scholarly **scientific tafsir** (e.g. Zakaria Kamal). The Bible
is consulted strictly for comparative / historical context — never as a source
of rulings.

Bilingual: English and Bengali / Banglish.

## Stack

- **Next.js 16** (App Router, TypeScript) + **Tailwind v4**
- **Vercel AI SDK** (`ai`, `@ai-sdk/google`, `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/react`)
- **Google Gemini 2.0 Flash** for chat (default, free tier) — swap to Claude Sonnet 4.6 or GPT-4o via env
- **Google `text-embedding-004`** (768 dims) for embeddings (free tier)
- **Supabase + pgvector** as the vector store

> **Fully free out of the box.** Default config uses Gemini for both chat and
> embeddings. Get a free API key at <https://aistudio.google.com/apikey>.

## Quick start

```bash
# 1. install
npm install

# 2. configure env
cp .env.local.example .env.local
# Fill in GOOGLE_GENERATIVE_AI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

# 3. bootstrap Supabase
#    Supabase dashboard → SQL editor → paste scripts/sql/init.sql → Run.
#    (Creates the `documents` table with VECTOR(768) and the match_documents RPC.)

# 4. add your sources, then ingest
mkdir -p data/quran data/hadith data/tafsir data/bible
# drop .txt / .md / .pdf files into the relevant folders
npm run ingest                 # incremental
npm run ingest -- --reset      # wipe + re-ingest
npm run ingest -- --only tafsir

# 5. run the app
npm run dev
# → http://localhost:3000
```

## How it answers

Every user query goes through the same pipeline:

1. The last user message is embedded with `text-embedding-004` (768-dim).
2. Supabase's `match_documents` RPC returns the top 6 most similar chunks
   (cosine distance, HNSW index).
3. Those chunks are formatted with their `kind` (`quran` / `hadith` / `tafsir` /
   `bible`) and `source`, then injected into the system prompt inside a
   `<retrieved_context>` block.
4. The LLM (Gemini 2.0 Flash by default) answers under a strict authority
   hierarchy:
   - **Primary:** Holy Quran — every ruling/verdict traces back here.
   - **Secondary:** Authentic Hadith + scholarly scientific tafsir.
   - **Comparative only:** Bible — historical/linguistic context, never rulings.
5. The response is streamed back to the chat UI.

The full system prompt lives in [src/lib/system-prompt.ts](src/lib/system-prompt.ts).

## Project layout

```
src/
├── app/
│   ├── api/chat/route.ts      # streaming chat endpoint w/ RAG retrieval
│   ├── layout.tsx             # fonts (Geist + Amiri Arabic), metadata
│   ├── page.tsx               # mounts <Chat />
│   └── globals.css            # Tailwind v4 + theme tokens + .arabic class
├── components/
│   ├── chat.tsx               # main chat surface (useChat + sessions)
│   ├── sidebar.tsx            # chat history sidebar
│   └── message-bubble.tsx     # message renderer (markdown + RTL Arabic)
└── lib/
    ├── system-prompt.ts       # authority hierarchy + tone rules
    ├── retrieve.ts            # Supabase pgvector retrieval
    ├── embeddings.ts          # OpenAI embedding helpers
    ├── supabase.ts            # cached Supabase client
    └── chat-store.ts          # localStorage chat history

scripts/
├── ingest-data.ts             # data → chunks → embeddings → Supabase
└── sql/init.sql               # one-time Supabase bootstrap

data/                          # your sources (gitignored by default)
```

## Notes on the authority hierarchy

The system prompt enforces that the model **never** issues a theological ruling
from the Bible — it may only be cited for comparative or historical context.
This is structural, not aesthetic: even if Biblical context is the top-ranked
retrieval result, the prompt forces the model to ground the final verdict in
the Quran.

## Tuning

- **Switch chat LLM**:
  - Gemini (default, free): `LLM_PROVIDER=google`, optional `GOOGLE_MODEL=gemini-2.0-flash` or `gemini-2.5-pro`.
  - Anthropic: `LLM_PROVIDER=anthropic`, set `ANTHROPIC_API_KEY`, optional `ANTHROPIC_MODEL=claude-sonnet-4-6` or `claude-opus-4-7`.
  - OpenAI: `LLM_PROVIDER=openai`, set `OPENAI_API_KEY`, optional `OPENAI_MODEL=gpt-4o`.
- **Switch embedding provider**: `EMBEDDING_PROVIDER=openai` (1536 dims) instead of `google` (768 dims).
  If you change embedding dims, rerun [scripts/sql/init.sql](scripts/sql/init.sql) with the matching `VECTOR(n)` and re-ingest.
- Adjust chunk size / overlap in [scripts/ingest-data.ts](scripts/ingest-data.ts)
  (`CHUNK_SIZE`, `CHUNK_OVERLAP`).
- Adjust retrieval `match_count` in [src/app/api/chat/route.ts](src/app/api/chat/route.ts).

## Disclaimer

This tool is a study aid, not a mufti. For personal legal rulings (fatwa) on
sensitive matters, always consult a qualified scholar.
