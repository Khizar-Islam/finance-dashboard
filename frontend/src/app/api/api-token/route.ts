import { SignJWT } from "jose";
import { auth } from "@/../auth";

// Must match ISSUER/AUDIENCE in backend/src/middleware/auth.js.
const ISSUER = "ledger-web";
const AUDIENCE = "ledger-api";
const TTL_SECONDS = 5 * 60;

// Issues a short-lived token the browser sends to the Express API.
// The user id comes from the server-side session, never from the client.
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawSecret = process.env.API_AUTH_SECRET;
  if (!rawSecret || rawSecret.length < 32) {
    console.error("API_AUTH_SECRET must be set and at least 32 characters long");
    return Response.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const expiresAt = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(new TextEncoder().encode(rawSecret));

  return Response.json(
    { token, expiresAt },
    { headers: { "Cache-Control": "no-store" } }
  );
}
