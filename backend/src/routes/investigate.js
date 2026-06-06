/* ============================================================
   GROUP60 — THE INVESTIGATOR — Investigate Route
   POST /api/investigate
   ============================================================ */

const express = require('express');
const router = express.Router();
const firecrawlService = require('../services/firecrawl');
const openaiService = require('../services/openai');
const supabaseService = require('../services/supabase');
const sslChecker = require('../services/sslChecker');
const domscanService = require('../services/domscan');
const excelGenerator = require('../utils/excelGenerator');


/**
 * Validate that a string is a valid URL
 */
function isValidUrl(str) {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Normalize the raw OpenAI response into the canonical { investigation } shape.
 * GPT-4o may return either the wrapped form { investigation: {...} }
 * or a bare flat object — handle both gracefully.
 */
function normalizeAnalysis(raw, fallbackUrl) {
  // Already in the new nested format
  if (raw && raw.investigation) {
    return raw.investigation;
  }

  // Legacy flat format — remap to the new shape
  return {
    meta: {
      url: fallbackUrl,
      status: 'Investigation complete',
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: true }),
      agent_status: 'Agent Online',
    },
    trust_score: {
      overall:    raw.trustScore ?? 0,
      risk_level: raw.risk       ?? 'Unknown',
      confidence: raw.confidence ?? 'Low',
    },
    trust_heatmap: {
      domain:       raw.heatmap?.domain       ?? 0,
      content:      raw.heatmap?.content      ?? 0,
      transparency: raw.heatmap?.transparency ?? 0,
      reputation:   raw.heatmap?.reputation   ?? 0,
    },
    scraped_site_data: {
      domain_age:   raw.siteData?.domain_age  ?? raw.siteData?.domainAge   ?? null,
      registrar:    raw.siteData?.registrar   ?? null,
      contact_page: raw.siteData?.contact_page ?? raw.siteData?.contactPage ?? 'Not found',
      page_count:   raw.siteData?.page_count  ?? raw.siteData?.pageCount   ?? null,
      ssl_status:       raw.siteData?.ssl_status       ?? raw.siteData?.sslStatus       ?? null,
      legal_compliance: raw.siteData?.legal_compliance ?? raw.siteData?.legalCompliance ?? raw.siteData?.whois_data ?? raw.siteData?.whoisData ?? null,
      whois_data:       raw.siteData?.whois_data       ?? raw.siteData?.whoisData       ?? raw.siteData?.legal_compliance ?? raw.siteData?.legalCompliance ?? null,
      social_links:     raw.siteData?.social_links     ?? raw.siteData?.socialLinks     ?? 'None detected',
      tech_stack:   raw.siteData?.tech_stack  ?? raw.siteData?.techStack   ?? 'Unknown',
    },
    verdict: raw.verdict ?? '',
    investigation_report: (raw.report || []).map(r => ({ type: r.type, text: r.text })),
    recommendation: raw.recommendation ?? 'Verify Independently',
    extracted_data: {
      table_label:  'Extracted Products Table',
      record_count: (raw.products || []).length,
      timestamp:    new Date().toLocaleTimeString('en-US', { hour12: true }),
      columns:      ['title', 'category', 'price', 'availability', 'rating'],
      rows: (raw.products || []).map((p, i) => ({
        rank:         i + 1,
        title:        p.title        ?? '—',
        category:     p.category     ?? '',
        price:        p.price        ?? '',
        availability: p.stock ?? p.availability ?? '',
        rating:       p.rating       ?? '',
      })),
    },
    explain_like_grandmother: raw.explainLikeGrandmother ?? '',
    positive_findings: raw.positiveFindings ?? [],
    red_flags:         raw.redFlags         ?? [],
  };
}

/**
 * POST /api/investigate
 * Body: { url: "https://example.com" }
 */
router.post('/investigate', async (req, res) => {
  const startTime = Date.now();

  try {
    // ── 1. Validate URL ──
    const { url, bypassCache } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        error: 'Missing URL',
        message: 'Please provide a valid URL in the request body.',
      });
    }

    const trimmedUrl = url.trim();

    if (!isValidUrl(trimmedUrl)) {
      return res.status(400).json({
        error: 'Invalid URL',
        message: 'The provided URL is not valid. Please include the protocol (https://).',
      });
    }

    console.log(`\n[Investigate] Starting investigation for: ${trimmedUrl}`);

    // ── 2. Check Supabase cache ──
    let cached = null;
    if (!bypassCache) {
      console.log(`[Investigate] Checking cache...`);
      cached = await supabaseService.checkCache(trimmedUrl);
    } else {
      console.log(`[Investigate] Cache bypass requested. Forcing fresh scan.`);
    }

    if (cached) {
      const elapsed = Date.now() - startTime;
      console.log(`[Investigate] Returning cached result (${elapsed}ms)`);
      // Normalize cached data to new format if needed
      const normalized = normalizeAnalysis(cached, trimmedUrl);
      return res.json({ cached: true, data: normalized });
    }

    // ── 3. Scrape with Firecrawl, check SSL, and query DomScan in parallel ──
    console.log(`[Investigate] No cache hit. Starting Firecrawl, SSL, and DomScan investigations...`);
    let scrapedData;
    let sslResult;
    let domscanResult;
    try {
      const results = await Promise.all([
        firecrawlService.investigateSite(trimmedUrl),
        sslChecker.checkSSL(trimmedUrl),
        domscanService.getDomainProfile(trimmedUrl)
      ]);
      scrapedData = results[0];
      sslResult = results[1];
      domscanResult = results[2];
      
      // Attach SSL and DomScan results to scrapedData to pass it down the pipeline
      scrapedData.sslResult = sslResult;
      scrapedData.domscanResult = domscanResult;
    } catch (err) {
      console.error(`[Investigate] Scraping/crawling phase error:`, err.message);
      return res.status(502).json({
        error: 'Scraping failed',
        message: 'Unable to scrape the target website. The site may be blocking automated access or is temporarily unavailable.',
      });
    }

    // ── 4. Analyze with OpenAI ──
    console.log(`[Investigate] Starting GPT-4o analysis...`);
    let analysisResult;
    try {
      analysisResult = await openaiService.analyzeAndScore(scrapedData);
    } catch (err) {
      console.error(`[Investigate] OpenAI error:`, err.message);
      return res.status(502).json({
        error: 'Analysis failed',
        message: 'The AI analysis engine encountered an error. Please try again in a moment.',
      });
    }

    // ── 5. Normalize to canonical format ──
    const normalized = normalizeAnalysis(analysisResult, trimmedUrl);

    // ── 6. Save to Supabase (non-blocking) ──
    console.log(`[Investigate] Saving results to database...`);
    supabaseService.saveResults(
      trimmedUrl,
      scrapedData.rawMarkdown,
      scrapedData.pageCount,
      // Save the flat/legacy-compatible object for Supabase (backward compat)
      analysisResult
    ).catch(err => {
      console.error(`[Investigate] Save failed (non-critical):`, err.message);
    });

    // ── 7. Return normalized result ──
    const elapsed = Date.now() - startTime;
    console.log(`[Investigate] Complete in ${elapsed}ms. Trust score: ${normalized.trust_score?.overall}`);

    return res.json({ cached: false, data: normalized });

  } catch (err) {
    console.error(`[Investigate] Unexpected error:`, err);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred. Please try again.',
    });
  }
});

/**
 * POST /api/export-excel
 * Body: { data: <normalized-investigation-data> }
 */
router.post('/export-excel', (req, res) => {
  try {
    const { data } = req.body;
    if (!data) {
      return res.status(400).json({
        error: 'Missing data',
        message: 'No investigation data provided to export.',
      });
    }

    const excelBuffer = excelGenerator.generateExcelBuffer(data);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="scamshield-investigation.xlsx"'
    );
    return res.send(excelBuffer);
  } catch (err) {
    console.error(`[Export Excel] Error generating file:`, err);
    return res.status(500).json({
      error: 'Export failed',
      message: 'An error occurred while generating the Excel spreadsheet.',
    });
  }
});

module.exports = router;

