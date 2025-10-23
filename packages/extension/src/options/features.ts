export const IS_OSS_BUILD = Boolean(import.meta.env.VITE_OSS_BUILD);
export const HAS_SERVER = Boolean(import.meta.env.VITE_OAUTH_SERVER_URL);

// OAuth should be available whenever a server is configured (release build and any custom server)
export const ALLOW_OAUTH = HAS_SERVER;

// Manual token is intended for the open-source build flavor
export const ALLOW_MANUAL_TOKEN = IS_OSS_BUILD;

// Billing UI makes sense only when a server is available
export const SHOW_BILLING = HAS_SERVER;
