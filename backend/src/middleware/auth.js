const { jwtVerify } = require("jose");

// Must match the issuer/audience used by the frontend when signing tokens.
const ISSUER = "ledger-web";
const AUDIENCE = "ledger-api";

const rawSecret = process.env.API_AUTH_SECRET;
if (!rawSecret || rawSecret.length < 32) {
  throw new Error("API_AUTH_SECRET must be set and at least 32 characters long");
}
const secret = new TextEncoder().encode(rawSecret);

// Verifies "Authorization: Bearer <jwt>" and sets req.userId from the token.
// The token is the only source of the user's identity.
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
      issuer: ISSUER,
      audience: AUDIENCE,
    });

    if (typeof payload.sub !== "string" || !payload.sub) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

module.exports = { requireAuth, ISSUER, AUDIENCE };
