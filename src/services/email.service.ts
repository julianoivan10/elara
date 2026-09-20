import "server-only";
import { Resend } from "resend";

import { env, isEmailConfigured } from "@/lib/env";

/**
 * Outbound email.
 *
 * Without RESEND_API_KEY the service logs the message — including the link — to
 * the server console rather than throwing. A fresh clone can therefore complete
 * verification and password reset without any third-party account, which keeps
 * the auth flows genuinely testable.
 */
const resend = isEmailConfigured ? new Resend(env.RESEND_API_KEY) : null;

type SendArgs = {
  to: string;
  subject: string;
  heading: string;
  body: string;
  actionLabel: string;
  actionUrl: string;
  footnote: string;
};

async function send({
  to,
  subject,
  heading,
  body,
  actionLabel,
  actionUrl,
  footnote,
}: SendArgs) {
  if (!resend) {
    console.info(
      [
        "",
        "─────────────────────────────────────────────────────",
        " ELARA email (RESEND_API_KEY not set — not delivered)",
        `   to:      ${to}`,
        `   subject: ${subject}`,
        `   link:    ${actionUrl}`,
        "─────────────────────────────────────────────────────",
        "",
      ].join("\n"),
    );
    return { delivered: false as const };
  }

  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to,
    subject,
    html: template({ heading, body, actionLabel, actionUrl, footnote }),
    text: `${heading}\n\n${body}\n\n${actionLabel}: ${actionUrl}\n\n${footnote}`,
  });

  if (error) {
    // Surface delivery failures in the log, but never to the requester: whether
    // an address exists must not be inferable from the response.
    console.error("[email] delivery failed", error);
    return { delivered: false as const };
  }

  return { delivered: true as const };
}

/** A plain, paper-like email that matches the product without fighting clients. */
function template({
  heading,
  body,
  actionLabel,
  actionUrl,
  footnote,
}: Omit<SendArgs, "to" | "subject">) {
  return `<!doctype html>
<html lang="en"><body style="margin:0;background:#fbfaf7;padding:40px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#14130f">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e4e0d6;border-radius:8px">
    <tr><td style="padding:32px">
      <p style="margin:0 0 28px;font-size:15px;font-weight:600;letter-spacing:-0.04em">elara</p>
      <h1 style="margin:0 0 12px;font-size:20px;font-weight:500;letter-spacing:-0.02em">${heading}</h1>
      <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#5b584e">${body}</p>
      <a href="${actionUrl}" style="display:inline-block;background:#14130f;color:#fbfaf7;font-size:14px;font-weight:500;text-decoration:none;padding:11px 20px;border-radius:5px">${actionLabel}</a>
      <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#8c8779">${footnote}</p>
      <p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#8c8779;word-break:break-all">${actionUrl}</p>
    </td></tr>
  </table>
</body></html>`;
}

export const EmailService = {
  async sendVerification(to: string, name: string, token: string) {
    const url = `${env.APP_URL}/verify-email?token=${encodeURIComponent(token)}`;
    return send({
      to,
      subject: "Confirm your email — ELARA",
      heading: `Welcome, ${name}.`,
      body: "Confirm this address and your career workspace is ready. The link works for the next 24 hours.",
      actionLabel: "Confirm email",
      actionUrl: url,
      footnote: "If you did not create an ELARA account, you can ignore this.",
    });
  },

  async sendPasswordReset(to: string, name: string, token: string) {
    const url = `${env.APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
    return send({
      to,
      subject: "Reset your password — ELARA",
      heading: `Reset your password, ${name}.`,
      body: "Choose a new password using the link below. It expires in one hour, and using it signs out every other device.",
      actionLabel: "Choose a new password",
      actionUrl: url,
      footnote:
        "If you did not ask for this, nothing has changed and you can ignore this email.",
    });
  },
};
