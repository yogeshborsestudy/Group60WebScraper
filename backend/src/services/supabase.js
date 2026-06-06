/* ============================================================
   GROUP60 — THE INVESTIGATOR — Supabase Service
   All database operations: caching, saving raw/structured data.
   ============================================================ */

const { createClient } = require('@supabase/supabase-js');

// Lazy initialization — only create client when actually needed
let _supabase = null;

function getClient() {
  if (_supabase) return _supabase;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key || url.includes('your_') || key.includes('your_')) {
    console.warn('[Supabase] Not configured — caching and persistence disabled.');
    return null;
  }

  _supabase = createClient(url, key);
  return _supabase;
}

/**
 * Check if a cached analysis result exists for this URL (< 24 hours old)
 * @param {string} url
 * @returns {object|null} - Cached row or null
 */
async function checkCache(url) {
  const client = getClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('scraped_structured')
      .select('*')
      .eq('url', url)
      .single();

    if (error || !data) return null;

    // Check if timestamp is within 24 hours
    const cachedTime = new Date(data.timestamp).getTime();
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;

    if (now - cachedTime < twentyFourHours) {
      console.log(`[Supabase] Cache hit for ${url} (age: ${Math.round((now - cachedTime) / 60000)} min)`);
      return {
        trustScore:             data.trust_score,
        risk:                   data.risk_level,
        confidence:             data.confidence,
        heatmap:                data.heatmap,
        siteData:               data.site_data,
        verdict:                data.verdict,
        report:                 data.report,
        recommendation:         data.recommendation,
        explainLikeGrandmother: data.explain_like_grandmother,
        redFlags:               data.red_flags,
        positiveFindings:       data.positive_findings,
        products:               data.products,
      };
    }

    console.log(`[Supabase] Cache expired for ${url}`);
    return null;
  } catch (err) {
    console.warn(`[Supabase] Cache check failed:`, err.message);
    return null;
  }
}

/**
 * Save raw scraped content (upsert on URL conflict)
 * @param {string} url
 * @param {string} rawMarkdown
 * @param {number} pageCount
 */
async function saveRaw(url, rawMarkdown, pageCount) {
  const client = getClient();
  if (!client) return;

  const { error } = await client
    .from('scraped_raw')
    .upsert(
      {
        url,
        raw_content: rawMarkdown,
        page_count: pageCount,
        scraped_at: new Date().toISOString(),
      },
      { onConflict: 'url' }
    );

  if (error) throw error;
  console.log(`[Supabase] Raw data saved for ${url}`);
}

/**
 * Save structured analysis result (upsert on URL conflict)
 * @param {string} url
 * @param {object} analysisResult
 */
async function saveStructured(url, analysisResult) {
  const client = getClient();
  if (!client) return;

  const { error } = await client
    .from('scraped_structured')
    .upsert(
      {
        url,
        trust_score:             analysisResult.trustScore,
        risk_level:              analysisResult.risk,
        confidence:              analysisResult.confidence,
        heatmap:                 analysisResult.heatmap,
        site_data:               analysisResult.siteData,
        verdict:                 analysisResult.verdict,
        report:                  analysisResult.report,
        recommendation:          analysisResult.recommendation,
        explain_like_grandmother: analysisResult.explainLikeGrandmother,
        red_flags:               analysisResult.redFlags,
        positive_findings:       analysisResult.positiveFindings,
        products:                analysisResult.products,
        timestamp:               new Date().toISOString(),
      },
      { onConflict: 'url' }
    );

  if (error) throw error;
  console.log(`[Supabase] Structured data saved for ${url}`);
}

/**
 * Save both raw and structured data. Errors are logged but never thrown.
 * @param {string} url
 * @param {string} rawMarkdown
 * @param {number} pageCount
 * @param {object} analysisResult
 */
async function saveResults(url, rawMarkdown, pageCount, analysisResult) {
  try {
    await saveRaw(url, rawMarkdown, pageCount);
  } catch (err) {
    console.error(`[Supabase] Failed to save raw data:`, err.message);
  }

  try {
    await saveStructured(url, analysisResult);
  } catch (err) {
    console.error(`[Supabase] Failed to save structured data:`, err.message);
  }
}

module.exports = { checkCache, saveRaw, saveStructured, saveResults };
