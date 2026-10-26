// Browsers only let these sites call the API. Requests from any other site
// get no CORS headers, so the browser blocks the response.
const DEFAULT_ORIGINS = [
  "http://localhost:3000",
  "https://finance-dashboard-khizar9.vercel.app",
  "https://finance-dashboard-mocha-tau.vercel.app",
];

// Turns one CORS_ORIGINS entry into an origin like "https://example.com",
// or returns null if it is not a plain http(s) origin. A trailing "/" is allowed.
function toOrigin(entry) {
  let url;
  try {
    url = new URL(entry);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  if (url.pathname !== "/" || /[?#]/.test(entry)) return null;
  return url.origin;
}

// Default origins plus any from a comma-separated CORS_ORIGINS value.
// Invalid entries are skipped with a warning; duplicates are dropped.
function buildAllowedOrigins(envValue, warn = console.warn) {
  const origins = [...DEFAULT_ORIGINS];
  if (!envValue) return origins;

  for (const raw of envValue.split(",")) {
    const entry = raw.trim();
    if (!entry) continue;
    const origin = toOrigin(entry);
    if (!origin) {
      warn(`CORS_ORIGINS: ignoring invalid origin "${entry}"`);
      continue;
    }
    if (!origins.includes(origin)) origins.push(origin);
  }
  return origins;
}

module.exports = { DEFAULT_ORIGINS, buildAllowedOrigins };
