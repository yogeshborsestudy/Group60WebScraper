/* ============================================================
   GROUP60 — THE INVESTIGATOR — Excel Generator Utility
   Converts normalized ScamShield AI investigation JSON into
   a formatted multi-sheet Excel (.xlsx) file.
   ============================================================ */

const XLSX = require('xlsx');

/**
 * Generate a binary Excel buffer from the investigation data.
 * @param {Object} data Normalized investigation data object
 * @returns {Buffer} XLSX file buffer
 */
function generateExcelBuffer(data) {
  if (!data) {
    throw new Error('No data provided for Excel generation');
  }

  const wb = XLSX.utils.book_new();

  // ── 1. Overview Sheet ──
  const overviewRows = [
    ['METRIC / FIELD', 'VALUE'],
    ['Target Website URL', data.meta?.url || '—'],
    ['Scan Timestamp', data.meta?.timestamp || '—'],
    ['Overall Trust Score', data.trust_score?.overall ?? '—'],
    ['Risk Level', data.trust_score?.risk_level || '—'],
    ['Confidence Score', data.trust_score?.confidence || '—'],
    ['Verdict Summary', data.verdict || '—'],
    ['Final Recommendation', data.recommendation || '—'],
    ['Explain Like My Grandmother', data.explain_like_grandmother || '—'],
    ['', ''], // Empty row spacer
    ['TRUST HEATMAP METRIC', 'SCORE (0-100)'],
    ['Domain Heatmap', data.trust_heatmap?.domain ?? '—'],
    ['Content Heatmap', data.trust_heatmap?.content ?? '—'],
    ['Transparency Heatmap', data.trust_heatmap?.transparency ?? '—'],
    ['Reputation Heatmap', data.trust_heatmap?.reputation ?? '—'],
    ['', ''], // Empty row spacer
    ['SCRAPED SITE SIGNAL', 'VALUE / STATUS'],
    ['Domain Age', data.scraped_site_data?.domain_age || '—'],
    ['Registrar', data.scraped_site_data?.registrar || '—'],
    ['WHOIS Data (DomScan)', data.scraped_site_data?.whois_data || '—'],
    ['Jurisdiction (Firecrawl)', data.scraped_site_data?.jurisdiction || '—'],
    ['SSL Status', data.scraped_site_data?.ssl_status || '—'],
    ['Legal Compliance Check', data.scraped_site_data?.legal_compliance || '—'],
    ['Contact Page', data.scraped_site_data?.contact_page || '—'],
    ['Social Links / Profiles', data.scraped_site_data?.social_links || '—'],
    ['Total Crawled Pages', data.scraped_site_data?.page_count || '—'],
    ['Detected Tech Stack', data.scraped_site_data?.tech_stack || '—'],
  ];

  const wsOverview = XLSX.utils.aoa_to_sheet(overviewRows);
  // Style column widths for readability
  wsOverview['!cols'] = [
    { wch: 30 }, // Column A
    { wch: 75 }  // Column B
  ];
  XLSX.utils.book_append_sheet(wb, wsOverview, 'Overview');

  // ── 2. Investigation Report Sheet ──
  const reportRows = [
    ['SEVERITY', 'OBSERVATION DETAIL']
  ];
  const reports = data.investigation_report || [];
  if (reports.length > 0) {
    reports.forEach(r => {
      reportRows.push([
        (r.type || 'info').toUpperCase(),
        r.text || '—'
      ]);
    });
  } else {
    reportRows.push(['INFO', 'No report statements generated.']);
  }

  const wsReport = XLSX.utils.aoa_to_sheet(reportRows);
  wsReport['!cols'] = [
    { wch: 15 },
    { wch: 90 }
  ];
  XLSX.utils.book_append_sheet(wb, wsReport, 'Investigation Report');

  // ── 3. Key Findings Sheet ──
  const findingsRows = [
    ['FINDING CATEGORY', 'DESCRIPTION']
  ];
  const redFlags = data.red_flags || [];
  const positiveFindings = data.positive_findings || [];

  redFlags.forEach(flag => {
    findingsRows.push(['RED FLAG ⚑', flag]);
  });
  positiveFindings.forEach(finding => {
    findingsRows.push(['POSITIVE FINDING ✓', finding]);
  });

  if (redFlags.length === 0 && positiveFindings.length === 0) {
    findingsRows.push(['SUMMARY', 'No key findings detected.']);
  }

  const wsFindings = XLSX.utils.aoa_to_sheet(findingsRows);
  wsFindings['!cols'] = [
    { wch: 22 },
    { wch: 90 }
  ];
  XLSX.utils.book_append_sheet(wb, wsFindings, 'Key Findings');

  // ── 4. Extracted Data Sheet ──
  const tableLabel = data.extracted_data?.table_label || 'Extracted Data Table';
  const tableHeaders = ['Rank / Index', 'Title', 'Category', 'Price', 'Availability', 'Rating'];
  const extractedRows = [
    [tableLabel.toUpperCase()],
    [], // Empty row spacer
    tableHeaders
  ];

  const extRows = data.extracted_data?.rows || [];
  if (extRows.length > 0) {
    extRows.forEach((row, idx) => {
      extractedRows.push([
        row.rank ?? (idx + 1),
        row.title || '—',
        row.category || '—',
        row.price || '—',
        row.availability || '—',
        row.rating || '—'
      ]);
    });
  } else {
    extractedRows.push(['—', 'No product or table listings extracted from this site.', '—', '—', '—', '—']);
  }

  const wsExtracted = XLSX.utils.aoa_to_sheet(extractedRows);
  wsExtracted['!cols'] = [
    { wch: 15 },
    { wch: 45 },
    { wch: 22 },
    { wch: 15 },
    { wch: 20 },
    { wch: 15 }
  ];
  XLSX.utils.book_append_sheet(wb, wsExtracted, 'Extracted Data');

  // Write workbook as node buffer
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = {
  generateExcelBuffer
};
