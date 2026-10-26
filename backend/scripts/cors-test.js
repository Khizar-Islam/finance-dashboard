// CORS test for the Express API.
//
// Proves that:
//   (a) buildAllowedOrigins keeps the defaults and parses CORS_ORIGINS safely
//   (b) with the same cors options as server.js, the live site gets
//       Access-Control-Allow-Origin and a working preflight, and an unknown
//       origin gets no such header
//
// Needs no database and no Gemini: it never loads server.js.
// Usage: npm run test:cors

const express = require("express");
const cors = require("cors");
const { DEFAULT_ORIGINS, buildAllowedOrigins } = require("../src/lib/corsOrigins");

const LIVE_SITE = "https://finance-dashboard-mocha-tau.vercel.app";
const UNKNOWN_SITE = "https://evil.example";

let failures = 0;
function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail ? `  (${detail})` : ""}`);
  if (!ok) failures++;
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Runs buildAllowedOrigins and collects its warnings.
function parse(value) {
  const warnings = [];
  const origins = buildAllowedOrigins(value, (msg) => warnings.push(msg));
  return { origins, warnings };
}

function checkParsing() {
  check("defaults include the live site", DEFAULT_ORIGINS.includes(LIVE_SITE));
  check("defaults keep localhost:3000", DEFAULT_ORIGINS.includes("http://localhost:3000"));
  check("defaults keep the old vercel address",
    DEFAULT_ORIGINS.includes("https://finance-dashboard-khizar9.vercel.app"));

  let r = parse(undefined);
  check("unset -> defaults only, no warnings", same(r.origins, DEFAULT_ORIGINS) && !r.warnings.length,
    JSON.stringify(r));

  r = parse("");
  check("empty string -> defaults only", same(r.origins, DEFAULT_ORIGINS) && !r.warnings.length,
    JSON.stringify(r));

  r = parse("  , ,  ");
  check("blank entries ignored without warnings",
    same(r.origins, DEFAULT_ORIGINS) && !r.warnings.length, JSON.stringify(r));

  r = parse("  https://a.example ,https://b.example:8443  ");
  check("spaces trimmed, entries added after defaults",
    same(r.origins, [...DEFAULT_ORIGINS, "https://a.example", "https://b.example:8443"]) &&
      !r.warnings.length, JSON.stringify(r));

  r = parse("https://slash.example/");
  check("trailing slash -> stored without it",
    r.origins.includes("https://slash.example") && !r.origins.includes("https://slash.example/") &&
      !r.warnings.length, JSON.stringify(r));

  const invalid = [
    "not a url",
    "ftp://files.example",
    "https://path.example/app",
    "https://query.example/?x=1",
    "https://hash.example/#top",
    "https://user:pass@creds.example",
    "*",
  ];
  r = parse(invalid.join(","));
  check("invalid entries rejected", same(r.origins, DEFAULT_ORIGINS), JSON.stringify(r.origins));
  check("one warning per invalid entry", r.warnings.length === invalid.length,
    JSON.stringify(r.warnings));
  check("warning names the rejected entry",
    invalid.every((entry) => r.warnings.some((w) => w.includes(`"${entry}"`))),
    JSON.stringify(r.warnings));

  r = parse(`https://dup.example,https://dup.example/,${LIVE_SITE},HTTPS://DUP.EXAMPLE`);
  check("duplicates dropped (incl. defaults, case, trailing slash)",
    same(r.origins, [...DEFAULT_ORIGINS, "https://dup.example"]), JSON.stringify(r.origins));
}

async function checkHeaders() {
  // Same cors options as server.js, with CORS_ORIGINS unset.
  const app = express();
  app.use(cors({ origin: buildAllowedOrigins(undefined) }));
  app.get("/ping", (req, res) => res.json({ ok: true }));

  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;

  try {
    let res = await fetch(`${base}/ping`, { headers: { Origin: LIVE_SITE } });
    check("live site GET -> Access-Control-Allow-Origin set",
      res.headers.get("access-control-allow-origin") === LIVE_SITE,
      `got ${res.headers.get("access-control-allow-origin")}`);
    check("live site GET -> no credentials header",
      res.headers.get("access-control-allow-credentials") === null);

    res = await fetch(`${base}/ping`, {
      method: "OPTIONS",
      headers: {
        Origin: LIVE_SITE,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type,authorization",
      },
    });
    check("live site preflight -> 2xx", res.status >= 200 && res.status < 300, `got ${res.status}`);
    check("live site preflight -> Access-Control-Allow-Origin set",
      res.headers.get("access-control-allow-origin") === LIVE_SITE,
      `got ${res.headers.get("access-control-allow-origin")}`);
    check("live site preflight -> POST allowed",
      (res.headers.get("access-control-allow-methods") || "").includes("POST"),
      `got ${res.headers.get("access-control-allow-methods")}`);

    res = await fetch(`${base}/ping`, { headers: { Origin: UNKNOWN_SITE } });
    check("unknown origin GET -> no Access-Control-Allow-Origin",
      res.headers.get("access-control-allow-origin") === null,
      `got ${res.headers.get("access-control-allow-origin")}`);

    res = await fetch(`${base}/ping`, {
      method: "OPTIONS",
      headers: { Origin: UNKNOWN_SITE, "Access-Control-Request-Method": "POST" },
    });
    check("unknown origin preflight -> no Access-Control-Allow-Origin",
      res.headers.get("access-control-allow-origin") === null,
      `got ${res.headers.get("access-control-allow-origin")}`);
  } finally {
    server.close();
  }
}

async function main() {
  checkParsing();
  await checkHeaders();
  console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll checks passed");
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
