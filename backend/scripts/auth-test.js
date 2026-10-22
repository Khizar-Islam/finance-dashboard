// Auth isolation test for the Express API.
//
// Proves that:
//   (a) requests without a valid token get 401
//   (b) a token for user A cannot read, update or delete user B's transactions
//
// Runs ONLY against TEST_DATABASE_URL (e.g. a Neon branch). It never connects
// to DATABASE_URL. Usage: npm run test:auth

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const testDbUrl = process.env.TEST_DATABASE_URL;
const realDbUrl = process.env.DATABASE_URL;

function dbHost(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

if (!testDbUrl) {
  console.error("Refusing to run: TEST_DATABASE_URL is not set.");
  process.exit(1);
}
if (realDbUrl && (testDbUrl === realDbUrl || dbHost(testDbUrl) === dbHost(realDbUrl))) {
  console.error("Refusing to run: TEST_DATABASE_URL points at the same database host as DATABASE_URL.");
  process.exit(1);
}
if (!process.env.API_AUTH_SECRET) {
  console.error("Refusing to run: API_AUTH_SECRET is not set.");
  process.exit(1);
}

// Point the app's Prisma client at the test database before anything loads it.
// dotenv (called again in server.js) does not override variables already set.
process.env.DATABASE_URL = testDbUrl;
delete process.env.DIRECT_URL;

const { randomUUID } = require("crypto");
const { SignJWT } = require("jose");
const app = require("../src/server");
const prisma = require("../src/lib/prisma");
const { ISSUER, AUDIENCE } = require("../src/middleware/auth");

const secret = new TextEncoder().encode(process.env.API_AUTH_SECRET);

function signToken(userId, { key = secret, expiresIn = "5m" } = {}) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key);
}

let failures = 0;
function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail ? `  (${detail})` : ""}`);
  if (!ok) failures++;
}

async function main() {
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;

  const call = (method, urlPath, { token, body } = {}) =>
    fetch(base + urlPath, {
      method,
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(body && { "Content-Type": "application/json" }),
      },
      body: body && JSON.stringify(body),
    });

  const suffix = randomUUID().slice(0, 8);
  let userA;
  let userB;

  try {
    // ---- (a) no token / bad token -> 401 ---------------------------------
    const routes = [
      ["GET", "/api/transactions"],
      ["POST", "/api/transactions"],
      ["PATCH", "/api/transactions/some-id"],
      ["DELETE", "/api/transactions/some-id"],
      ["GET", "/api/dashboard/summary"],
      ["GET", "/api/dashboard/insights"],
      ["GET", "/api/categories"],
      ["GET", "/api/budgets"],
      ["POST", "/api/budgets"],
    ];
    for (const [method, route] of routes) {
      const res = await call(method, route);
      check(`no token: ${method} ${route} -> 401`, res.status === 401, `got ${res.status}`);
    }

    const wrongKeyToken = await signToken("anyone", {
      key: new TextEncoder().encode("x".repeat(48)),
    });
    let res = await call("GET", "/api/transactions", { token: wrongKeyToken });
    check("token signed with wrong secret -> 401", res.status === 401, `got ${res.status}`);

    const expiredToken = await signToken("anyone", { expiresIn: Math.floor(Date.now() / 1000) - 60 });
    res = await call("GET", "/api/transactions", { token: expiredToken });
    check("expired token -> 401", res.status === 401, `got ${res.status}`);

    res = await fetch(`${base}/api/transactions`, { headers: { Authorization: "Basic abc" } });
    check("non-Bearer Authorization -> 401", res.status === 401, `got ${res.status}`);

    // ---- (b) cross-user isolation ----------------------------------------
    userA = await prisma.user.create({ data: { email: `authtest-a-${suffix}@example.invalid` } });
    userB = await prisma.user.create({ data: { email: `authtest-b-${suffix}@example.invalid` } });
    const tokenA = await signToken(userA.id);
    const tokenB = await signToken(userB.id);

    // B creates a transaction (income, so no AI categorization call is made).
    res = await call("POST", "/api/transactions", {
      token: tokenB,
      body: { userId: userA.id, amount: 123.45, type: "income", merchant: "auth-test", transactionDate: "2026-01-15" },
    });
    const txB = await res.json();
    check("B can create a transaction", res.status === 201, `got ${res.status}`);
    check("create ignores userId in body (owned by B)", txB.userId === userB.id, `owner ${txB.userId}`);

    res = await call("GET", "/api/transactions", { token: tokenA });
    let list = await res.json();
    check("A's list does not contain B's transaction", res.ok && !list.some((t) => t.id === txB.id));

    res = await call("GET", `/api/transactions?userId=${userB.id}`, { token: tokenA });
    list = await res.json();
    check("A with ?userId=B still cannot see B's transaction", res.ok && !list.some((t) => t.id === txB.id));

    res = await call("PATCH", `/api/transactions/${txB.id}`, {
      token: tokenA,
      body: { userId: userB.id, amount: 1 },
    });
    check("A cannot update B's transaction -> 404", res.status === 404, `got ${res.status}`);

    res = await call("DELETE", `/api/transactions/${txB.id}?userId=${userB.id}`, { token: tokenA });
    check("A cannot delete B's transaction -> 404", res.status === 404, `got ${res.status}`);

    const stillThere = await prisma.transaction.findUnique({ where: { id: txB.id } });
    check("B's transaction still exists and is unchanged", stillThere && stillThere.amount === 123.45);

    res = await call("GET", "/api/transactions", { token: tokenB });
    list = await res.json();
    check("B can still read its own transaction", res.ok && list.some((t) => t.id === txB.id));

    res = await call("DELETE", `/api/transactions/${txB.id}`, { token: tokenB });
    check("B can delete its own transaction -> 204", res.status === 204, `got ${res.status}`);
  } finally {
    // Cascades remove any transactions/budgets belonging to the test users.
    const ids = [userA?.id, userB?.id].filter(Boolean);
    if (ids.length) await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
    server.close();
  }

  console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll checks passed");
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
