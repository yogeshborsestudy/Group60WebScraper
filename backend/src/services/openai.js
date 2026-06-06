/* ============================================================
   GROUP60 — THE INVESTIGATOR — OpenAI Service
   ScamShield AI — GPT-4o fraud detection & trust analysis.
   ============================================================ */

const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are ScamShield AI, an elite cyber-intelligence, fraud-detection,
OSINT, trust-verification, and digital risk assessment agent built
into the Group60 Investigator platform.

Your mission is to investigate websites, domains, emails, messages,
social profiles, business entities, advertisements, marketplaces,
investment opportunities, job postings, documents, and digital content
to determine their trustworthiness and scam risk.

You operate like a combination of:
- Cybersecurity Analyst
- Fraud Investigator
- OSINT Researcher
- Digital Forensics Expert
- Consumer Protection Specialist
- Risk Intelligence Analyst

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCORING SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Score each category 0–100 based on evidence:

Domain Score
  High (80+): domain older than 2 years, stable ownership, reputable registrar
  Low (0–30): domain under 30 days old, hidden WHOIS, suspicious TLD

Content Score
  High (80+): clear product descriptions, no unrealistic claims, original content
  Low (0–30): guaranteed returns, fear/urgency language, copied/AI-generated spam content

Transparency Score
  High (80+): privacy policy, terms of service, refund policy, contact page all present
  Low (0–30): missing legal pages, no contact information, vague policies

Reputation Score
  High (80+): positive reviews found, no scam reports, active community presence
  Low (0–30): scam reports found, repeated complaints, no reviews anywhere

Overall trust score = (Domain + Content + Transparency + Reputation) / 4, rounded to nearest whole number.

Risk Level (based on overall trust score):
  90–100 → "Very Safe"
  75–89  → "Safe"
  60–74  → "Moderate Risk"
  40–59  → "High Risk"
  20–39  → "Very High Risk"
  0–19   → "Critical Risk"

Confidence level:
  "High"   — when you have sufficient scraped data to draw clear conclusions
  "Medium" — when data is partial or signals are mixed
  "Low"    — when data is very sparse or inconclusive

Recommendation (pick exactly one):
  "Proceed Normally"
  "Proceed With Caution"
  "Verify Independently"
  "Avoid Sharing Sensitive Information"
  "Avoid this site"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INVESTIGATION REPORT RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Generate 5–8 bullet points of findings. Each bullet must have:
  - type: "warning" (for anything suspicious, missing, mismatched, or fraudulent)
         or "info" (for neutral observations that are notable but not alarming)
  - text: one clear finding sentence

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRODUCT EXTRACTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If the site contains products, listings, jobs, or investment opportunities:
  - Extract up to 10 records
  - Normalize: prices as "$X.XX", availability as "In Stock" / "Low Stock" / "Out of Stock"
  - rating field: use star string like "★★★★½" or empty string if not available
  - If no products exist, return empty rows array

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SAFETY RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NEVER:
  - Invent domain ages, WHOIS data, or SSL details
  - Fabricate reviews or business registrations
  - Claim certainty without scraped evidence
  - Return anything outside the JSON structure

ALWAYS:
  - Base every score on evidence from scraped content
  - Use null for any field you cannot verify
  - Lower confidence score when data is incomplete
  - Distinguish facts from inferences in report bullets
  - Return the full JSON even if investigation is partial

Always respond with valid JSON only. No text before or after the JSON.`;

/**
 * Build the user prompt from scraped data
 */
function buildUserPrompt(data) {
  const now = new Date().toLocaleTimeString('en-US', { hour12: true });

  return `Analyze this website data and return a complete trust assessment.

Website URL: ${data.url}
Page count: ${data.pageCount}
Tech stack: ${data.techStack}
SSL: ${data.sslStatus}
Contact page found: ${data.contactPageFound}
Physical address: ${data.physicalAddress || 'Not found'}
Social links: ${data.socialLinks}
Has privacy policy: ${data.hasPrivacyPolicy}
Has terms of service: ${data.hasTermsOfService}
Has refund policy: ${data.hasRefundPolicy}
Uses urgency language: ${data.urgencyLanguage}
Uses guarantee language: ${data.guaranteeLanguage}
Business name: ${data.businessName || 'Unknown'}

${data.products && data.products.length > 0 ? `Products/Listings found on site (${data.products.length} items):
${JSON.stringify(data.products.slice(0, 10), null, 2)}` : 'No products/listings detected.'}

Raw page content (first 4000 chars):
${(data.rawMarkdown || '').slice(0, 4000)}

Return ONLY this exact JSON structure (no text outside it):

{
  "investigation": {
    "meta": {
      "url": "${data.url}",
      "status": "Investigation complete",
      "timestamp": "${now}",
      "agent_status": "Agent Online"
    },
    "trust_score": {
      "overall": <number 0-100>,
      "risk_level": <"Very Safe"|"Safe"|"Moderate Risk"|"High Risk"|"Very High Risk"|"Critical Risk">,
      "confidence": <"Low"|"Medium"|"High">
    },
    "trust_heatmap": {
      "domain": <number 0-100>,
      "content": <number 0-100>,
      "transparency": <number 0-100>,
      "reputation": <number 0-100>
    },
    "scraped_site_data": {
      "domain_age": <string or null>,
      "registrar": <string or null>,
      "contact_page": <"Found"|"Not found">,
      "page_count": <string, e.g. "22 pages crawled">,
      "ssl_status": <string>,
      "whois_data": <string or null>,
      "social_links": <string>,
      "tech_stack": <string>
    },
    "verdict": <string, 3-5 sentences explaining key findings and overall risk>,
    "investigation_report": [
      { "type": <"warning"|"info">, "text": <string> }
    ],
    "recommendation": <"Proceed Normally"|"Proceed With Caution"|"Verify Independently"|"Avoid Sharing Sensitive Information"|"Avoid this site">,
    "extracted_data": {
      "table_label": <string, e.g. "Extracted Products Table" or "Extracted Job Listings Table">,
      "record_count": <number>,
      "timestamp": "${now}",
      "columns": ["title", "category", "price", "availability", "rating"],
      "rows": [
        {
          "rank": <number>,
          "title": <string>,
          "category": <string or "">,
          "price": <string or "">,
          "availability": <"In Stock"|"Low Stock"|"Out of Stock"|"Available"|"">,
          "rating": <string, e.g. "★★★★½" or "">
        }
      ]
    },
    "explain_like_grandmother": <string, max 150 words, plain English, no jargon>,
    "positive_findings": [<string>],
    "red_flags": [<string>]
  }
}`;
}

/**
 * Analyze scraped data using GPT-4o and return structured trust assessment
 * @param {object} scrapedData - Output from firecrawl.investigateSite()
 * @returns {object} - Parsed trust assessment JSON (the full investigation object)
 */
async function analyzeAndScore(scrapedData) {
  const userPrompt = buildUserPrompt(scrapedData);

  let lastError = null;
  const MAX_ATTEMPTS = 2;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(`[OpenAI] Attempt ${attempt}: Sending analysis request to GPT-4o...`);

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 4000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from GPT-4o');
      }

      const parsed = JSON.parse(content);

      // Support both wrapped { investigation: {...} } and bare { trust_score: {...} } formats
      const inv = parsed.investigation || parsed;
      const score = inv.trust_score?.overall ?? inv.trustScore ?? 0;
      const risk  = inv.trust_score?.risk_level ?? inv.risk ?? 'Unknown';

      console.log(`[OpenAI] Analysis complete. Trust score: ${score}, Risk: ${risk}`);
      return parsed;

    } catch (err) {
      lastError = err;
      console.warn(`[OpenAI] Attempt ${attempt} failed:`, err.message);

      if (attempt < MAX_ATTEMPTS) {
        console.log(`[OpenAI] Retrying...`);
      }
    }
  }

  throw new Error(`OpenAI analysis failed after ${MAX_ATTEMPTS} attempts: ${lastError?.message}`);
}

module.exports = { analyzeAndScore };
