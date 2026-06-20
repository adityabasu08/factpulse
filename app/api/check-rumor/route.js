import { GoogleGenerativeAI } from "@google/generative-ai";

// ---------------------------------------------------------------------------
// Gemini helper – returns a configured generative model instance
// ---------------------------------------------------------------------------
function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY environment variable");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
}

// ---------------------------------------------------------------------------
// OpenFDA helper – searches the food enforcement recall database
// ---------------------------------------------------------------------------
async function queryOpenFDA(product, brand) {
  const apiKey = process.env.OPENFDA_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENFDA_API_KEY environment variable");
  }

  const query = `product_description:${encodeURIComponent(product)} AND brand_name:${encodeURIComponent(brand)}`;
  const url = `https://api.fda.gov/food/enforcement.json?search=${query}&limit=1`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!res.ok) {
    // If FDA returns a non-200 status (including 404 for no results), treat as no data
    if (res.status === 404) {
      return null;
    }
    throw new Error(`OpenFDA request failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data;
}

// ---------------------------------------------------------------------------
// POST handler – check a rumor against FDA recall data
// ---------------------------------------------------------------------------
export async function POST(request) {
  try {
    // 1. Parse and validate input
    const body = await request.json();
    const { rumorText } = body;

    if (!rumorText || typeof rumorText !== "string" || rumorText.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "rumorText is required and must be a non-empty string" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Use Gemini to extract product and brand entities from the rumor
    const model = getGeminiModel();
    const extractPrompt = `Extract the product name and brand name from the following text. Return ONLY a JSON object with keys "product" and "brand". Do not include any other text or markdown formatting.

Text: "${rumorText}"`;

    const extractResult = await model.generateContent(extractPrompt);
    const extractText = extractResult.response.text().trim();

    // Parse the JSON response – handle potential markdown code fences
    let entities;
    try {
      const cleaned = extractText.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
      entities = JSON.parse(cleaned);
    } catch {
      return new Response(
        JSON.stringify({ error: "Failed to parse entities from Gemini response" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const { product, brand } = entities;
    if (!product || !brand) {
      return new Response(
        JSON.stringify({ error: "Gemini could not extract product and brand from the provided text" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Query the openFDA API
    const fdaData = await queryOpenFDA(product, brand);

    // 4. Build response based on whether FDA returned results
    let status, fact, sourceLink;

    if (fdaData && fdaData.results && fdaData.results.length > 0) {
      const result = fdaData.results[0];
      status = "red";
      fact = `${result.product_description} – Recall initiated: ${result.recall_initiation_date || "unknown date"}`;
      sourceLink = `https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts`;
    } else {
      status = "gray";
      fact = null;
      sourceLink = null;
    }

    // 5. Use Gemini to generate a plain-language summary with strict guardrails
    const summaryPrompt = `You are a fact-checking assistant. Based on the following information, produce a short plain-language summary (1-2 sentences).

FDA data available: ${status === "red" ? "yes" : "no"}
${status === "red" ? `Recall fact: ${fact}` : ""}

Rules:
- If FDA data exists, summarize the recall in 1-2 simple sentences.
- If FDA data is null, say: "No active official recall has been recorded for this product."
- NEVER give medical advice, consumption advice, or speculate.
- NEVER use "I" or "my analysis".`;

    const summaryResult = await model.generateContent(summaryPrompt);
    const summary = summaryResult.response.text().trim();

    // 6. Return final JSON response
    return new Response(
      JSON.stringify({ status, summary, fact, sourceLink }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("check-rumor API error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}