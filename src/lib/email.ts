/**
 * Transactional email via Resend. Graceful: if RESEND_API_KEY isn't set,
 * everything still works — we log to the console and return ok. That lets
 * the rest of the request succeed in dev / on day one.
 *
 * Env:
 *   RESEND_API_KEY   — required to actually send
 *   EMAIL_FROM       — defaults to onboarding@resend.dev (resend's sandbox sender)
 *   EMAIL_FROM_NAME  — display name on the From header
 */

type SendArgs = {
  to: string;
  subject: string;
  html: string;
};

const FROM_DEFAULT = process.env.EMAIL_FROM || "onboarding@resend.dev";
const FROM_NAME = process.env.EMAIL_FROM_NAME || "Scientific Quran AI";

export async function sendEmail({ to, subject, html }: SendArgs): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log("[email] (no RESEND_API_KEY) would send:", { to, subject });
    return true;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${FROM_NAME} <${FROM_DEFAULT}>`,
        to: [to],
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[email] resend error", res.status, text);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] unexpected", err);
    return false;
  }
}

// ─── Templates ──────────────────────────────────────────────────────────────

const wrap = (inner: string) => `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a;line-height:1.6">
  <div style="border-bottom:2px solid #0d7b6f;padding-bottom:12px;margin-bottom:20px">
    <strong style="font-size:18px;color:#0d7b6f">📖 Scientific Quran AI</strong>
  </div>
  ${inner}
  <hr style="border:none;border-top:1px solid #eee;margin:28px 0 16px"/>
  <p style="font-size:12px;color:#888">
    Questions? Reply to this email or write to
    <a href="mailto:zasifbinislam@gmail.com" style="color:#0d7b6f">zasifbinislam@gmail.com</a>.
  </p>
</div>`;

export function subscriptionReceivedEmail(name: string, transactionId: string) {
  return wrap(`
    <p>আসসালামু আলাইকুম <strong>${escapeHtml(name)}</strong>,</p>
    <p>আপনার bKash পেমেন্ট আমাদের কাছে এসেছে। TrxID
      <code style="background:#f4f4f4;padding:2px 6px;border-radius:4px">${escapeHtml(transactionId)}</code>
      যাচাই করে ২৪ ঘণ্টার মধ্যে আপনার সাবস্ক্রিপশন সক্রিয় করা হবে।</p>
    <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
    <p style="font-size:13px;color:#555"><em>English:</em> We received your bKash payment.
      We'll verify TrxID <code>${escapeHtml(transactionId)}</code> and activate your
      subscription within 24 hours.</p>
  `);
}

export function subscriptionActivatedEmail(name: string, expiresAt: Date) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    year: "numeric", month: "long", day: "2-digit",
  }).format(expiresAt);
  return wrap(`
    <p>আসসালামু আলাইকুম <strong>${escapeHtml(name)}</strong>,</p>
    <p>🎉 আপনার সাবস্ক্রিপশন সক্রিয় হয়েছে। মেয়াদ:
      <strong>${fmt}</strong> পর্যন্ত।</p>
    <p>এখন রেট লিমিট বাইপাস হবে — যত খুশি প্রশ্ন করতে পারবেন।</p>
    <p style="margin-top:20px">
      <a href="https://scientific-quran-ai.vercel.app/"
         style="background:#0d7b6f;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block">
        চ্যাট খুলুন →
      </a>
    </p>
    <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
    <p style="font-size:13px;color:#555"><em>English:</em> Your subscription is now
      active until <strong>${fmt}</strong>. Per-IP rate limits no longer apply to you.</p>
  `);
}

export function subscriptionRejectedEmail(name: string, notes: string | null) {
  return wrap(`
    <p>আসসালামু আলাইকুম <strong>${escapeHtml(name)}</strong>,</p>
    <p>দুঃখিত — আপনার bKash পেমেন্ট যাচাই করা যায়নি।</p>
    ${notes ? `<p><strong>কারণ:</strong> ${escapeHtml(notes)}</p>` : ""}
    <p>সঠিক TrxID দিয়ে আবার চেষ্টা করুন, অথবা সরাসরি যোগাযোগ করুন।</p>
  `);
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
