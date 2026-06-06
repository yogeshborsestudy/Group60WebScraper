/* ============================================================
   GROUP60 — THE INVESTIGATOR — DomScan Service
   Fetches domain registration data from DomScan API
   ============================================================ */

/**
 * Get the normalized domain profile using DomScan API
 * @param {string} urlStr - The URL to inspect
 * @returns {Promise<object|null>} - DomScan profile result or null if failed
 */
async function getDomainProfile(urlStr) {
  try {
    if (!urlStr) return null;

    const parsedUrl = new URL(urlStr);
    let host = parsedUrl.hostname;

    // Remove port if present
    host = host.split(':')[0];

    // Clean up www. prefix if present to query apex domain
    let domain = host;
    if (domain.startsWith('www.')) {
      domain = domain.substring(4);
    }

    const apiKey = process.env.DOMSCAN_API_KEY;
    if (!apiKey || apiKey === 'your_domscan_api_key_here') {
      console.warn('[DomScan] API key not configured. Skipping DomScan check.');
      return null;
    }

    console.log(`[DomScan] Fetching profile for domain: ${domain}`);
    const response = await fetch(`https://domscan.net/v1/profile?domain=${domain}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-API-Key': apiKey,
      },
    });

    if (!response.ok) {
      console.warn(`[DomScan] API returned status ${response.status} for ${domain}`);
      return null;
    }

    const data = await response.json();
    console.log(`[DomScan] Received profile for ${domain}:`, data);
    return data;
  } catch (err) {
    console.error(`[DomScan] Failed to fetch profile for URL ${urlStr}:`, err.message);
    return null;
  }
}

module.exports = { getDomainProfile };
