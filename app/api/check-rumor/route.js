// app/api/check-rumor/route.js
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { XMLParser } from 'fast-xml-parser';

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

const MODEL = 'llama-3.1-8b-instant';

// Helper to call Groq with a system prompt and user input
async function callLLM(systemPrompt, userText) {
  // Estimate token count (rough: 4 chars ≈ 1 token)
  const estimatedTokens = (systemPrompt.length + userText.length) / 4;
  if (estimatedTokens > 10000) {
    console.warn(`⚠️ High token count: ~${Math.round(estimatedTokens)}. Truncating...`);
    // Truncate userText to first 2000 characters
    userText = userText.substring(0, 2000) + '... [truncated]';
  }
  
  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userText },
    ],
    temperature: 0.1,
    max_tokens: 200, // Limit response length
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

  try {
    const raw = await callLLM(systemPrompt, rumorText);
    const parsed = JSON.parse(raw);
    return {
      Brand: parsed.Brand || parsed['Product Type'] || 'Unknown',
      ProductType: parsed['Product Type'] || parsed.ProductType || 'Unknown'
    };
  } catch {
    return { Brand: 'Unknown', ProductType: 'Unknown' };
  }
}

// =========================================
// CONTENT FILTER
// =========================================
function isInappropriateQuery(text) {
  const inappropriateWords = ['cum', 'semen', 'sex', 'porn', 'nude', 'explicit', 'fuck', 'shit', 'ass', 'bitch', 'dick', 'pussy', 'cock', 'suck', 'horny', 'orgasm'];
  const lowerText = text.toLowerCase();
  return inappropriateWords.some(word => lowerText.includes(word));
}

// =========================================
// SOURCE 2: USDA FSIS (Meat, Poultry, Eggs)
// =========================================
async function queryUSDA(brand) {
  try {
    const url = `https://www.fsis.usda.gov/api/recalls?query=${encodeURIComponent(brand)}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    return data.recalls || [];
  } catch (error) {
    console.error('USDA API Error:', error.message);
    return [];
  }
}

// =========================================
// SOURCE 3: UK FSA (Food Alerts & Allergens)
// =========================================
async function queryUKFSA(brand) {
  try {
    const url = `https://api.food.gov.uk/alerts?query=${encodeURIComponent(brand)}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    return data.alerts || [];
  } catch (error) {
    console.error('UK FSA API Error:', error.message);
    return [];
  }
}

// =========================================
// SOURCE 4: CFIA (Canadian Food Recalls)
// =========================================
async function queryCFIA(brand) {
  try {
    const url = 'https://www.inspection.gc.ca/food-recalls-and-allergy-alerts/json/';
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    const recalls = data.recalls || [];
    if (brand && brand !== 'Unknown') {
      return recalls.filter(item =>
        (item.product_name || '').toLowerCase().includes(brand.toLowerCase()) ||
        (item.brand_name || '').toLowerCase().includes(brand.toLowerCase())
      );
    }
    return recalls;
  } catch (error) {
    console.error('CFIA API Error:', error.message);
    return [];
  }
}

// =========================================
// SOURCE 5: WHO (Health Risk Check)
// =========================================
async function queryWHO(rumorText) {
  // No API call – we use Mixtral for this
  const healthKeywords = ['cancer', 'carcinogen', 'heart disease', 'diabetes', 'obesity', 'processed meat', 'red meat', 'sugar', 'salt', 'trans fat'];
  const lowerText = rumorText.toLowerCase();
  return healthKeywords.some(keyword => lowerText.includes(keyword));
}

// =========================================
// SOURCE 6: Open Food Facts
// =========================================
async function queryOpenFoodFacts(brand) {
  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(brand)}&json=true&page_size=1`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    return data.products || [];
  } catch (error) {
    console.error('Open Food Facts API Error:', error.message);
    return [];
  }
}

// =========================================
// SOURCE 7: EU RASFF
// =========================================
async function queryRASFF(brand) {
  try {
    const url = `https://webgate.ec.europa.eu/rasff-window/api/notifications?search=${encodeURIComponent(brand)}&limit=5`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    return data.notifications || [];
  } catch (error) {
    console.error('RASFF API Error:', error.message);
    return [];
  }
}

// =========================================
// SOURCE 8: CDC FDOSS (US Foodborne Outbreaks)
// =========================================
async function queryCDC(brand) {
  const cdcUrls = [
    'https://www.cdc.gov/food-safety/rss.xml',
    'https://www.cdc.gov/foodsafety/rss.xml',
    'https://www.cdc.gov/outbreaks/rss.xml',
    'https://www.cdc.gov/foodsafety/outbreaks/rss.xml',
    'https://www.cdc.gov/food-safety/outbreaks/rss.xml'
  ];

  for (const url of cdcUrls) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        const xmlText = await response.text();
        const parser = new XMLParser();
        const jsonData = parser.parse(xmlText);

        // Extract items from RSS feed
        const items = jsonData?.rss?.channel?.item || [];

        // Format the results
        let results = items.map(item => ({
          product_name: item.title || '',
          title: item.title || '',
          description: item.description || '',
          url: item.link || '',
          date: item.pubDate || '',
          source: 'CDC'
        }));

        // Filter by brand if provided
        if (brand && brand !== 'Unknown') {
          const brandLower = brand.toLowerCase();
          results = results.filter(item =>
            (item.title || '').toLowerCase().includes(brandLower) ||
            (item.description || '').toLowerCase().includes(brandLower)
          );
        }

        // Limit to 10 most recent
        console.log('CDC RSS feed found:', url);
        return results.slice(0, 10);
      }
    } catch (error) {
      console.warn('CDC RSS attempt failed:', url, error.message);
    }
  }

  console.warn('All CDC RSS feeds returned 404 or failed. CDC marked as inconclusive.');
  return [];
}

// =========================================
// HELPER: Merge Results from All Sources
// =========================================
function mergeResults(results) {
  const allResults = [];
  const seen = new Set();

  results.forEach(sourceResults => {
    sourceResults.forEach(item => {
      const id = item.id || item.recall_number || item.title || JSON.stringify(item);
      if (!seen.has(id)) {
        seen.add(id);
        allResults.push(item);
      }
    });
  });

  return allResults;
}

// =========================================
// HELPER: Source Names
// =========================================
function getSourceName(source) {
  const names = {
    fda: 'FDA',
    usda: 'USDA FSIS',
    ukfsa: 'UK FSA',
    cfia: 'CFIA (Canada)',
    who: 'WHO',
    openfoodfacts: 'Open Food Facts',
    rasff: 'EU RASFF',
    cdc: 'CDC'
  };
  return names[source] || source;
}

// MODULE 2: EXPLAINER ROUTE
async function generateExplanation(compactResults, rumorText) {
  // If no results, return fallback
  if (!compactResults || compactResults.length === 0) {
    return 'No active official recall has been recorded for this product.';
  }

  const systemPrompt = `You are a responsible AI assistant. Translate recall data into a simple, empathetic explanation.

CRITICAL RULES:
1. Summarize the reason and date in exactly two sentences.
2. Keep tone calm, clear, and objective.
3. Keep response under 100 words.`;

  const userPrompt = `RUMOR: ${rumorText}\n\nRECALL DATA: ${JSON.stringify(compactResults, null, 2)}`;
  return await callLLM(systemPrompt, userPrompt);
}

// MODULE 2b: HEALTH EXPLANATION (WHO/IARC)
async function generateHealthExplanation(rumorText) {
  const systemPrompt = `You are a health information assistant based on WHO and IARC classifications.

CRITICAL RULES:
1. Cite WHO/IARC classifications when applicable.
2. Differentiate between FDA recall status and general health risk.
3. Keep answers clear, evidence-based, and balanced.
4. Keep responses to 2-3 sentences (under 100 words).`;

  const userPrompt = `Provide health information about: ${rumorText}`;
  return await callLLM(systemPrompt, userPrompt);
}

// MODULE 3: CONFIDENCE BREAKDOWN ENGINE (No LLM)
function calculateConfidenceBreakdown(sourceStatus) {
  const totalSources = Object.keys(sourceStatus).length;
  let agrees = 0;
  let disagrees = 0;
  let inconclusive = 0;

  Object.values(sourceStatus).forEach(status => {
    if (status === true) {
      agrees++;
    } else {
      // For now, treat all non-matches as inconclusive
      // (We could add explicit "disagrees" logic later if sources return safe/clear data)
      inconclusive++;
    }
  });

  // Calculate percentages
  const agreePercent = totalSources > 0 ? Math.round((agrees / totalSources) * 100) : 0;
  const disagreePercent = totalSources > 0 ? Math.round((disagrees / totalSources) * 100) : 0;
  const inconclusivePercent = totalSources > 0 ? Math.round((inconclusive / totalSources) * 100) : 0;

  // Confidence = (Total - Disagrees) / Total × 100%
  const confidence = totalSources > 0 
    ? Math.round(((totalSources - disagrees) / totalSources) * 100) 
    : 0;

  return {
    agrees: agreePercent,
    disagrees: disagreePercent,
    inconclusive: inconclusivePercent,
    confidence: confidence
  };
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

    // Step 1b: Check if this is gibberish or unrelated to food
    const foodKeywords = ['food', 'product', 'recall', 'safe', 'eat', 'drink', 'allergy', 'contamination', 'salmonella', 'e.coli', 'listeria', 'peanut', 'milk', 'egg', 'soy', 'wheat', 'fish', 'shellfish', 'meat', 'poultry', 'dairy', 'bread', 'cereal', 'snack', 'drink', 'beverage', 'fruit', 'vegetable', 'chicken', 'beef', 'pork', 'jif', 'tyson', 'goldfish', 'peanut butter'];
    const lowerText = rumorText.toLowerCase();
    const isFoodRelated = foodKeywords.some(keyword => lowerText.includes(keyword)) ||
                         (Brand !== 'Unknown' || ProductType !== 'Unknown');

    // Check for inappropriate content
    if (isInappropriateQuery(rumorText)) {
      return NextResponse.json({
        status: 'inappropriate',
        fact: 'Inappropriate content detected',
        summary: 'Your query contains inappropriate content and cannot be processed. Please ask about food safety, recalls, or product safety concerns.',
        confidence: 0,
        agrees: 0,
        disagrees: 0,
        inconclusive: 100,
        sourceStatus: {},
        totalSourcesChecked: 0,
        sourcesWithMatches: 0,
        extractedEntities: { Brand, ProductType }
      });
    }

    if (!isFoodRelated) {
      return NextResponse.json({
        status: 'invalid',
        fact: 'I can only assist with food rumors and food facts',
        summary: 'I can only assist with food rumors and food facts. Please ask about food safety, recalls, or product safety concerns.',
        confidence: 0,
        agrees: 0,
        disagrees: 0,
        inconclusive: 100,
        sourceStatus: {},
        totalSourcesChecked: 0,
        sourcesWithMatches: 0,
        extractedEntities: { Brand, ProductType }
      });
    }

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

    // --- Step 2b: Check if this is a health risk query (WHO) ---
    const isHealthQuery = await queryWHO(rumorText);

    // --- Step 3: Query ALL 8 sources in parallel ---
    const [
      usdaResults,
      ukResults,
      cfiaResults,
      openFoodFactsResults,
      rasffResults,
      cdcResults
    ] = await Promise.all([
      queryUSDA(Brand),
      queryUKFSA(Brand),
      queryCFIA(Brand),
      queryOpenFoodFacts(Brand),
      queryRASFF(Brand),
      queryCDC(Brand)
    ]);

    // --- Step 4: Merge all results ---
    const allResults = mergeResults([
      fdaResults,
      usdaResults,
      ukResults,
      cfiaResults,
      openFoodFactsResults,
      rasffResults,
      cdcResults
    ]);

    // --- Step 5: Determine which sources found results ---
    const sourceStatus = {
      fda: fdaResults.length > 0,
      usda: usdaResults.length > 0,
      ukfsa: ukResults.length > 0,
      cfia: cfiaResults.length > 0,
      who: isHealthQuery,
      openfoodfacts: openFoodFactsResults.length > 0,
      rasff: rasffResults.length > 0,
      cdc: cdcResults.length > 0
    };

    // --- Step 6: Calculate confidence breakdown ---
    const confidenceBreakdown = calculateConfidenceBreakdown(sourceStatus);

    // --- Step 7: Generate explanation ---
    let explanation;
    let fact;

    if (allResults.length > 0) {
      // Only call LLM if we actually found a recall
      fact = 'Recall Found Across Sources';
      const compactResults = allResults.slice(0, 5).map(r => ({
        product: r.product_description || r.product_name || r.title || 'Unknown product',
        reason: r.reason_for_recall || r.reason || r.hazard || 'No reason provided',
        date: r.recall_initiation_date || r.recall_date || r.date || 'Unknown date',
        source: r.source || 'Unknown source'
      }));
      explanation = await generateExplanation(compactResults, rumorText);
    } else if (isHealthQuery) {
      // Health query – use LLM
      fact = 'Health Risk Information';
      explanation = await generateHealthExplanation(rumorText);
    } else {
      // No results – NO LLM CALL
      fact = 'No Recall Found';
      explanation = 'No active official recall has been recorded for this product in any of our verified databases.';
    }

    // --- Step 8: Generate source links ---
    const sourceLinks = [];
    if (fdaResults.length > 0 && fdaResults[0].url) sourceLinks.push(fdaResults[0].url);
    if (usdaResults.length > 0 && usdaResults[0].url) sourceLinks.push(usdaResults[0].url);
    if (ukResults.length > 0 && ukResults[0].url) sourceLinks.push(ukResults[0].url);
    if (cfiaResults.length > 0 && cfiaResults[0].url) sourceLinks.push(cfiaResults[0].url);
    if (rasffResults.length > 0 && rasffResults[0].url) sourceLinks.push(rasffResults[0].url);

    // --- Step 9: Return response ---
    const totalSources = 8;
    const sourcesWithMatches = Object.values(sourceStatus).filter(v => v).length;

    return NextResponse.json({
      status: allResults.length > 0 ? 'recalled' : 'safe',
      fact: fact,
      summary: explanation,
      confidence: confidenceBreakdown.confidence,
      agrees: confidenceBreakdown.agrees,
      disagrees: confidenceBreakdown.disagrees,
      inconclusive: confidenceBreakdown.inconclusive,
      sourceStatus: sourceStatus,
      sourceLinks: sourceLinks.length > 0 ? sourceLinks : null,
      totalSourcesChecked: totalSources,
      sourcesWithMatches: sourcesWithMatches,
      extractedEntities: { Brand, ProductType }
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}