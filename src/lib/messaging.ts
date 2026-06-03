// Outbound messaging for magic links. Email via Resend, SMS via Twilio — both
// over plain fetch (no SDKs). Each is best-effort and a no-op when unconfigured,
// so the import flow always falls back to shareable links.

export function emailEnabled() {
  return !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM;
}

export function smsEnabled() {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_FROM
  );
}

function emailHtml(name: string | null, campaignTitle: string, url: string) {
  const hi = name ? `Hi ${name},` : "Hi,";
  return `
  <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#1c1a17">
    <h2 style="font-weight:600">${hi}</h2>
    <p>You've been invited to contribute to <strong>${campaignTitle}</strong> on Lingo —
    help preserve a language with your voice.</p>
    <p style="margin:24px 0">
      <a href="${url}" style="background:#de9b10;color:#1c1a17;text-decoration:none;
        padding:12px 22px;border-radius:10px;font-weight:600;display:inline-block">
        Open Lingo &amp; sign in
      </a>
    </p>
    <p style="font-size:13px;color:#6b6357">Or paste this link into your browser:<br>${url}</p>
  </div>`;
}

export async function sendMagicEmail(
  to: string,
  name: string | null,
  campaignTitle: string,
  url: string,
): Promise<boolean> {
  if (!emailEnabled()) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [to],
        subject: `Join ${campaignTitle} on Lingo`,
        html: emailHtml(name, campaignTitle, url),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendMagicSms(
  to: string,
  name: string | null,
  campaignTitle: string,
  url: string,
): Promise<boolean> {
  if (!smsEnabled()) return false;
  try {
    const sid = process.env.TWILIO_ACCOUNT_SID!;
    const tok = process.env.TWILIO_AUTH_TOKEN!;
    const greeting = name ? `Hi ${name.split(" ")[0]}, ` : "";
    const body = new URLSearchParams({
      From: process.env.TWILIO_FROM!,
      To: to,
      Body: `${greeting}join ${campaignTitle} on Lingo: ${url}`,
    });
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: "Basic " + Buffer.from(`${sid}:${tok}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}
