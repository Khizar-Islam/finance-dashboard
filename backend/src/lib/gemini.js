const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const VALID_CATEGORIES = ["Food", "Transport", "Bills", "Shopping", "Entertainment", "Health", "Other"];

async function categorizeTransaction({ merchant, description, amount }) {
  const prompt = `Categorize this transaction into exactly one of: ${VALID_CATEGORIES.join(", ")}.
Transaction: merchant="${merchant || "unknown"}", description="${description || "none"}", amount=${amount}.
Respond with only the category name, nothing else.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    const raw = (response.text || "").trim();
    const match = VALID_CATEGORIES.find(
      (cat) => cat.toLowerCase() === raw.toLowerCase()
    );
    return match || "Other";
  } catch (err) {
    console.error("Gemini categorization failed:", err.message);
    return "Other";
  }
}

async function generateInsights({ totalSpent, prevTotal, categoryBreakdown }) {
  const prompt = `Here is a user's spending data for this month:
Total spent: Rs ${totalSpent}
Previous month total: Rs ${prevTotal}
Category breakdown: ${categoryBreakdown.map((c) => `${c.name}: Rs ${c.value}`).join(", ")}

Generate exactly 3 short, specific, natural-language insights (max 20 words each) about this spending data. Mix in: one trend observation comparing to last month, one observation about the highest spending category, and one actionable tip.
Respond ONLY with a JSON array in this exact format, no markdown, no extra text:
[{"text": "...", "type": "trend"}, {"text": "...", "type": "warning"}, {"text": "...", "type": "tip"}]`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    const raw = (response.text || "").trim();
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch (err) {
    console.error("Gemini insights generation failed:", err.message);
    return [];
  }
}

async function generateInsights({ totalSpent, prevTotal, categoryBreakdown }) {
  const prompt = `Here is a user's spending data for this month:
Total spent: Rs ${totalSpent}
Previous month total: Rs ${prevTotal}
Category breakdown: ${categoryBreakdown.map((c) => `${c.name}: Rs ${c.value}`).join(", ")}

Generate exactly 3 short, specific, natural-language insights (max 20 words each) about this spending data. Mix in: one trend observation comparing to last month, one observation about the highest spending category, and one actionable tip.
Respond ONLY with a JSON array in this exact format, no markdown, no extra text:
[{"text": "...", "type": "trend"}, {"text": "...", "type": "warning"}, {"text": "...", "type": "tip"}]`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    const raw = (response.text || "").trim();
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch (err) {
    console.error("Gemini insights generation failed:", err.message);
    return [];
  }
}
async function generateInsights({ totalSpent, prevTotal, categoryBreakdown }) {
  const prompt = `Here is a user's spending data for this month:
Total spent: Rs ${totalSpent}
Previous month total: Rs ${prevTotal}
Category breakdown: ${categoryBreakdown.map((c) => `${c.name}: Rs ${c.value}`).join(", ")}

Generate exactly 3 short, specific, natural-language insights (max 20 words each) about this spending data. Mix in: one trend observation comparing to last month, one observation about the highest spending category, and one actionable tip.
Respond ONLY with a JSON array in this exact format, no markdown, no extra text:
[{"text": "...", "type": "trend"}, {"text": "...", "type": "warning"}, {"text": "...", "type": "tip"}]`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    const raw = (response.text || "").trim();
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch (err) {
    console.error("Gemini insights generation failed:", err.message);
    return [];
  }
}
async function generateInsights({ totalSpent, prevTotal, categoryBreakdown }) {
  const prompt = `Here is a user's spending data for this month:
Total spent: Rs ${totalSpent}
Previous month total: Rs ${prevTotal}
Category breakdown: ${categoryBreakdown.map((c) => `${c.name}: Rs ${c.value}`).join(", ")}

Generate exactly 3 short, specific, natural-language insights (max 20 words each) about this spending data. Mix in: one trend observation comparing to last month, one observation about the highest spending category, and one actionable tip.
Respond ONLY with a JSON array in this exact format, no markdown, no extra text:
[{"text": "...", "type": "trend"}, {"text": "...", "type": "warning"}, {"text": "...", "type": "tip"}]`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    const raw = (response.text || "").trim();
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch (err) {
    console.error("Gemini insights generation failed:", err.message);
    return [];
  }
}

async function generateInsights({ totalSpent, prevTotal, categoryBreakdown }) {
  const prompt = `Here is a user's spending data for this month:
Total spent: Rs ${totalSpent}
Previous month total: Rs ${prevTotal}
Category breakdown: ${categoryBreakdown.map((c) => `${c.name}: Rs ${c.value}`).join(", ")}

Generate exactly 3 short, specific, natural-language insights (max 20 words each) about this spending data. Mix in: one trend observation comparing to last month, one observation about the highest spending category, and one actionable tip.
Respond ONLY with a JSON array in this exact format, no markdown, no extra text:
[{"text": "...", "type": "trend"}, {"text": "...", "type": "warning"}, {"text": "...", "type": "tip"}]`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    const raw = (response.text || "").trim();
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch (err) {
    console.error("Gemini insights generation failed:", err.message);
    return [];
  }
}
module.exports = { categorizeTransaction, generateInsights, VALID_CATEGORIES };



