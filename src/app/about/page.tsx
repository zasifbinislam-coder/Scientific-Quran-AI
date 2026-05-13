import type { Metadata } from "next";
import { PageShell, H2, P, UL } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "About — Scientific Quran AI",
  description:
    "About Scientific Quran AI — purpose, sources, authority hierarchy.",
};

export default function AboutPage() {
  return (
    <PageShell
      title="About Scientific Quran AI"
      subtitle="A respectful, source-grounded AI assistant for the Quran and modern scientific tafsir."
    >
      <P>
        Scientific Quran AI answers questions about life, science, theology,
        and confusion through the lens of the Holy Quran and the scientific
        tafsir of Bangladeshi scholar{" "}
        <strong>Zakaria Kamal</strong>. It is built for the worldwide Muslim
        community — bilingual in English and Bengali — and is provided free
        within rate limits.
      </P>

      <H2>The authority hierarchy</H2>
      <P>
        Every answer is generated under a strict, structural hierarchy that
        the AI cannot override:
      </P>
      <UL>
        <li>
          <strong>Primary:</strong> The Holy Quran. Every final ruling,
          theological verdict, or moral judgment traces back to a Quranic
          ayah, quoted in Arabic with translation.
        </li>
        <li>
          <strong>Secondary:</strong> Zakaria Kamal&apos;s{" "}
          <em>Scientific Tafsir of the Quran</em> and <em>Fallacious Faiths</em>
          . Used as scholarly interpretation alongside the Quran.
        </li>
        <li>
          <strong>Contextual only:</strong> Authentic Hadith (Sahih
          al-Bukhari) and the Bible (KJV). May illustrate historical,
          linguistic, or comparative context, but never serve as a source of
          Islamic rulings.
        </li>
      </UL>

      <H2>What&apos;s in the knowledge base</H2>
      <P>
        The retrieval index contains roughly 36,500 vector-embedded text
        chunks across:
      </P>
      <UL>
        <li>The Arabic Quran (Tanzil) plus 15 translations including 2 in Bengali</li>
        <li>Zakaria Kamal&apos;s 3-volume Scientific Tafsir of the Quran (2024)</li>
        <li>Sahih al-Bukhari (Arabic + English, with grades and references)</li>
        <li>The King James Bible (for comparative use only)</li>
      </UL>

      <H2>How a question becomes an answer</H2>
      <UL>
        <li>
          Your question is converted into a 1024-dimensional vector using{" "}
          <code className="text-[13px] bg-surface-muted px-1.5 py-0.5 rounded">
            @cf/baai/bge-m3
          </code>{" "}
          on Cloudflare Workers AI.
        </li>
        <li>
          A similarity search across the knowledge base in Supabase pgvector
          (HNSW index) returns the top six most relevant passages.
        </li>
        <li>
          A carefully-engineered system prompt — including the authority
          hierarchy — is sent to{" "}
          <strong>Google Gemini Flash</strong> alongside your question and
          the retrieved context.
        </li>
        <li>
          The answer streams back to your browser token-by-token, with
          inline citations and Arabic ayat in RTL rendering.
        </li>
      </UL>

      <H2>The optional web search toggle</H2>
      <P>
        For biographical or general-world facts (where the Quran obviously
        cannot help — e.g. &quot;Who is X?&quot; or &quot;What was the
        population of Mecca in 1950?&quot;), users can opt-in per-message to
        Google Search grounding. When enabled, the system prompt explicitly
        forbids using search results to derive any Islamic ruling — they may
        only contribute factual context.
      </P>

      <H2>Credits</H2>
      <UL>
        <li>
          <strong>Zakaria Kamal</strong> — author of the scientific tafsir
          that grounds the secondary authority of this assistant.
        </li>
        <li>
          <strong>Tanzil.net</strong> — Arabic Quran text and multilingual
          translations.
        </li>
        <li>
          <strong>Sunnah.com</strong> &amp; the open-source hadith data
          community — Bukhari text.
        </li>
        <li>
          <strong>scrollmapper / bible_databases</strong> — KJV Bible markdown.
        </li>
        <li>
          <strong>Vercel</strong>, <strong>Supabase</strong>,{" "}
          <strong>Cloudflare</strong>, and <strong>Google Gemini</strong> for
          the free-tier infrastructure that makes this app free for everyone.
        </li>
      </UL>

      <H2>Built by</H2>
      <P>
        Zasif Bin Islam · 2026. Source code on{" "}
        <a
          href="https://github.com/zasifbinislam-coder/Scientific-Quran-AI"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent underline underline-offset-4"
        >
          GitHub
        </a>
        . Comments and corrections welcome at{" "}
        <a
          href="mailto:zasifbinislam@gmail.com"
          className="text-accent underline underline-offset-4"
        >
          zasifbinislam@gmail.com
        </a>
        .
      </P>

      <H2>Disclaimer</H2>
      <P>
        This service is a study aid. It is not a fatwa, it can make mistakes,
        and important religious or legal decisions should always be made in
        consultation with a qualified scholar.
      </P>
    </PageShell>
  );
}
