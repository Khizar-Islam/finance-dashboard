// Trust-proxy test for the Express API.
//
// Proves that:
//   (a) parseTrustProxyHops accepts only whole numbers 0-5 and warns otherwise
//   (b) on an app set up like server.js (trust proxy, then a rate limiter),
//       req.ip follows TRUST_PROXY_HOPS for a Cloudflare + Render chain, each
//       visitor gets their own counter with 3 hops, and a fake leading
//       X-Forwarded-For address cannot move a visitor to another counter
//   (c) the real app sets no trust proxy when TRUST_PROXY_HOPS is unset, and
//       with 3 hops its real limiter counts visitors separately
//
// Needs no database and no Gemini: no request here reaches a controller.
// Usage: npm run test:proxy

// Dummy values so loading the app never needs real credentials or a database.
// dotenv (called in server.js) does not override variables already set.
process.env.API_AUTH_SECRET = "trust-proxy-test-secret-".padEnd(48, "x");
process.env.DATABASE_URL = "postgresql://invalid:invalid@127.0.0.1:1/invalid";
process.env.GEMINI_API_KEY = "invalid";
delete process.env.TRUST_PROXY_HOPS;

const express = require("express");
const rateLimit = require("express-rate-limit");
const { parseTrustProxyHops } = require("../src/lib/trustProxy");

// Fake chain as Render would forward it: visitor, Cloudflare, Render proxy.
const VISITOR = "9.9.9.9";
const OTHER_VISITOR = "8.8.8.8";
const CLOUDFLARE = "172.70.1.1";
const RENDER_PROXY = "10.0.0.5";
const chain = (...addresses) => addresses.join(", ");

let failures = 0;
function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail ? `  (${detail})` : ""}`);
  if (!ok) failures++;
}

// ---- (a) parsing -----------------------------------------------------------
function checkParsing() {
  const cases = [
    [undefined, 0, false],
    ["", 0, false],
    ["  3 ", 3, false],
    ["0", 0, false],
    ["5", 5, false],
    ["6", 0, true],
    ["-1", 0, true],
    ["1.5", 0, true],
    ["abc", 0, true],
    ["true", 0, true],
    ["*", 0, true],
  ];
  for (const [value, expected, shouldWarn] of cases) {
    const warnings = [];
    const hops = parseTrustProxyHops(value, (msg) => warnings.push(msg));
    const label = value === undefined ? "unset" : JSON.stringify(value);
    check(`parse ${label} -> ${expected}`, hops === expected, `got ${hops}`);
    if (shouldWarn) {
      check(`parse ${label} -> one warning naming the value`,
        warnings.length === 1 && warnings[0].includes(`"${value}"`), JSON.stringify(warnings));
    } else {
      check(`parse ${label} -> no warning`, warnings.length === 0, JSON.stringify(warnings));
    }
  }
}

// ---- (b) small app with the same setup order as server.js ------------------
function buildApp(hops) {
  const testApp = express();
  if (hops > 0) testApp.set("trust proxy", hops);
  testApp.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3,
    message: { error: "Too many requests, please try again later." },
  }));
  testApp.get("/ip", (req, res) => {
    res.json({ ip: req.ip, socket: req.socket.remoteAddress });
  });
  return testApp;
}

async function start(expressApp) {
  const server = expressApp.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}

function get(base, path, forwardedFor) {
  const headers = forwardedFor ? { "X-Forwarded-For": forwardedFor } : {};
  return fetch(`${base}${path}`, { headers });
}

async function checkReqIp() {
  const realChain = chain(VISITOR, CLOUDFLARE, RENDER_PROXY);

  let s = await start(buildApp(3));
  let body = await (await get(s.base, "/ip", realChain)).json();
  check(`hops 3 -> req.ip is the visitor ${VISITOR}`, body.ip === VISITOR, body.ip);
  s.server.close();

  s = await start(buildApp(1));
  body = await (await get(s.base, "/ip", realChain)).json();
  check(`hops 1 -> req.ip is the last address ${RENDER_PROXY}`, body.ip === RENDER_PROXY, body.ip);
  s.server.close();

  // express-rate-limit reports X-Forwarded-For without trust proxy; keep it
  // out of the output and check that it is the error seen in the Render log.
  const realConsoleError = console.error;
  const logged = [];
  console.error = (...args) => logged.push(args);
  try {
    s = await start(buildApp(0));
    body = await (await get(s.base, "/ip", realChain)).json();
  } finally {
    console.error = realConsoleError;
    s.server.close();
  }
  check("hops 0 -> req.ip is the socket address", body.ip === body.socket, `${body.ip} vs ${body.socket}`);
  check("hops 0 -> rate limiter logs ERR_ERL_UNEXPECTED_X_FORWARDED_FOR",
    logged.some((args) => args.some((a) => a?.code === "ERR_ERL_UNEXPECTED_X_FORWARDED_FOR")));
}

async function checkCounters() {
  const s = await start(buildApp(3));
  try {
    const statuses = [];
    for (let i = 0; i < 4; i++) {
      statuses.push((await get(s.base, "/ip", chain(VISITOR, CLOUDFLARE, RENDER_PROXY))).status);
    }
    check("hops 3 -> visitor gets 3 requests, then 429",
      statuses.join() === "200,200,200,429", statuses.join());

    let res = await get(s.base, "/ip", chain(OTHER_VISITOR, CLOUDFLARE, RENDER_PROXY));
    check("hops 3 -> a different visitor has a separate counter", res.status === 200, `got ${res.status}`);

    // The visitor adds a fake address; Cloudflare appends the real one after it.
    res = await get(s.base, "/ip", chain("1.2.3.4", VISITOR, CLOUDFLARE, RENDER_PROXY));
    check("hops 3 -> fake leading address still hits the visitor's own counter (429)",
      res.status === 429, `got ${res.status}`);

    res = await get(s.base, "/ip", chain(OTHER_VISITOR, VISITOR, CLOUDFLARE, RENDER_PROXY));
    check("hops 3 -> faking another visitor's address does not use their counter (429)",
      res.status === 429, `got ${res.status}`);

    // Documents the limit of the setting: if a request reached the API through
    // fewer real proxies than TRUST_PROXY_HOPS, a fake leading address is used.
    res = await get(s.base, "/ip", chain("7.7.7.7", "6.6.6.6", RENDER_PROXY));
    const body = await res.json();
    check("hops 3 with only 1 real proxy -> fake address 7.7.7.7 is trusted (why 3 must match the real chain)",
      body.ip === "7.7.7.7", body.ip);
  } finally {
    s.server.close();
  }
}

// ---- (c) the real app ------------------------------------------------------
function loadServer(hops) {
  if (hops === undefined) delete process.env.TRUST_PROXY_HOPS;
  else process.env.TRUST_PROXY_HOPS = hops;
  delete require.cache[require.resolve("../src/server")];
  return require("../src/server");
}

const remaining = (res) => Number(res.headers.get("x-ratelimit-remaining"));

async function checkRealApp() {
  // Unset: today's behaviour, every visitor behind the proxies shares a counter.
  let app = loadServer(undefined);
  check("real app, TRUST_PROXY_HOPS unset -> env still unset after loading (no value from .env)",
    process.env.TRUST_PROXY_HOPS === undefined, process.env.TRUST_PROXY_HOPS);
  check("real app, TRUST_PROXY_HOPS unset -> trust proxy not set (Express default false)",
    app.get("trust proxy") === false, String(app.get("trust proxy")));

  const realConsoleError = console.error;
  console.error = () => {};
  let s = await start(app);
  let a, b;
  try {
    a = await get(s.base, "/", chain(VISITOR, CLOUDFLARE, RENDER_PROXY));
    b = await get(s.base, "/", chain(OTHER_VISITOR, CLOUDFLARE, RENDER_PROXY));
  } finally {
    console.error = realConsoleError;
    s.server.close();
  }
  check("real app, unset -> two visitors share one counter (300 limit: 299 then 298)",
    remaining(a) === 299 && remaining(b) === 298, `${remaining(a)} then ${remaining(b)}`);

  // 3 hops: the real general limiter counts each visitor separately.
  app = loadServer("3");
  check("real app, TRUST_PROXY_HOPS=3 -> trust proxy is 3", app.get("trust proxy") === 3,
    String(app.get("trust proxy")));
  s = await start(app);
  try {
    a = await get(s.base, "/", chain(VISITOR, CLOUDFLARE, RENDER_PROXY));
    b = await get(s.base, "/", chain(OTHER_VISITOR, CLOUDFLARE, RENDER_PROXY));
  } finally {
    s.server.close();
  }
  check("real app, 3 hops -> each visitor has their own counter (299 and 299)",
    remaining(a) === 299 && remaining(b) === 299, `${remaining(a)} and ${remaining(b)}`);

  delete process.env.TRUST_PROXY_HOPS;
}

async function main() {
  checkParsing();
  await checkReqIp();
  await checkCounters();
  await checkRealApp();

  console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll checks passed");
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
