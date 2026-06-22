// app/api/check-rumor/route.js
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { XMLParser } from 'fast-xml-parser';

// Next.js automatically loads .env.local — no manual dotenv config needed

// Test GET handler — confirms the route file loads correctly
export async function GET() {
  return new Response('API is working!', { status: 200 });
}

// Initialize Groq client with explicit error checking
const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;

console.log('🔑 Environment check:');
console.log('  - GROQ_API_KEY:', process.env.GROQ_API_KEY ? '✅ Found' : '❌ Not found');
console.log('  - OPENFDA_API_KEY:', process.env.OPENFDA_API_KEY ? '✅ Found' : '❌ Not found');

const groq = new OpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: apiKey || '',
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
  const systemPrompt = `You are a precise data extraction assistant. You must extract Brand, Product Type, and Concern from ANY user query — even if it is:

- **No spaces**: "isCaitoFoodsService.Increcalledforsalmonella"
- **CamelCase**: "doesJifPeanutButterCauseCancer"
- **Missing punctuation**: "istysonchickensafe"
- **Mixed formatting**: "isKeurigDrPeppercontainssugar?"

**Your task:** Parse the query by recognizing patterns:

- **Brand**: Look for capitalized words, company suffixes (Inc, LLC, Corp, Foods, Service, Group, Brands, Company, etc.), and recognizable brand names (Jif, Tyson, Keurig, Caito, etc.).
- **Product Type**: Look for common food/product terms (peanut butter, chicken, bread, ice cream, cereal, etc.).
- **Concern**: Look for safety/health terms (salmonella, recall, contamination, plastic, sugar, cancer, E. coli, listeria, allergen, etc.).

**CRITICAL RULES:**
1. Even if the query has NO spaces, you can split it by recognizing capitalized letters, suffixes, and known terms.
2. If multiple brands or products are possible, choose the most plausible one.
3. If a field is not present, set it to "Unknown".
4. Output ONLY a valid JSON object with keys: "Brand", "Product Type", "Concern".

**EXAMPLES:**

Input: "isCaitoFoodsService.Increcalledforsalmonella"
→ {"Brand": "Caito Foods Service, Inc.", "Product Type": "Unknown", "Concern": "salmonella"}

Input: "doesJifpeanutbuttercausecancer"
→ {"Brand": "Jif", "Product Type": "peanut butter", "Concern": "cancer"}

Input: "isTysonchickensafe"
→ {"Brand": "Tyson", "Product Type": "chicken", "Concern": "safe"}

Input: "isKeurigDrPeppercontainssugar"
→ {"Brand": "Keurig Dr Pepper", "Product Type": "Unknown", "Concern": "sugar"}

Input: "issmithfieldbaconrecalled"
→ {"Brand": "Smithfield", "Product Type": "bacon", "Concern": "recalled"}

Input: "recallonperdueturkry"
→ {"Brand": "Perdue", "Product Type": "turkey", "Concern": "recall"}

Input: "isbreadsafe"
→ {"Brand": "Unknown", "Product Type": "bread", "Concern": "safe"}

Input: "doesbreadhaveplastic"
→ {"Brand": "Unknown", "Product Type": "bread", "Concern": "plastic"}

Input: "is there a recall for Jif peanut butter"
→ {"Brand": "Jif", "Product Type": "peanut butter", "Concern": "recall"}

Now, extract from the following user input:`;

  try {
    const raw = await callLLM(systemPrompt, rumorText);
    const parsed = JSON.parse(raw);
    return {
      Brand: parsed.Brand || 'Unknown',
      ProductType: parsed['Product Type'] || parsed.ProductType || 'Unknown',
      Concern: parsed.Concern || 'Unknown'
    };
  } catch (error) {
    console.error('❌ Entity extraction failed:', error.message);
    // Fallback: use simple pattern matching
    return fallbackExtract(rumorText);
  }
}

function fallbackExtract(query) {
  // Find potential brand: words that start with uppercase or known suffixes
  const brandMatch = query.match(/([A-Z][a-z]+(?:,?\s*(?:Inc|LLC|Ltd|Corp|Company|Foods|Service|Group|Brands?|Products?))?)/);
  // Find potential product type: common food terms
  const productTypes = ['peanut butter', 'chicken', 'bread', 'ice cream', 'turkey', 'bacon', 'cereal', 'milk', 'cheese', 'yogurt', 'beef', 'pork', 'salmon', 'tuna', 'egg', 'flour', 'sugar', 'salt'];
  let productMatch = null;
  for (const term of productTypes) {
    if (query.toLowerCase().includes(term)) {
      productMatch = term;
      break;
    }
  }
  // Find concern: common safety terms
  const concernTerms = ['salmonella', 'e.coli', 'listeria', 'recall', 'contamination', 'allergen', 'plastic', 'cancer', 'sugar', 'gluten', 'dairy'];
  let concernMatch = null;
  for (const term of concernTerms) {
    if (query.toLowerCase().includes(term)) {
      concernMatch = term;
      break;
    }
  }

  return {
    Brand: brandMatch ? brandMatch[1].trim() : 'Unknown',
    ProductType: productMatch || 'Unknown',
    Concern: concernMatch || 'Unknown'
  };
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
// HELPER: Filter results by concern
// =========================================
function filterResultsByConcern(results, Concern) {
  if (!Concern || Concern === 'Unknown' || Concern === 'safe' || Concern === 'safety') {
    return results;
  }
  const concernLower = Concern.toLowerCase();
  return results.filter(r => {
    const reason = (r.reason_for_recall || r.reason || r.hazard || '').toLowerCase();
    const description = (r.product_description || '').toLowerCase();
    return reason.includes(concernLower) || description.includes(concernLower);
  });
}

// =========================================
// SOURCE 1: FDA (Multi-strategy search)
// =========================================
async function queryFDA(Brand, ProductType, Concern) {
  try {
    if ((Brand === 'Unknown' || Brand === '') && (ProductType === 'Unknown' || ProductType === '')) {
      return [];
    }

    let allResults = [];
    const searchStrategies = [];

    // Build search strategies
    if (Brand !== 'Unknown' && Brand !== '') {
      // Strategy 1: Exact brand_name match
      searchStrategies.push({
        url: `https://api.fda.gov/food/enforcement.json?search=brand_name:"${encodeURIComponent(Brand)}"&limit=10`,
        name: 'brand_name_exact'
      });
      
      // Strategy 2: Partial brand_name match
      const brandParts = Brand.split(/[\s,]+/).filter(p => p.length > 2);
      if (brandParts.length > 1) {
        const partialBrand = brandParts.slice(0, 2).join(' ');
        searchStrategies.push({
          url: `https://api.fda.gov/food/enforcement.json?search=brand_name:"${encodeURIComponent(partialBrand)}"&limit=10`,
          name: 'brand_name_partial'
        });
      }
      
      // Strategy 3: product_description contains brand
      searchStrategies.push({
        url: `https://api.fda.gov/food/enforcement.json?search=product_description:"${encodeURIComponent(Brand)}"&limit=10`,
        name: 'product_description_exact'
      });
    }

    if (ProductType !== 'Unknown' && ProductType !== '') {
      // Strategy 4: product_description contains product type
      searchStrategies.push({
        url: `https://api.fda.gov/food/enforcement.json?search=product_description:"${encodeURIComponent(ProductType)}"&limit=10`,
        name: 'product_type'
      });
    }

    // If no strategies, return empty
    if (searchStrategies.length === 0) {
      return [];
    }

    // Try each strategy until we find results
    for (const strategy of searchStrategies) {
      try {
        const response = await fetch(strategy.url, {
          headers: { 'Authorization': `Bearer ${process.env.OPENFDA_API_KEY}` },
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.results && data.results.length > 0) {
            console.log(`📊 FDA: ${data.results.length} results found using "${strategy.name}"`);
            
            // Filter by Concern if applicable
            let filteredResults = data.results;
            if (Concern && Concern !== 'Unknown' && Concern !== 'safe' && Concern !== 'safety') {
              filteredResults = filterResultsByConcern(data.results, Concern);
              console.log(`📊 FDA: ${filteredResults.length} results after concern filtering`);
            }
            
            // Merge results
            allResults = [...allResults, ...filteredResults];
            
            // If we have at least 1 result after concern filtering, break
            if (filteredResults.length > 0) {
              break;
            }
          }
        }
      } catch (error) {
        console.error(`FDA ${strategy.name} error:`, error.message);
      }
    }

    // Deduplicate results
    const uniqueResults = [];
    const seen = new Set();
    allResults.forEach(item => {
      const id = item.recall_number || item.id || JSON.stringify(item);
      if (!seen.has(id)) {
        seen.add(id);
        uniqueResults.push(item);
      }
    });

    console.log(`📊 FDA Final: ${uniqueResults.length} unique results`);
    return uniqueResults;
    
  } catch (error) {
    console.error('FDA API Error:', error.message);
    return [];
  }
}

// =========================================
// SOURCE 2: USDA FSIS (Meat, Poultry, Eggs)
// =========================================
async function queryUSDA(Brand, Concern) {
  try {
    if (Brand === 'Unknown' || Brand === '') return [];
    
    // Try multiple variations
    const brandParts = Brand.split(/[\s,]+/).filter(p => p.length > 2);
    const searchQueries = [
      Brand,
      brandParts.slice(0, 2).join(' '),
      brandParts[0]
    ].filter(q => q && q.length > 2);
    
    for (const query of searchQueries) {
      const url = `https://www.fsis.usda.gov/api/recalls?query=${encodeURIComponent(query)}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.recalls && data.recalls.length > 0) {
          console.log(`📊 USDA: ${data.recalls.length} results found for "${query}"`);
          return filterResultsByConcern(data.recalls, Concern);
        }
      }
    }
    return [];
  } catch (error) {
    console.error('USDA API Error:', error.message);
    return [];
  }
}

// =========================================
// SOURCE 3: UK FSA (Food Alerts & Allergens)
// =========================================
async function queryUKFSA(Brand, Concern) {
  try {
    if (Brand === 'Unknown' || Brand === '') return [];
    
    const brandParts = Brand.split(/[\s,]+/).filter(p => p.length > 2);
    const searchQueries = [
      Brand,
      brandParts.slice(0, 2).join(' '),
      brandParts[0]
    ].filter(q => q && q.length > 2);
    
    for (const query of searchQueries) {
      const url = `https://api.food.gov.uk/alerts?query=${encodeURIComponent(query)}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.alerts && data.alerts.length > 0) {
          console.log(`📊 UK FSA: ${data.alerts.length} results found for "${query}"`);
          return filterResultsByConcern(data.alerts, Concern);
        }
      }
    }
    return [];
  } catch (error) {
    console.error('UK FSA API Error:', error.message);
    return [];
  }
}

// =========================================
// SOURCE 4: CFIA (Canadian Food Recalls)
// =========================================
async function queryCFIA(Brand, Concern) {
  try {
    const url = 'https://www.inspection.gc.ca/food-recalls-and-allergy-alerts/json/';
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    const recalls = data.recalls || [];
    
    let filtered = recalls;
    if (Brand && Brand !== 'Unknown' && Brand !== '') {
      filtered = recalls.filter(item =>
        (item.product_name || '').toLowerCase().includes(Brand.toLowerCase()) ||
        (item.brand_name || '').toLowerCase().includes(Brand.toLowerCase())
      );
    }
    
    // Filter by concern
    filtered = filterResultsByConcern(filtered, Concern);
    
    console.log(`📊 CFIA: ${filtered.length} results found`);
    return filtered;
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

// =========================================
// HELPER: Verdict Mapping
// =========================================
function mapVerdictToAgreeDisagree(aiVerdict, queryIntent) {
  if (aiVerdict === 'INCONCLUSIVE') return 'INCONCLUSIVE';

  if (queryIntent === 'SAFETY') {
    if (aiVerdict === 'AGREES') return 'DISAGREES';
    if (aiVerdict === 'DISAGREES') return 'AGREES';
  }

  // INGREDIENT queries map directly
  // "Does X contain Y?" → If source says "yes" → AGREES
  return aiVerdict;
}

// =========================================
// QUERY NORMALIZATION
// =========================================
function normalizeQuery(query) {
  // Step 1: Remove extra spaces and trim
  let cleaned = query.trim();

  // Step 2: Add spaces between camelCase words
  // "isCaitoFoodsService" → "is Caito Foods Service"
  cleaned = cleaned.replace(/([a-z])([A-Z])/g, '$1 $2');

  // Step 3: Add spaces after punctuation
  // "Inc.recalled" → "Inc. recalled"
  cleaned = cleaned.replace(/\.([a-zA-Z])/g, '. $1');
  cleaned = cleaned.replace(/,([a-zA-Z])/g, ', $1');

  // Step 4: Add spaces before common keywords
  const keywords = ['recalled', 'recall', 'safe', 'safety', 'salmonella', 'e.coli', 'listeria', 'contamination'];
  keywords.forEach(keyword => {
    const regex = new RegExp(`(${keyword})([a-zA-Z])`, 'gi');
    cleaned = cleaned.replace(regex, '$1 $2');
  });

  // Step 5: Add spaces after common prefixes
  const prefixes = ['is', 'does', 'has', 'was', 'can', 'will', 'have'];
  prefixes.forEach(prefix => {
    const regex = new RegExp(`^(${prefix})([A-Z])`, 'i');
    cleaned = cleaned.replace(regex, '$1 $2');
  });

  console.log(`🔧 Normalized query: "${query}" → "${cleaned}"`);
  return cleaned;
}

// =========================================
// AI SOURCE ANALYSIS
// =========================================
async function analyzeSourceWithAI(sourceName, sourceData, userQuery, extractedEntities, queryIntent) {
  // Limit data to top 3 results to reduce token usage
  const limitedData = sourceData.slice(0, 3);

  const systemPrompt = `You are a fact-checker. Analyze the source data and decide if it AGREES or DISAGREES with the user's claim.

**Query Types:**
- RECALL: "Is X recalled?" → Check if a recall exists
- SAFETY: "Is X safe?" → Check if a recall exists (recall = not safe)
- HEALTH: "Does X cause cancer/disease?" → Check if the source mentions the health risk
- INGREDIENT: "Does X contain Y?" → Check if the source mentions the ingredient/substance

**INGREDIENT QUERIES (e.g., "Does X contain sugar?"):**
- AGREES: The source confirms the product contains the ingredient (e.g., recall says "actually contains sugar")
- DISAGREES: The source says the product does NOT contain the ingredient
- INCONCLUSIVE: The source has no mention of the ingredient

**EXAMPLES:**
- Claim: "Does Keurig Dr Pepper contain sugar?" 
  → FDA recall: "Zero Sugar products may contain sugar" 
  → AGREES (contains sugar)

- Claim: "Does product contain gluten?"
  → FDA data: no mention of gluten
  → INCONCLUSIVE

- User: "Is Jif peanut butter safe?" → FDA: recall found → DISAGREE
- User: "Is Jif peanut butter recalled?" → FDA: recall found → AGREE
- User: "Is bread safe?" → FDA: no data → INCONCLUSIVE

Return: {"verdict": "AGREES"|"DISAGREES"|"INCONCLUSIVE", "reason": "..."}`;

  const userPrompt = `
User query: ${userQuery}
Query intent: ${queryIntent}
Product: ${extractedEntities.ProductType}
Brand: ${extractedEntities.Brand}
Concern: ${extractedEntities.Concern}

Source: ${sourceName}
Data: ${JSON.stringify(limitedData, null, 2)}`;

  try {
    const response = await callLLM(systemPrompt, userPrompt);
    const parsed = JSON.parse(response);
    return parsed;
  } catch (error) {
    console.error(`AI analysis failed for ${sourceName}:`, error.message);
    return { verdict: 'INCONCLUSIVE', reason: 'Analysis failed' };
  }
}

// =========================================
// QUERY INTENT DETECTION
// =========================================
function detectQueryIntent(query) {
  const lower = query.toLowerCase();

  const ingredientKeywords = ['contain', 'contains', 'has', 'have', 'ingredient', 'sugar', 'gluten', 'dairy', 'soy', 'wheat', 'egg', 'peanut', 'tree nut', 'fish', 'shellfish'];
  const healthKeywords = ['cancer', 'carcinogen', 'diabetes', 'heart disease', 'obesity', 'cause', 'risk', 'disease'];
  const safetyKeywords = ['safe', 'safety', 'ok to eat', 'safe to eat', 'harmful', 'dangerous', 'healthy'];
  const recallKeywords = ['recall', 'recalled', 'recalls', 'alert', 'warning', 'contamination', 'salmonella', 'e.coli', 'listeria', 'outbreak'];

  const isIngredientQuery = ingredientKeywords.some(k => lower.includes(k));
  const isHealthQuery = healthKeywords.some(k => lower.includes(k));
  const isSafetyQuery = safetyKeywords.some(k => lower.includes(k));
  const isRecallQuery = recallKeywords.some(k => lower.includes(k));

  if (isIngredientQuery) return 'INGREDIENT';
  if (isHealthQuery) return 'HEALTH';
  if (isSafetyQuery && !isRecallQuery) return 'SAFETY';
  return 'RECALL';
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

    // Normalize the user input
    const normalizedQuery = normalizeQuery(rumorText);

    // Step 1: Extract entities
    let { Brand, ProductType, Concern } = await extractEntities(normalizedQuery);
    console.log(`🔍 Extracted: Brand="${Brand}", Product="${ProductType}", Concern="${Concern}"`);

    // If extraction failed, try to extract from the raw query
    if (Brand === 'Unknown' && ProductType === 'Unknown') {
      // Try to extract brand from raw query using patterns
      const brandMatch = rumorText.match(/([A-Z][a-zA-Z]+(?:,?\s*(?:Inc|LLC|Ltd|Corp|Company|Foods|Service|Group|Brand))?\s*)/);
      if (brandMatch) {
        Brand = brandMatch[1].trim();
        console.log(`🔍 Fallback: Extracted brand "${Brand}" from raw query`);
      }

      // Try to extract concern from raw query
      const concernKeywords = ['salmonella', 'e.coli', 'listeria', 'recall', 'contamination', 'allergen'];
      concernKeywords.forEach(keyword => {
        if (rumorText.toLowerCase().includes(keyword) && Concern === 'Unknown') {
          Concern = keyword;
          console.log(`🔍 Fallback: Extracted concern "${Concern}" from raw query`);
        }
      });
    }

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
        extractedEntities: { Brand, ProductType, Concern }
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
        extractedEntities: { Brand, ProductType, Concern }
      });
    }

    // Step 2: Query ALL sources in parallel with new robust functions
    let [
      fdaResults,
      usdaResults,
      ukResults,
      cfiaResults,
      openFoodFactsResults,
      rasffResults,
      cdcResults
    ] = await Promise.all([
      queryFDA(Brand, ProductType, Concern),
      queryUSDA(Brand, Concern),
      queryUKFSA(Brand, Concern),
      queryCFIA(Brand, Concern),
      queryOpenFoodFacts(Brand),
      queryRASFF(Brand),
      queryCDC(Brand)
    ]);

    // --- Step 2b: Check if this is a health risk query (WHO) ---
    const isHealthQuery = await queryWHO(rumorText);

    // --- Step 3: Collect sources with data for AI analysis (reduces token usage) ---
    const extractedEntities = { Brand, ProductType, Concern };
    const whoResults = isHealthQuery ? [{ health_alert: true }] : [];

    const sourcesWithData = [];

    if (fdaResults.length > 0) sourcesWithData.push({ name: 'FDA', data: fdaResults });
    if (usdaResults.length > 0) sourcesWithData.push({ name: 'USDA', data: usdaResults });
    if (ukResults.length > 0) sourcesWithData.push({ name: 'UK FSA', data: ukResults });
    if (cfiaResults.length > 0) sourcesWithData.push({ name: 'CFIA', data: cfiaResults });
    if (whoResults.length > 0) sourcesWithData.push({ name: 'WHO', data: whoResults });
    if (openFoodFactsResults.length > 0) sourcesWithData.push({ name: 'Open Food Facts', data: openFoodFactsResults });
    if (rasffResults.length > 0) sourcesWithData.push({ name: 'RASFF', data: rasffResults });
    if (cdcResults.length > 0) sourcesWithData.push({ name: 'CDC', data: cdcResults });

    // Detect query intent before analysis (used by AI reasoning)
    const queryIntent = detectQueryIntent(rumorText);

    // Only analyze sources with data
    const analysisPromises = sourcesWithData.map(s =>
      analyzeSourceWithAI(s.name, s.data, rumorText, extractedEntities, queryIntent)
    );

    const analyses = await Promise.all(analysisPromises);

    // Sources without data are automatically inconclusive
    const sourcesWithoutData = 8 - sourcesWithData.length;

    // Count verdicts (apply verdict mapping for query intent)
    let agrees = 0, disagrees = 0, inconclusive = 0;

    analyses.forEach(a => {
      const mappedVerdict = mapVerdictToAgreeDisagree(a.verdict, queryIntent);
      if (mappedVerdict === 'AGREES') agrees++;
      else if (mappedVerdict === 'DISAGREES') disagrees++;
      else inconclusive++;
    });

    // Add sources without data as inconclusive
    inconclusive += sourcesWithoutData;

    // Fallback: For SAFETY queries, if a source has data, treat as DISAGREE
    if (queryIntent === 'SAFETY') {
      analyses.forEach((a, i) => {
        if (i < sourcesWithData.length && sourcesWithData[i].data.length > 0 && a.verdict === 'INCONCLUSIVE') {
          a.verdict = 'DISAGREES';
          a.reason = 'Recall data found (fallback)';
        }
      });
    }

    // Recalculate counts after fallback
    agrees = 0; disagrees = 0; inconclusive = 0;
    analyses.forEach(a => {
      const mappedVerdict = mapVerdictToAgreeDisagree(a.verdict, queryIntent);
      if (mappedVerdict === 'AGREES') agrees++;
      else if (mappedVerdict === 'DISAGREES') disagrees++;
      else inconclusive++;
    });
    inconclusive += sourcesWithoutData;

    // Evidence Strength = Sources with Data / Total Sources
    const sourcesWithDataCount = sourcesWithData.length;
    const evidenceStrength = Math.round((sourcesWithDataCount / 8) * 100);

    // Calculate percentages based on total sources (8)
    const totalSources = 8;
    const agreePercent = Math.round((agrees / totalSources) * 100);
    const disagreePercent = Math.round((disagrees / totalSources) * 100);
    const inconclusivePercent = Math.round((inconclusive / totalSources) * 100);

    console.log(`🧠 AI Analysis: ${agrees} agrees, ${disagrees} disagrees, ${inconclusive} inconclusive → Evidence Strength: ${evidenceStrength}% (Intent: ${queryIntent})`);

    // Build sourceStatus from analyzed sources + default false for unanalyzed
    const sourceStatus = {
      fda: false,
      usda: false,
      ukfsa: false,
      cfia: false,
      who: false,
      openfoodfacts: false,
      rasff: false,
      cdc: false
    };

    // Map analyzed source names back to keys
    const nameToKey = {
      'FDA': 'fda',
      'USDA': 'usda',
      'UK FSA': 'ukfsa',
      'CFIA': 'cfia',
      'WHO': 'who',
      'Open Food Facts': 'openfoodfacts',
      'RASFF': 'rasff',
      'CDC': 'cdc'
    };

    sourcesWithData.forEach((s, i) => {
      const key = nameToKey[s.name];
      if (key && analyses[i]) {
        sourceStatus[key] = analyses[i].verdict === 'AGREES';
      }
    });

    // --- Step 5: Merge all results ---
    const allResults = mergeResults([
      fdaResults,
      usdaResults,
      ukResults,
      cfiaResults,
      openFoodFactsResults,
      rasffResults,
      cdcResults
    ]);

    // --- Step 6: Generate explanation ---
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

    // --- Step 7: Generate source links ---
    const sourceLinks = [];
    if (fdaResults.length > 0 && fdaResults[0].url) sourceLinks.push(fdaResults[0].url);
    if (usdaResults.length > 0 && usdaResults[0].url) sourceLinks.push(usdaResults[0].url);
    if (ukResults.length > 0 && ukResults[0].url) sourceLinks.push(ukResults[0].url);
    if (cfiaResults.length > 0 && cfiaResults[0].url) sourceLinks.push(cfiaResults[0].url);
    if (rasffResults.length > 0 && rasffResults[0].url) sourceLinks.push(rasffResults[0].url);

    // --- Step 8: Return response ---
    const sourcesWithMatches = Object.values(sourceStatus).filter(v => v).length;

    return NextResponse.json({
      status: allResults.length > 0 ? 'recalled' : 'safe',
      fact: fact,
      summary: explanation,
      confidence: evidenceStrength,
      agrees: agreePercent,
      disagrees: disagreePercent,
      inconclusive: inconclusivePercent,
      sourceStatus: sourceStatus,
      sourceAnalysis: analyses,
      sourceLinks: sourceLinks.length > 0 ? sourceLinks : null,
      totalSourcesChecked: totalSources,
      sourcesWithMatches: sourcesWithMatches,
      extractedEntities: { Brand, ProductType, Concern }
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}