// How many proxies in front of the API Express should trust when working out
// req.ip from X-Forwarded-For. On Render the chain is visitor -> Cloudflare ->
// Render proxy, so it must be 3 there. Too low and every visitor shares one
// rate-limit counter; too high and a visitor can fake their address.
const MAX_HOPS = 5;

// Turns a TRUST_PROXY_HOPS value into a whole number 0-5.
// Unset or empty gives 0 (trust proxy off). Anything else invalid also gives
// 0, with a warning; it never throws.
function parseTrustProxyHops(value, warn = console.warn) {
  if (value === undefined || value === null) return 0;
  const text = String(value).trim();
  if (text === "") return 0;

  if (/^\d+$/.test(text) && Number(text) <= MAX_HOPS) return Number(text);

  warn(`TRUST_PROXY_HOPS: ignoring invalid value "${value}" (expected a whole number 0-${MAX_HOPS}); trust proxy stays off`);
  return 0;
}

module.exports = { MAX_HOPS, parseTrustProxyHops };
