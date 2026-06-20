import "server-only"

/**
 * Outbound email. No transport is configured in this project, so emails are
 * logged to the server console (dev/demo) — copy the link from there to test the
 * password-reset flow. Wire a real provider (Resend, SES, SMTP, …) by replacing
 * the body of `sendEmail`.
 */
export type EmailMessage = {
  to: string
  subject: string
  text: string
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  console.log(
    [
      "",
      "──────────── EMAIL (no transport configured) ────────────",
      `To:      ${message.to}`,
      `Subject: ${message.subject}`,
      "",
      message.text,
      "─────────────────────────────────────────────────────────",
      "",
    ].join("\n")
  )
}
