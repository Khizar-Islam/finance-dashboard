// Client-side fetch wrapper for the Express API. Gets a short-lived token from
// /api/api-token (signed on the Next.js server) and sends it as a Bearer token.

let cached: { token: string; expiresAt: number } | null = null;
let pending: Promise<string> | null = null;

async function getToken(forceRefresh = false): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (!forceRefresh && cached && cached.expiresAt - now > 30) {
    return cached.token;
  }

  // Share one in-flight request when several components ask at once.
  if (!pending) {
    pending = fetch("/api/api-token", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Not signed in");
        cached = await res.json();
        return cached!.token;
      })
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const send = async (token: string) => {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);
    return fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, { ...init, headers });
  };

  const res = await send(await getToken());
  if (res.status !== 401) return res;

  // Token may have expired between caching and use; retry once with a fresh one.
  return send(await getToken(true));
}
