/* ============================================================
   GROUP60 — THE INVESTIGATOR — SSL Checker Service
   Fetches SSL certificate metrics from ssl-checker.io
   ============================================================ */

/**
 * Check the SSL certificate of a given URL
 * @param {string} urlStr - The URL to check
 * @returns {Promise<object|null>} - SSL checker result or null if failed
 */
async function checkSSL(urlStr) {
  try {
    const parsedUrl = new URL(urlStr);
    const host = parsedUrl.hostname;

    console.log(`[SSL Checker] Fetching certificate info for: ${host}`);
    const response = await fetch(`https://ssl-checker.io/api/v1/check/${host}`);
    
    if (!response.ok) {
      console.warn(`[SSL Checker] API returned status ${response.status} for ${host}`);
      return null;
    }

    const data = await response.json();
    if (data && data.status === 'ok' && data.result) {
      return data.result;
    }

    console.warn(`[SSL Checker] Unexpected response structure for ${host}:`, data);
    return null;
  } catch (err) {
    console.error(`[SSL Checker] Failed to check SSL for URL ${urlStr}:`, err.message);
    return null;
  }
}

module.exports = { checkSSL };
