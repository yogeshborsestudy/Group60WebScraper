/* ============================================================
   GROUP60 — THE INVESTIGATOR — Trust Score Calculator
   Fallback scorer if GPT-4o doesn't return valid scores.
   ============================================================ */

/**
 * Calculate trust scores from scraped signals.
 * Used as a fallback if GPT-4o fails to provide valid numeric scores.
 *
 * @param {object} scrapedData - Output from firecrawl.investigateSite()
 * @returns {object} - { trustScore, heatmap: { domain, content, transparency, reputation } }
 */
function calculateTrustScore(scrapedData) {
  // ── Domain Score (0–100) ──
  let domainScore = 50; // base
  if (scrapedData.pageCount > 20) domainScore += 15;
  else if (scrapedData.pageCount > 5) domainScore += 8;
  else domainScore -= 10;

  if (scrapedData.sslStatus === 'Valid HTTPS') domainScore += 15;
  else domainScore -= 20;

  if (scrapedData.techStack && scrapedData.techStack !== 'Unknown') domainScore += 10;

  // ── Content Score (0–100) ──
  let contentScore = 60; // base
  if (scrapedData.urgencyLanguage) contentScore -= 20;
  if (scrapedData.guaranteeLanguage) contentScore -= 10;
  if (scrapedData.products && scrapedData.products.length > 0) contentScore += 10;
  if (scrapedData.rawMarkdown && scrapedData.rawMarkdown.length > 2000) contentScore += 5;

  // ── Transparency Score (0–100) ──
  let transparencyScore = 20; // start low, add for signals
  if (scrapedData.hasPrivacyPolicy) transparencyScore += 15;
  if (scrapedData.hasTermsOfService) transparencyScore += 15;
  if (scrapedData.hasRefundPolicy) transparencyScore += 15;
  if (scrapedData.contactPageFound) transparencyScore += 15;
  if (scrapedData.physicalAddress) transparencyScore += 15;
  if (scrapedData.contactEmail) transparencyScore += 5;

  // ── Reputation Score (0–100) ──
  let reputationScore = 40; // base
  if (scrapedData.socialLinks && scrapedData.socialLinks !== 'None detected') {
    const socialCount = scrapedData.socialLinks.split(',').length;
    reputationScore += Math.min(socialCount * 10, 30);
  }
  if (scrapedData.businessName) reputationScore += 15;

  // Clamp all scores to 0–100
  domainScore = Math.max(0, Math.min(100, domainScore));
  contentScore = Math.max(0, Math.min(100, contentScore));
  transparencyScore = Math.max(0, Math.min(100, transparencyScore));
  reputationScore = Math.max(0, Math.min(100, reputationScore));

  const trustScore = Math.round((domainScore + contentScore + transparencyScore + reputationScore) / 4);

  return {
    trustScore,
    heatmap: {
      domain: domainScore,
      content: contentScore,
      transparency: transparencyScore,
      reputation: reputationScore,
    },
  };
}

/**
 * Determine risk level from trust score
 * @param {number} score
 * @returns {string}
 */
function getRiskLevel(score) {
  if (score >= 80) return 'Very Safe';
  if (score >= 65) return 'Safe';
  if (score >= 45) return 'Moderate Risk';
  if (score >= 30) return 'High Risk';
  if (score >= 15) return 'Very High Risk';
  return 'Critical Risk';
}

module.exports = { calculateTrustScore, getRiskLevel };
