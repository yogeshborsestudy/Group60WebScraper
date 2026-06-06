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
  Low (0–30): domain under 30 days old, hidden registry details, suspicious TLD

Content Score
  High (80+): clear product descriptions, no unrealistic claims, original content
  Low (0–30): guaranteed returns, fear/urgency language, copied/AI-generated spam content

Transparency & Legal Compliance Score
  High (80+): LEGAL COMPLIANCE shows 'Found (Valid)' or equivalent, meaning privacy policy, terms of service, refund policy, and contact page are all present
  Low (0–30): LEGAL COMPLIANCE is 'Missing / Incomplete', indicating missing legal pages, no contact info, or vague policies

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
  - Invent domain ages, LEGAL COMPLIANCE status, or SSL details (use the exact verified values provided in the prompt)
  - Fabricate reviews or business registrations
  - Claim certainty without scraped/provided evidence
  - Return anything outside the JSON structure

ALWAYS:
  - Base every score on evidence from scraped content and provided domain registry details (domain age, registrar)
  - Use null for any field you cannot verify
  - Lower confidence score when data is incomplete
  - Distinguish facts from inferences in report bullets
  - Return the full JSON even if investigation is partial

Always respond with valid JSON only. No text before or after the JSON.`;

/**
 * Format domain age in days into years and months
 * @param {number} ageDays
 * @returns {string}
 */
function formatDomainAge(ageDays) {
  if (ageDays === undefined || ageDays === null) return 'Unknown';
  const years = Math.floor(ageDays / 365);
  const months = Math.floor((ageDays % 365) / 30);
  if (years > 0) {
    return `${years} year${years > 1 ? 's' : ''}${months > 0 ? `, ${months} month${months > 1 ? 's' : ''}` : ''} (${ageDays} days)`;
  }
  if (months > 0) {
    return `${months} month${months > 1 ? 's' : ''} (${ageDays} days)`;
  }
  return `${ageDays} day${ageDays > 1 ? 's' : ''}`;
}

/**
 * Build the user prompt from scraped data
 */
function buildUserPrompt(data) {
  const now = new Date().toLocaleTimeString('en-US', { hour12: true });

  const ageStr = data.domscanResult ? formatDomainAge(data.domscanResult.age_days) : 'Unknown';
  const registrarStr = data.domscanResult?.registrar || 'Unknown';

  return `Analyze this website data and return a complete trust assessment.

Website URL: ${data.url}
Verified Domain Age: ${ageStr}
Verified Domain Registrar: ${registrarStr}
Page count: ${data.pageCount}
Tech stack: ${data.techStack}
SSL Basic Status: ${data.sslStatus}
SSL Certificate Info: ${data.sslResult ? JSON.stringify(data.sslResult, null, 2) : 'No detailed SSL check available'}
Contact page found: ${data.contactPageFound}
Physical address: ${data.physicalAddress || 'Not found'}
Social links: ${data.socialLinks}
Has privacy policy: ${data.hasPrivacyPolicy}
Has terms of service: ${data.hasTermsOfService}
Has refund policy: ${data.hasRefundPolicy}
Verified Legal Compliance: ${data.legalCompliance}
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
      "domain_age": ${JSON.stringify(ageStr)},
      "registrar": ${JSON.stringify(registrarStr)},
      "contact_page": <"Found"|"Not found">,
      "page_count": <string, e.g. "22 pages crawled">,
      "ssl_status": <string, summarizing status, issuer, and days left, e.g., "Valid (Cloudflare, 84 days left)" or "Expired" or "No HTTPS detected">,
      "legal_compliance": <string, e.g., "Privacy & Terms: Found (Valid)" or "Privacy & Terms: Found (No Refund Policy)" or "Privacy & Terms: Missing (Privacy Policy, Refund Policy)">,
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
