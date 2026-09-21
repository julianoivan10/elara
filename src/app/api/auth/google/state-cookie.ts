/**
 * The cookie that carries one Google sign-in attempt from start to callback.
 * Scoped to the two routes that read it, so it is never sent anywhere else.
 */
export const GOOGLE_STATE_COOKIE = "elara_oauth_google";
export const GOOGLE_STATE_COOKIE_PATH = "/api/auth/google";
