// AI rate-limit test for POST /api/transactions.
//
// Proves that, on the real app with TRUST_PROXY_HOPS=3:
//   (a) requests that would call Gemini (no category, not income) get 20
//       through in 15 minutes, then a JSON 429
//   (b) requests with a category or type income never count and are never
//       blocked by the AI limiters, even once a visitor is at the limit
//   (c) the daily limit stops a visitor after 100 Gemini requests, even when
//       the 15-minute counter is reset
//   (d) each visitor has their own counter and invalid bodies (400) do not count
//
// Needs no database and no Gemini: the transactions controller is replaced by
// a stub before the app loads, so routes, validation and limiters are real.
// Usage: npm run test:ai-limit

// Dummy values so loading the app never needs real credentials or a database.
// dotenv (called in server.js) does not override variables already set.
process.env.API_AUTH_SECRET = "ai-limit-test-secret-".padEnd(48, "x");
process.env.DATABASE_URL = "postgresql://invalid:invalid@127.0.0.1:1/invalid";
process.env.GEMINI_API_KEY = "invalid";
process.env.TRUST_PROXY_HOPS = "3";

// Stub controller: records each create and answers 201 without Prisma or Gemini.
let created = 0;
const controllerPath = require.resolve("../src/controllers/transactions.controller");
const ok = (req, res) => res.json({});
require.cache[controllerPath] = {
  id: controllerPath,
  filename: controllerPath,
  loaded: true,
  exports: {
    getTransactions: ok,
    createTransaction: (req, res) => {
      created++;
      res.status(201).json({ id: "stub" });
    },
    updateTransaction: ok,
    deleteTransaction: ok,
  },
};

const { SignJWT } = require("jose");
const app = require("../src/server");
const { ISSUER, AUDIENCE } = require("../src/middleware/auth");
const { aiCreateLimiter } = require("../src/routes/transactions.routes").aiCreateLimiters;

const CLOUDFLARE = "172.70.1.1";
const RENDER_PROXY = "10.0.0.5";
const PER_WINDOW = 20;
const PER_DAY = 100;

const AI_BODY = { amount: 250, merchant: "Cafe", transactionDate: "2026-10-01" };
const WITH_CATEGORY = { ...AI_BODY, categoryId: 2 };
const INCOME = { ...AI_BODY, type: "income" };
const INVALID = { amount: -5, transactionDate: "2026-10-01" };

let failures = 0;
function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail ? `  (${detail})` : ""}`);
  if (!ok) failures++;
}

function signToken(userId) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(new TextEncoder().encode(process.env.API_AUTH_SECRET));
}

let base;
let token;

function post(visitor, body) {
  return fetch(`${base}/api/transactions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Forwarded-For": [visitor, CLOUDFLARE, RENDER_PROXY].join(", "),
    },
    body: JSON.stringify(body),
  });
}

async function statuses(visitor, body, count) {
  const result = [];
  for (let i = 0; i < count; i++) result.push((await post(visitor, body)).status);
  return result;
}

const all = (list, status) => list.every((s) => s === status);
const summary = (list) => {
  const counts = {};
  for (const s of list) counts[s] = (counts[s] || 0) + 1;
  return JSON.stringify(counts);
};

async function checkWindowLimit() {
  const visitor = "9.9.9.1";
  const before = created;
  const first = await statuses(visitor, AI_BODY, PER_WINDOW);
  check(`Gemini requests: first ${PER_WINDOW} get 201`, all(first, 201), summary(first));
  check(`Gemini requests: controller ran ${PER_WINDOW} times`, created - before === PER_WINDOW,
    `ran ${created - before}`);

  const res = await post(visitor, AI_BODY);
  const body = await res.json().catch(() => null);
  check(`Gemini request ${PER_WINDOW + 1} -> 429`, res.status === 429, `got ${res.status}`);
  check("429 body is the JSON AI error",
    body?.error === "Too many AI requests, please wait a moment.", JSON.stringify(body));

  const beforeBlocked = created;
  await post(visitor, AI_BODY);
  check("blocked Gemini request never reaches the controller", created === beforeBlocked);

  let r = await post(visitor, WITH_CATEGORY);
  check("same visitor at the limit, with a category -> 201", r.status === 201, `got ${r.status}`);
  r = await post(visitor, INCOME);
  check("same visitor at the limit, type income -> 201", r.status === 201, `got ${r.status}`);

  r = await post("9.9.9.2", AI_BODY);
  check("a different visitor has a separate counter -> 201", r.status === 201, `got ${r.status}`);
}

async function checkSkipped() {
  const visitor = "9.9.9.3";
  const withCategory = await statuses(visitor, WITH_CATEGORY, 30);
  check("30 requests with a category -> all 201", all(withCategory, 201), summary(withCategory));
  const income = await statuses(visitor, INCOME, 30);
  check("30 income requests -> all 201", all(income, 201), summary(income));
  const r = await post(visitor, { ...INCOME, categoryId: 2 });
  check("income with a category -> 201", r.status === 201, `got ${r.status}`);

  // None of those used the visitor's AI allowance.
  const ai = await statuses(visitor, AI_BODY, PER_WINDOW);
  check(`after 61 skipped requests, ${PER_WINDOW} Gemini requests still all 201`,
    all(ai, 201), summary(ai));
  // The controller treats categoryId 0 as "no category", so Gemini is called.
  const last = await post(visitor, { ...AI_BODY, categoryId: 0 });
  check("categoryId 0 counts as a Gemini request (matches controller) -> 429",
    last.status === 429, `got ${last.status}`);
}

async function checkInvalidNotCounted() {
  const visitor = "9.9.9.4";
  const invalid = await statuses(visitor, INVALID, 25);
  check("25 invalid bodies -> all 400", all(invalid, 400), summary(invalid));
  const ai = await statuses(visitor, AI_BODY, PER_WINDOW);
  check(`invalid bodies did not count: ${PER_WINDOW} Gemini requests still all 201`,
    all(ai, 201), summary(ai));
}

async function checkDailyLimit() {
  const visitor = "9.9.9.5";
  const results = [];
  // Reset only the 15-minute counter between batches, as if time had passed.
  while (results.length < PER_DAY) {
    const batch = Math.min(PER_WINDOW, PER_DAY - results.length);
    results.push(...(await statuses(visitor, AI_BODY, batch)));
    await aiCreateLimiter.resetKey(visitor);
  }
  check(`daily: ${PER_DAY} Gemini requests across reset windows all 201`,
    all(results, 201), summary(results));

  const res = await post(visitor, AI_BODY);
  const body = await res.json().catch(() => null);
  check(`daily: request ${PER_DAY + 1} -> 429 even with a fresh 15-minute counter`,
    res.status === 429, `got ${res.status}`);
  check("daily 429 body is the JSON daily error",
    body?.error === "Daily AI limit reached, please try again tomorrow.", JSON.stringify(body));

  const r = await post(visitor, WITH_CATEGORY);
  check("daily: same visitor with a category -> 201", r.status === 201, `got ${r.status}`);
}

async function main() {
  token = await signToken("ai-limit-test-user");
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}`;

  try {
    await checkWindowLimit();
    await checkSkipped();
    await checkInvalidNotCounted();
    await checkDailyLimit();
  } finally {
    server.close();
  }

  console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll checks passed");
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
