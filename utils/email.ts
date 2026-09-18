import "server-only";
import { Resend } from "resend";

function resend() {
  const key = process.env.RESEND_API_KEY;
  if (!key || key === "re_xxxxxxxxx")
    throw new Error(
      "RESEND_API_KEY is missing. Replace re_xxxxxxxxx in .env.local with your real Resend API key.",
    );
  return new Resend(key);
}

export async function sendLoginCode(email: string, code: string) {
  if (process.env.TEST_AUTH_PROVIDER === "1") return;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from)
    throw new Error(
      "RESEND_FROM_EMAIL is missing. Use a verified Resend sender address.",
    );
  const { error } = await resend().emails.send({
    from,
    to: email,
    subject: "Your PLU sign-in code",
    html: `<h2>Your PLU sign-in code</h2><p>Enter this code in the workspace: <strong>${code}</strong></p><p>This code expires in 10 minutes. If you did not request it, ignore this email.</p>`,
  });
  if (error) throw new Error(`Resend could not send the login code: ${error.message}`);
}
