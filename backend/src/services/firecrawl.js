/* ============================================================
   GROUP60 — THE INVESTIGATOR — Firecrawl Service
   Handles all site mapping, scraping, and data extraction.
   ============================================================ */

const FirecrawlApp = require('@mendable/firecrawl-js').default || require('@mendable/firecrawl-js');

const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

// Key paths to look for during site mapping
const KEY_PATHS = ['/about', '/contact', '/terms', '/privacy', '/refund', '/returns', '/products', '/shop', '/store', '/team', '/faq'];

// Social media domains to detect
const SOCIAL_DOMAINS = ['facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'linkedin.com', 'tiktok.com', 'youtube.com'];

/**
 * Investigate a site: map → scrape → extract → analyze signals
 * @param {string} url - The URL to investigate
 * @returns {object} - Structured scraped data
 */
async function investigateSite(url) {
  let allUrls = [];
  let pageCount = 0;
  let keyPagesFound = {};

  // ── STEP 1: Map the site ──
  console.log(`[Firecrawl] Step 1: Mapping site structure for ${url}`);
  try {
    const mapResult = await firecrawl.mapUrl(url);
    if (mapResult && mapResult.links) {
      allUrls = mapResult.links;
      pageCount = allUrls.length;

      // Identify key paths
      for (const pageUrl of allUrls) {
        try {
          const pathname = new URL(pageUrl).pathname.toLowerCase();
          for (const keyPath of KEY_PATHS) {
            if (pathname.includes(keyPath)) {
              keyPagesFound[keyPath] = pageUrl;
            }
          }
        } catch (e) {
          // Skip malformed URLs
        }
      }
    }
    console.log(`[Firecrawl] Map found ${pageCount} URLs. Key pages: ${Object.keys(keyPagesFound).join(', ') || 'none'}`);
  } catch (err) {
    console.warn(`[Firecrawl] Map failed, continuing with homepage only:`, err.message);
    allUrls = [url];
    pageCount = 1;
  }

  // ── STEP 2: Scrape the homepage ──
  console.log(`[Firecrawl] Step 2: Scraping homepage`);
  let scrapeResult;
  try {
    scrapeResult = await firecrawl.scrapeUrl(url, {
      formats: ['markdown', 'links', 'extract'],
      extract: {
        schema: {
          type: 'object',
          properties: {
            businessName:      { type: 'string' },
            contactEmail:      { type: 'string' },
            contactPhone:      { type: 'string' },
            physicalAddress:   { type: 'string' },
            socialLinks:       { type: 'array', items: { type: 'string' } },
            products: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title:        { type: 'string' },
                  price:        { type: 'string' },
                  category:     { type: 'string' },
                  availability: { type: 'string' },
                  rating:       { type: 'string' }
                }
              }
            },
            hasPrivacyPolicy:           { type: 'boolean', description: 'Set to true if there is an explicit link to or text of a Privacy Policy on the page.' },
            hasTermsOfService:          { type: 'boolean', description: 'Set to true if there is an explicit link to or text of a Terms of Service or Terms & Conditions on the page.' },
            hasRefundPolicy:            { type: 'boolean', description: 'Set to true if there is an explicit link to or text of a Refund Policy or Return Policy on the page.' },
            privacyPolicyLinkOrStatus:  { type: 'string', description: 'The exact URL/path, link text, or a snippet of where the Privacy Policy is found. Return "Not found" if absent.' },
            termsOfServiceLinkOrStatus: { type: 'string', description: 'The exact URL/path, link text, or a snippet of where the Terms of Service is found. Return "Not found" if absent.' },
            refundPolicyLinkOrStatus:   { type: 'string', description: 'The exact URL/path, link text, or a snippet of where the Refund/Return Policy is found. Return "Not found" if absent.' },
            urgencyLanguage:            { type: 'boolean' },
            guaranteeLanguage:          { type: 'boolean' },
            jurisdiction:               { type: 'string', description: 'The governing law, legal jurisdiction, or state/country of registration/operation mentioned in the text (e.g., California, USA, or Delaware). Return "Unknown" if not mentioned.' }
          }
        }
      }
    });
  } catch (err) {
    throw new Error(`Firecrawl scrape failed: ${err.message}`);
  }

  const extracted = scrapeResult?.extract || {};
  const rawMarkdown = scrapeResult?.markdown || '';
  const scrapedLinks = scrapeResult?.links || [];

  // ── STEP 3: Scrape contact/about page if found ──
  console.log(`[Firecrawl] Step 3: Checking contact/about pages`);
  let contactPageFound = false;
  let contactData = {};

  const contactUrl = keyPagesFound['/contact'] || keyPagesFound['/about'];
  if (contactUrl) {
    contactPageFound = true;
    try {
      const contactResult = await firecrawl.scrapeUrl(contactUrl, {
        formats: ['extract'],
        extract: {
          schema: {
            type: 'object',
            properties: {
              physicalAddress: { type: 'string' },
              phoneNumber:     { type: 'string' },
              emailAddress:    { type: 'string' },
              teamMembers:     { type: 'array', items: { type: 'string' } },
              jurisdiction:    { type: 'string', description: 'The legal jurisdiction or country/state of registration.' }
            }
          }
        }
      });
      contactData = contactResult?.extract || {};
      console.log(`[Firecrawl] Contact page scraped successfully`);
    } catch (err) {
      console.warn(`[Firecrawl] Contact page scrape failed:`, err.message);
    }
  }

  // ── STEP 4: Detect tech stack ──
  console.log(`[Firecrawl] Step 4: Detecting tech stack`);
  const techIndicators = [];
  const metadata = scrapeResult?.metadata || {};

  if (metadata.generator) {
    techIndicators.push(metadata.generator);
  }

  // Check raw markdown for platform signatures
  const contentLower = rawMarkdown.toLowerCase();
  const platformSignatures = {
    'Shopify':    ['shopify', 'myshopify.com', 'cdn.shopify'],
    'WordPress':  ['wp-content', 'wordpress', 'wp-json'],
    'Wix':        ['wix.com', 'wixsite', 'parastorage'],
    'Squarespace':['squarespace', 'sqsp.net'],
    'BigCommerce':['bigcommerce'],
    'Magento':    ['magento', 'mage'],
    'Cloudflare': ['cloudflare', 'cf-ray'],
    'React':      ['react', '__next', '_next'],
    'Next.js':    ['_next/static', '__next'],
    'Vue':        ['vue.js', 'vuejs'],
  };

  for (const [platform, signatures] of Object.entries(platformSignatures)) {
    if (signatures.some(sig => contentLower.includes(sig))) {
      if (!techIndicators.includes(platform)) {
        techIndicators.push(platform);
      }
    }
  }

  const techStack = techIndicators.length > 0 ? techIndicators.join(', ') : 'Unknown';

  // ── STEP 5: Check SSL ──
  console.log(`[Firecrawl] Step 5: Checking SSL`);
  const sslStatus = url.startsWith('https://') ? 'Valid HTTPS' : 'No HTTPS detected';

  // ── STEP 6: Detect social links ──
  console.log(`[Firecrawl] Step 6: Detecting social links`);
  const allLinks = [...scrapedLinks, ...(extracted.socialLinks || [])];
  const socialLinksFound = [];

  for (const link of allLinks) {
    if (typeof link !== 'string') continue;
    for (const domain of SOCIAL_DOMAINS) {
      if (link.includes(domain) && !socialLinksFound.some(s => s.includes(domain))) {
        socialLinksFound.push(link);
      }
    }
  }

  const socialLinks = socialLinksFound.length > 0
    ? socialLinksFound.map(l => {
        try { return new URL(l).hostname; } catch { return l; }
      }).join(', ')
    : 'None detected';

  // ── Build and return result ──
  const physicalAddress = contactData.physicalAddress || extracted.physicalAddress || null;
  const contactEmail = contactData.emailAddress || extracted.contactEmail || null;
  const jurisdiction = contactData.jurisdiction || extracted.jurisdiction || 'Unknown';

  // Determine legal compliance status
  const hasPrivacy = !!extracted.hasPrivacyPolicy || 
                     (extracted.privacyPolicyLinkOrStatus && extracted.privacyPolicyLinkOrStatus.toLowerCase() !== 'not found') || 
                     !!keyPagesFound['/privacy'];
  const hasTerms = !!extracted.hasTermsOfService || 
                   (extracted.termsOfServiceLinkOrStatus && extracted.termsOfServiceLinkOrStatus.toLowerCase() !== 'not found') || 
                   !!keyPagesFound['/terms'];
  const hasRefund = !!extracted.hasRefundPolicy || 
                    (extracted.refundPolicyLinkOrStatus && extracted.refundPolicyLinkOrStatus.toLowerCase() !== 'not found') || 
                    !!keyPagesFound['/refund'] || 
                    !!keyPagesFound['/returns'];

  let legalCompliance = '';
  if (hasPrivacy && hasTerms && hasRefund) {
    legalCompliance = 'Privacy & Terms: Found (Valid)';
  } else if (hasPrivacy && hasTerms) {
    legalCompliance = 'Privacy & Terms: Found (No Refund Policy)';
  } else {
    const missing = [];
    if (!hasPrivacy) missing.push('Privacy Policy');
    if (!hasTerms) missing.push('Terms of Service');
    if (!hasRefund) missing.push('Refund Policy');
    legalCompliance = `Privacy & Terms: Missing (${missing.join(', ')})`;
  }

  const result = {
    url,
    pageCount,
    techStack,
    sslStatus,
    contactPageFound,
    socialLinks,
    hasPrivacyPolicy:  hasPrivacy,
    hasTermsOfService: hasTerms,
    hasRefundPolicy:   hasRefund,
    legalCompliance,
    urgencyLanguage:   extracted.urgencyLanguage || false,
    guaranteeLanguage: extracted.guaranteeLanguage || false,
    physicalAddress,
    contactEmail,
    businessName: extracted.businessName || null,
    jurisdiction,
    products: (extracted.products || []).slice(0, 10),
    rawMarkdown,
    allUrls,
  };

  console.log(`[Firecrawl] Investigation complete. Pages: ${pageCount}, Tech: ${techStack}, SSL: ${sslStatus}`);
  return result;
}

module.exports = { investigateSite };
