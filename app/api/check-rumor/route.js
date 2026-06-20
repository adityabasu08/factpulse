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
// Generic Gemini caller – avoids code duplication
// ---------------------------------------------------------------------------
async function callGemini(systemPrompt, userText) {
  const model = getGeminiModel();
  const fullPrompt = `${systemPrompt}\n\nTEXT TO PROCESS:\n"${userText}"`;
  const result = await model.generateContent(fullPrompt);
  return result.response.text().trim();
}

// ---------------------------------------------------------------------------
// Module 1: Entity Extraction
// ---------------------------------------------------------------------------
async function extractEntities(rumorText) {
  const systemPrompt = `You are a precise data extraction assistant specialized in food safety. Your task is to process informal, messy social media rumors and extract the commercial brand and the generic product type.

CRITICAL RULES:

Output ONLY a valid JSON string. Do not include any introduction, explanation, or concluding text.

If the brand is unknown or not explicitly mentioned, set the "Brand" value to "Unknown".

Use the following JSON schema:
{
  "Brand": "Name of brand",
  "Product Type": "Generic descriptor of the product"
}

If you cannot identify a product type, return {"Brand": "Unknown", "Product Type": "Unknown"}.`;

  try {
    const raw = await callGemini(systemPrompt, rumorText);
    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      Brand: parsed.Brand || "Unknown",
      ProductType: parsed["Product Type"] || parsed.ProductType || "Unknown",
    };
  } catch {
    return { Brand: "Unknown", ProductType: "Unknown" };
  }
}

// ---------------------------------------------------------------------------
// Module 2: Explainer Route
// ---------------------------------------------------------------------------
async function generateExplanation(fdaResults, rumorText) {
  const systemPrompt = `You are a responsible AI assistant. Your goal is to translate raw FDA JSON recall data into a simple, empathetic explanation for a stressed community member.

CRITICAL RULES:

If the FDA data is empty, say exactly: 'No active official recall has been recorded for this product.'

NEVER speculate, guess, or provide medical/legal advice.

If a recall is found, summarize the reason and date in exactly two sentences.

Keep the tone calm, clear, and objective.

If the user input is not related to a product recall, state: 'I can only assist with food and product safety recall queries.'`;

  const userText = `FDA Data: ${JSON.stringify(fdaResults)}\n\nRumor: "${rumorText}"`;
  return await callGemini(systemPrompt, userText);
}

// ---------------------------------------------------------------------------
// Module 3: Confidence Scoring Engine (Fixes the 92% Bug)
// ---------------------------------------------------------------------------
async function calculateConfidence(rumorText, fdaResults) {
  const systemPrompt = `You are a deterministic confidence scoring engine. Your task is to calculate the truth-probability of a RUMOR based strictly on provided OPENFDA DATA.

CRITICAL RULES:

GIBBERISH/JARGON GATE: If the RUMOR consists of random words, nonsensical characters, or is completely unrelated to product/food safety (e.g., random keyboard smash), output exactly and only: Invalid

EXACT MATCH: If the OPENFDA DATA confirms the specific brand AND hazard mentioned in the RUMOR, output a score between: 90% - 100%

PARTIAL MATCH: If the OPENFDA DATA confirms the product type but the brand or hazard differs, output a score between: 40% - 80%

NO MATCH / EMPTY: If the OPENFDA DATA is empty ({"results": []}) or unrelated to the RUMOR, output exactly: 0%

OUTPUT FORMAT:
Output ONLY the final percentage (e.g., "95%") or the word "Invalid". Do not include your thinking process or any other text.`;

  const userText = `RUMOR: "${rumorText}"\n\nOPENFDA DATA: ${JSON.stringify(fdaResults)}`;
  return await callGemini(systemPrompt, userText);
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
      return { results: [] };
    }
    throw new Error(`OpenFDA request failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data;
}

// ---------------------------------------------------------------------------
// POST handler – check a rumor using the 3-module pipeline
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

    // 2. Extract entities from the rumor
    const extractedEntities = await extractEntities(rumorText);
    const { Brand, ProductType } = extractedEntities;

    // 3. Build the FDA query URL and fetch results
    let fdaResults;
    try {
      const fdaData = await queryOpenFDA(ProductType, Brand);
      fdaResults = fdaData && fdaData.results ? fdaData.results : [];
    } catch {
      fdaResults = [];
    }

    // 4. Calculate confidence score
    const confidence = await calculateConfidence(rumorText, fdaResults);

    // 5. Generate explanation / summary
    const summary = await generateExplanation(fdaResults, rumorText);

    // 6. Determine status and source link
    const hasRecall = fdaResults.length > 0;
    const status = hasRecall ? "recalled" : "safe";
    const fact = hasRecall ? "FDA Recall Found" : "No Recall Found";
    const sourceLink = hasRecall
      ? "https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts"
      : null;

    // 7. Return final JSON response
    return new Response(
      JSON.stringify({
        status,
        fact,
        summary,
        confidence,
        sourceLink,
        extractedEntities,
      }),
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