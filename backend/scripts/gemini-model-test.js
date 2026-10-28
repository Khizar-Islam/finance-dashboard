// Gemini model test.
//
// Proves that:
//   (a) with GEMINI_MODEL unset, empty or blank, both categorizeTransaction
//       and generateInsights use the default model gemini-3.8-flash
//   (b) with GEMINI_MODEL set, both use that model (surrounding spaces trimmed)
//
// Needs no Gemini: @google/genai is replaced by a fake that records the model
// it is asked for. It never loads server.js.
// Usage: npm run test:gemini-model

process.env.GEMINI_API_KEY = "invalid";

// Fake SDK: records each generateContent call and returns a usable reply.
const calls = [];
const sdkPath = require.resolve("@google/genai");
require.cache[sdkPath] = {
  id: sdkPath,
  filename: sdkPath,
  loaded: true,
  exports: {
    GoogleGenAI: class {
      constructor() {
        this.models = {
          generateContent: async ({ model }) => {
            calls.push(model);
            return { text: "[]" };
          },
        };
      }
    },
  },
};

let failures = 0;
function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail ? `  (${detail})` : ""}`);
  if (!ok) failures++;
}

// Loads a fresh copy of gemini.js with GEMINI_MODEL set to value.
function loadGemini(value) {
  if (value === undefined) delete process.env.GEMINI_MODEL;
  else process.env.GEMINI_MODEL = value;
  delete require.cache[require.resolve("../src/lib/gemini")];
  return require("../src/lib/gemini");
}

async function checkModel(value, expected) {
  const label = value === undefined ? "unset" : JSON.stringify(value);
  const gemini = loadGemini(value);
  check(`GEMINI_MODEL ${label} -> GEMINI_MODEL is ${expected}`, gemini.GEMINI_MODEL === expected,
    gemini.GEMINI_MODEL);

  calls.length = 0;
  await gemini.categorizeTransaction({ merchant: "Cafe", description: "coffee", amount: 250 });
  await gemini.generateInsights({ totalSpent: 1000, prevTotal: 800, categoryBreakdown: [] });
  check(`GEMINI_MODEL ${label} -> categorizeTransaction and generateInsights both call ${expected}`,
    calls.length === 2 && calls.every((m) => m === expected), JSON.stringify(calls));
}

async function main() {
  const { DEFAULT_GEMINI_MODEL } = loadGemini(undefined);
  check("default model is gemini-3.8-flash", DEFAULT_GEMINI_MODEL === "gemini-3.8-flash",
    DEFAULT_GEMINI_MODEL);

  await checkModel(undefined, "gemini-3.8-flash");
  await checkModel("", "gemini-3.8-flash");
  await checkModel("   ", "gemini-3.8-flash");
  await checkModel("gemini-test-model", "gemini-test-model");
  await checkModel("  gemini-test-model  ", "gemini-test-model");

  delete process.env.GEMINI_MODEL;
  console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll checks passed");
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
