/**
 * Why a Google sign-in came back to the login page, as a short code in the
 * URL (?error=…) and the sentence shown for it.
 *
 * Codes rather than messages in the URL, so nothing server-side can leak into
 * the address bar and nobody can craft a link that puts their own text on the
 * sign-in page. Unknown codes are ignored.
 */
export const OAUTH_ERRORS = {
  google_cancelled:
    "Google sign-in was cancelled. Choose an account to continue, or use your email and password.",
  google_expired:
    "That Google sign-in took too long or was started in another tab. Please try again.",
  google_unverified:
    "Google has not verified the email address on that account, so ELARA cannot use it to sign you in. Verify it with Google, or sign in with your email and password.",
  google_unavailable:
    "Google sign-in is not available right now. Use your email and password instead.",
  google_rate_limited:
    "Too many sign-in attempts. Wait a few minutes and try again.",
  google_failed:
    "Google sign-in could not be completed. Please try again, or use your email and password.",
} as const;

export type OAuthErrorCode = keyof typeof OAUTH_ERRORS;

export function oauthErrorMessage(code: unknown): string | null {
  return typeof code === "string" && code in OAUTH_ERRORS
    ? OAUTH_ERRORS[code as OAuthErrorCode]
    : null;
}
