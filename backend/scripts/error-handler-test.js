// Error-handling test for the Express API.
//
// Proves that:
//   (a) unknown /api routes, invalid JSON and oversized bodies get JSON errors
//   (b) 5xx replies never include the real error message
//   (c) only err.statusCode (never err.status) sets a 4xx reply
//   (d) once headers are sent, the error is passed on to Express
//
// Needs no database and no Gemini: no request here reaches a controller.
// Usage: npm run test:errors

// Dummy values so loading the app never needs real credentials or a database.
// dotenv (called in server.js) does not override variables already set.
process.env.API_AUTH_SECRET = "error-handler-test-secret-".padEnd(48, "x");
process.env.DATABASE_URL = "postgresql://invalid:invalid@127.0.0.1:1/invalid";
process.env.GEMINI_API_KEY = "invalid";

const express = require("express");
const { SignJWT } = require("jose");
const app = require("../src/server");
const { ISSUER, AUDIENCE } = require("../src/middleware/auth");
const { errorHandler } = require("../src/middleware/errorHandler");

const GENERIC_MESSAGE = "Something went wrong. Please try again.";
const SECRET_TEXT = "postgresql://admin:hunter2@db.internal/prod";

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

// Routes that fail on purpose, finished by the real errorHandler.
function buildFailingApp() {
  const failingApp = express();
  failingApp.get("/secret", () => {
    throw new Error(`connect failed: ${SECRET_TEXT}`);
  });
  failingApp.get("/status-only", () => {
    const err = new Error("SDK says unauthenticated");
    err.status = 401;
    throw err;
  });
  failingApp.get("/status-code", () => {
    const err = new Error("Category already exists");
    err.statusCode = 409;
    throw err;
  });
  failingApp.use(errorHandler);
  return failingApp;
}

async function start(expressApp) {
  const server = expressApp.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}

async function read(res) {
  const text = await res.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {}
  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  return { text, body, isJson };
}

async function main() {
  const real = await start(app);
  const failing = await start(buildFailingApp());
  const token = await signToken("error-test-user");
  const realConsoleError = console.error;
  const logged = [];

  try {
    // ---- (a) real app: 404, invalid JSON, oversized body ------------------
    let res = await fetch(`${real.base}/api/does-not-exist`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    let r = await read(res);
    check("unknown /api route -> 404 JSON", res.status === 404 && r.isJson, `got ${res.status}`);
    check('unknown /api route -> { error: "Not found" }', r.body?.error === "Not found", r.text);

    res = await fetch(`${real.base}/api/does-not-exist`);
    r = await read(res);
    check("unknown /api route without token -> still 401 Unauthorized",
      res.status === 401 && r.body?.error === "Unauthorized", `got ${res.status} ${r.text}`);

    res = await fetch(`${real.base}/api/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"amount": ',
    });
    r = await read(res);
    check("invalid JSON -> 400 JSON", res.status === 400 && r.isJson, `got ${res.status}`);
    check("invalid JSON -> fixed message", r.body?.error === "Invalid JSON body", r.text);
    check("invalid JSON -> no stack or parser text", !/SyntaxError|at /.test(r.text), r.text);

    res = await fetch(`${real.base}/api/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ padding: "x".repeat(110 * 1024) }),
    });
    r = await read(res);
    check("body over 100kb -> 413 JSON", res.status === 413 && r.isJson, `got ${res.status}`);
    check("body over 100kb -> fixed message", r.body?.error === "Request body is too large", r.text);

    // ---- (b) and (c) failing routes ----------------------------------------
    console.error = (...args) => logged.push(args);

    res = await fetch(`${failing.base}/secret`);
    r = await read(res);
    check("thrown error -> 500 JSON", res.status === 500 && r.isJson, `got ${res.status}`);
    check("thrown error -> fixed message", r.body?.error === GENERIC_MESSAGE, r.text);
    check("thrown error -> secret absent from response", !r.text.includes("hunter2"), r.text);
    check("thrown error -> real error logged on server",
      logged.some((args) => args.some((a) => a instanceof Error && a.message.includes("hunter2"))));

    res = await fetch(`${failing.base}/status-only`);
    r = await read(res);
    check("err.status 401 without statusCode -> 500", res.status === 500, `got ${res.status}`);
    check("err.status 401 without statusCode -> fixed message",
      r.body?.error === GENERIC_MESSAGE, r.text);

    res = await fetch(`${failing.base}/status-code`);
    r = await read(res);
    check("err.statusCode 409 -> 409", res.status === 409, `got ${res.status}`);
    check("err.statusCode 409 -> its message", r.body?.error === "Category already exists", r.text);

    // ---- (d) headers already sent -----------------------------------------
    const err = new Error("late failure");
    let passedOn = null;
    let replied = false;
    const sentRes = {
      headersSent: true,
      status() { replied = true; return this; },
      json() { replied = true; },
    };
    errorHandler(err, {}, sentRes, (e) => { passedOn = e; });
    check("headersSent -> next(err) called with the same error", passedOn === err);
    check("headersSent -> no second reply attempted", !replied);
  } finally {
    console.error = realConsoleError;
    real.server.close();
    failing.server.close();
  }

  console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll checks passed");
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
