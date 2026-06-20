// app/api/check-rumor/route.js
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Force load .env.local for development
import dotenv from 'dotenv';
import { resolve } from 'path';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: resolve(process.cwd(), '.env.local') });
}

// Initialize Groq client with explicit error checking
const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;

console.log('🔑 Environment check:');
console.log('  - GROQ_API_KEY:', process.env.GROQ_API_KEY ? '✅ Found' : '❌ Not found');
console.log('  - OPENFDA_API_KEY:', process.env.OPENFDA_API_KEY ? '✅ Found' : '❌ Not found');

if (!apiKey) {
  throw new Error('Missing Groq API key. Please set GROQ_API_KEY in .env.local');
}

const groq = new OpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: apiKey,
});

const MODEL = 'llama-3.3-70b-versatile';

// Helper to call Groq with a system prompt and user input
async function callLLM(systemPrompt, userText) {
  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userText },
    ],
    temperature: 0.1,
  });
  return response.choices[0].message.content.trim();
}

// MODULE 1: ENTITY EXTRACTION
async function extractEntities(rumorText) {
  const systemPrompt = `You are a precise data extraction assistant specialized in food safety. Your task is to process informal, messy social media rumors and extract the commercial brand and the generic product type.

CRITICAL RULES:
1. Output ONLY a valid JSON string. Do not include any introduction, explanation, or concluding text.
2. If the brand is unknown or not explicitly mentioned, set the "Brand" value to "Unknown".
3. Use the following JSON schema:
{
  "Brand": "Name of brand",
  "Product Type": "Generic descriptor of the product"
}

If you cannot identify a product type, return {"Brand": "Unknown", "Product Type": "Unknown"}.`;

  const raw = await callLLM(systemPrompt, rumorText);
  try {
    return JSON.parse(raw);
  } catch {
    return { Brand: 'Unknown', ProductType: 'Unknown' };
  }
}

// MODULE 2: EXPLAINER ROUTE
async function generateExplanation(fdaResults, rumorText) {
  const systemPrompt = `You are a responsible AI assistant. Your goal is to translate raw FDA JSON recall data into a simple, empathetic explanation for a stressed community member.

CRITICAL RULES:
1. If the FDA data is empty, say exactly: 'No active official recall has been recorded for this product.'
2. NEVER speculate, guess, or provide medical/legal advice. 
3. If a recall is found, summarize the reason and date in exactly two sentences.
4. Keep the tone calm, clear, and objective.
5. If the user input is not related to a product recall, state: 'I can only assist with food and product safety recall queries.'`;

  const fdaString = JSON.stringify(fdaResults, null, 2);
  const userPrompt = `RUMOR: ${rumorText}\n\nFDA DATA: ${fdaString}`;
  return await callLLM(systemPrompt, userPrompt);
}

// MODULE 3: DETERMINISTIC CONFIDENCE SCORING ENGINE (No LLM)
async function calculateConfidence(rumorText, fdaResults, Brand, ProductType) {
  // Gibberish detection: check if rumor is mostly non-alphabetic characters or very short
  const stripped = rumorText.replace(/\s/g, '');
  const alphaCount = (stripped.match(/[a-zA-Z]/g) || []).length;
  const gibberishRatio = stripped.length > 0 ? 1 - alphaCount / stripped.length : 1;
  if (gibberishRatio > 0.7 || stripped.length < 3) {
    return 'Invalid';
  }

  // Non-recall query detection: common irrelevant queries that are not about product recalls
  const lowerRumor = rumorText.toLowerCase();
  const nonRecallPatterns = [
    'does meat contain protein',
    'is meat healthy',
    'what is',
    'how to',
    'define',
    'tell me about',
  ];
  for (const pattern of nonRecallPatterns) {
    if (lowerRumor.includes(pattern)) {
      return '0%';
    }
  }

  // No results from FDA
  if (fdaResults.length === 0) {
    return '0%';
  }

  // Check if any FDA result contains the Brand (case-insensitive)
  if (Brand !== 'Unknown') {
    const brandLower = Brand.toLowerCase();
    for (const result of fdaResults) {
      const productDesc = (result.product_description || '').toLowerCase();
      const brandName = (result.brand_name || '').toLowerCase();
      if (productDesc.includes(brandLower) || brandName.includes(brandLower)) {
        return '95%';
      }
    }
  }

  // Check if ProductType appears in results (brand unknown fallback)
  if (ProductType !== 'Unknown') {
    const typeLower = ProductType.toLowerCase();
    for (const result of fdaResults) {
      const productDesc = (result.product_description || '').toLowerCase();
      if (productDesc.includes(typeLower)) {
        return '70%';
      }
    }
  }

  // Partial match fallback
  return '50%';
}

// MAIN API ROUTE
export async function POST(request) {
  try {
    const { rumorText } = await request.json();

    if (!rumorText || rumorText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Please provide a rumor to check.' },
        { status: 400 }
      );
    }

    // Step 1: Extract entities
    const { Brand, ProductType } = await extractEntities(rumorText);

    // Step 2: Query FDA — Multi-stage search strategy
    let fdaResults = [];
    let usedUrl = '';

    // Stage 1: Exact match using product_description
    const exactQuery = `"${Brand} ${ProductType}"`.trim();
    const exactUrl = `https://api.fda.gov/food/enforcement.json?search=product_description:${encodeURIComponent(exactQuery)}&limit=5`;

    let response = await fetch(exactUrl, {
      headers: { 'Authorization': `Bearer ${process.env.OPENFDA_API_KEY}` },
    });

    if (response.ok) {
      const data = await response.json();
      fdaResults = data.results || [];
      usedUrl = exactUrl;
      console.log('📊 Stage 1 (exact):', fdaResults.length, 'results');
    }

    // Stage 2: If no results, try brand_name field only (if Brand is known)
    if (fdaResults.length === 0 && Brand !== 'Unknown') {
      const brandUrl = `https://api.fda.gov/food/enforcement.json?search=brand_name:"${encodeURIComponent(Brand)}"&limit=5`;
      response = await fetch(brandUrl, {
        headers: { 'Authorization': `Bearer ${process.env.OPENFDA_API_KEY}` },
      });
      if (response.ok) {
        const data = await response.json();
        fdaResults = data.results || [];
        usedUrl = brandUrl;
        console.log('📊 Stage 2 (brand_name):', fdaResults.length, 'results');
      }
    }

    // Stage 3: If still no results, try product_description with just the Brand
    if (fdaResults.length === 0 && Brand !== 'Unknown') {
      const brandOnlyUrl = `https://api.fda.gov/food/enforcement.json?search=product_description:"${encodeURIComponent(Brand)}"&limit=5`;
      response = await fetch(brandOnlyUrl, {
        headers: { 'Authorization': `Bearer ${process.env.OPENFDA_API_KEY}` },
      });
      if (response.ok) {
        const data = await response.json();
        fdaResults = data.results || [];
        usedUrl = brandOnlyUrl;
        console.log('📊 Stage 3 (product_description brand only):', fdaResults.length, 'results');
      }
    }

    // Stage 4: If still nothing, try product_description with just the Product Type (e.g., "peanut butter")
    if (fdaResults.length === 0 && ProductType !== 'Unknown') {
      const typeUrl = `https://api.fda.gov/food/enforcement.json?search=product_description:"${encodeURIComponent(ProductType)}"&limit=5`;
      response = await fetch(typeUrl, {
        headers: { 'Authorization': `Bearer ${process.env.OPENFDA_API_KEY}` },
      });
      if (response.ok) {
        const data = await response.json();
        fdaResults = data.results || [];
        usedUrl = typeUrl;
        console.log('📊 Stage 4 (product_description product type):', fdaResults.length, 'results');
      }
    }

    // Log the final result
    console.log('🔍 FDA Final - Found', fdaResults.length, 'results');
    if (fdaResults.length > 0) {
      console.log('📄 First result product_description:', fdaResults[0].product_description);
    }

    // Step 3: Calculate Confidence Score (deterministic)
    const confidenceScore = await calculateConfidence(rumorText, fdaResults, Brand, ProductType);

    // Step 4: Generate Explanation
    const explanation = await generateExplanation(fdaResults, rumorText);

    // Step 5: Return response
    const isRecalled = fdaResults.length > 0;

    return NextResponse.json({
      status: isRecalled ? 'recalled' : 'safe',
      fact: isRecalled ? 'FDA Recall Found' : 'No Recall Found',
      summary: explanation,
      confidence: confidenceScore,
      sourceLink: isRecalled
        ? 'https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts'
        : null,
      extractedEntities: { Brand, ProductType },
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}