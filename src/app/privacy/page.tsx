import type { Metadata } from "next";
import { PageShell, H2, P, UL } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "Privacy Policy — Scientific Quran AI",
  description: "How Scientific Quran AI handles your data.",
};

export default function PrivacyPage() {
  return (
    <PageShell
      title="Privacy Policy"
      subtitle="Effective 2026-05-12. We keep this short and honest."
    >
      <H2>What we collect</H2>
      <P>
        Scientific Quran AI is designed to need as little personal data as
        possible. When you use the chat:
      </P>
      <UL>
        <li>
          <strong>Your questions and the AI&apos;s answers</strong> are sent to
          our server and to third-party AI providers (Google Gemini, Cloudflare
          Workers AI) to produce a response. We do not link them to your name
          or any personal identifier.
        </li>
        <li>
          <strong>Your chat history is stored locally in your browser</strong>{" "}
          (browser localStorage). It does not leave your device unless you
          choose to. Clearing your browser data deletes it.
        </li>
        <li>
          <strong>Your IP address</strong> is logged briefly (a few minutes) in
          server memory for abuse prevention and rate-limiting. We do not store
          IPs to disk or associate them with your queries.
        </li>
        <li>
          <strong>If you subscribe</strong>, we collect the name, email, bKash
          number, and transaction ID you provide on the subscribe page solely
          to verify your payment and provision your subscription.
        </li>
      </UL>

      <H2>What we do NOT collect</H2>
      <UL>
        <li>No account or login is required. We do not collect emails by default.</li>
        <li>No tracking cookies, no third-party analytics, no advertising.</li>
        <li>We do not sell, rent, or share your data with anyone.</li>
      </UL>

      <H2>Where data goes</H2>
      <UL>
        <li>
          <strong>Vercel</strong> hosts the application and may log standard
          request metadata (timestamp, route, status code) for operations.
        </li>
        <li>
          <strong>Google Gemini API</strong> receives your question text + the
          retrieved Quran/tafsir context, and returns the streamed answer.
          Subject to{" "}
          <a
            href="https://ai.google.dev/gemini-api/terms"
            className="text-accent underline underline-offset-4"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google&apos;s API terms
          </a>
          .
        </li>
        <li>
          <strong>Cloudflare Workers AI</strong> receives your question text to
          generate the embedding vector used for knowledge-base retrieval.
        </li>
        <li>
          <strong>Supabase</strong> hosts our scripture/tafsir knowledge base
          (read-only on your behalf). Subscriptions, if you opt in, are stored
          here in a separate table.
        </li>
      </UL>

      <H2>Children</H2>
      <P>
        The app is open to all ages but the answers are written for adult
        readers. Children under 13 should use the app with adult supervision.
      </P>

      <H2>Your rights</H2>
      <UL>
        <li>
          To delete your local chat history, clear your browser&apos;s site data
          for our domain.
        </li>
        <li>
          To cancel a subscription or request data deletion, email{" "}
          <a
            href="mailto:zasifbinislam@gmail.com"
            className="text-accent underline underline-offset-4"
          >
            zasifbinislam@gmail.com
          </a>
          .
        </li>
      </UL>

      <H2>Changes</H2>
      <P>
        If the policy changes meaningfully, the &quot;Effective&quot; date at
        the top will change and significant changes will be highlighted in
        the chat sidebar.
      </P>

      <H2>Contact</H2>
      <P>
        Questions about this policy:{" "}
        <a
          href="mailto:zasifbinislam@gmail.com"
          className="text-accent underline underline-offset-4"
        >
          zasifbinislam@gmail.com
        </a>
        .
      </P>
    </PageShell>
  );
}
