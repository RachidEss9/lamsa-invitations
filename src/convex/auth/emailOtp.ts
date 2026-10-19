import { Email } from "@convex-dev/auth/providers/Email";
import { RandomReader, generateRandomString } from "@oslojs/crypto/random";

export const emailOtp = Email({
  id: "email-otp",
  maxAge: 60 * 15, // 15 minutes
  async generateVerificationToken() {
    const random: RandomReader = {
      read(bytes: Uint8Array) {
        crypto.getRandomValues(bytes);
      },
    };
    const alphabet = "0123456789";
    return generateRandomString(random, alphabet, 6);
  },
  async sendVerificationRequest({ identifier: email, token }) {
    const base =
      process.env.VLY_INTEGRATION_BASE_URL || "https://integrations.vly.ai";
    const key = process.env.VLY_INTEGRATION_KEY;

    if (!key) {
      throw new Error(
        "Email verification is not configured for this deployment.",
      );
    }

    let response: Response;
    try {
      response = await fetch(`${base.replace(/\/+$/, "")}/v1/email/otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({ to: email, otp: token }),
      });
    } catch {
      throw new Error("Could not send the verification code. Try again.");
    }

    if (!response.ok) {
      throw new Error(
        `Could not send the verification code (HTTP ${response.status}).`,
      );
    }
  },
});
