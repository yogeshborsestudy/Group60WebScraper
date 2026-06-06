/* ============================================================
   GROUP60 — THE INVESTIGATOR — Application Logic
   ScamShield AI — Fully wired to /api/investigate.
   Handles: trust score, heatmap, site data, verdict,
   report, red flags, positive findings, recommendation,
   grandmother explain modal, product table, JSON viewer.
   ============================================================ */

(function () {
    'use strict';

    // ── Theme Init & Toggle ──
    const themeToggle = document.getElementById('theme-toggle');
    const currentTheme = localStorage.getItem('theme') || 'dark';

    if (currentTheme === 'light') {
        document.body.classList.add('light-theme');
    }

    // ── DOM Refs ──
    const inputUrl         = document.getElementById('input-url');
    const btnInvestigate   = document.getElementById('btn-investigate');
    const statusDot        = document.getElementById('status-dot');
    const statusText       = document.getElementById('status-text');
    const progressFill     = document.getElementById('status-progress-fill');
    const scoreValue       = document.getElementById('score-value');
    const scoreArc         = document.getElementById('score-arc');
    const riskBadge        = document.getElementById('risk-badge');
    const confidenceBadge  = document.getElementById('confidence-badge');
    const verdictText      = document.getElementById('verdict-text');
    const reportList       = document.getElementById('report-list');
    const redFlagsList     = document.getElementById('red-flags-list');
    const positiveList     = document.getElementById('positive-list');
    const recBadge         = document.getElementById('rec-badge');
    const tableMeta        = document.getElementById('table-meta');
    const tableLabel       = document.getElementById('table-label');
    const tableHead        = document.getElementById('table-head');
    const tableBody        = document.getElementById('table-body');
    const btnExport        = document.getElementById('btn-export');
    const btnExplain       = document.getElementById('btn-explain');
    const btnJson          = document.getElementById('btn-json');
    const jsonModal        = document.getElementById('json-modal');
    const jsonOutput       = document.getElementById('json-output');
    const modalClose       = document.getElementById('modal-close');
    const explainModal     = document.getElementById('explain-modal');
    const explainText      = document.getElementById('explain-text');
    const explainModalClose = document.getElementById('explain-modal-close');
    const agentStatusText  = document.getElementById('agent-status-text');
    const headerClock      = document.getElementById('header-clock');
    const footerClock      = document.getElementById('footer-clock');

    // Heatmap refs
    const heatFills = {
        domain:       document.getElementById('heatmap-fill-domain'),
        content:      document.getElementById('heatmap-fill-content'),
        transparency: document.getElementById('heatmap-fill-transparency'),
        reputation:   document.getElementById('heatmap-fill-reputation'),
    };
    const heatVals = {
        domain:       document.getElementById('heatmap-val-domain'),
        content:      document.getElementById('heatmap-val-content'),
        transparency: document.getElementById('heatmap-val-transparency'),
        reputation:   document.getElementById('heatmap-val-reputation'),
    };

    // Data grid refs
    const dataRefs = {
        domainAge: document.getElementById('data-domain-age'),
        ssl:       document.getElementById('data-ssl'),
        registrar: document.getElementById('data-registrar'),
        legalCompliance: document.getElementById('data-legal-compliance'),
        contact:   document.getElementById('data-contact'),
        social:    document.getElementById('data-social'),
        pages:     document.getElementById('data-pages'),
        tech:      document.getElementById('data-tech'),
        whois:     document.getElementById('data-whois'),
        jurisdiction: document.getElementById('data-jurisdiction'),
    };

    // ── State ──
    let isRunning = false;
    let lastResult = null; // Stores the normalized investigation object

    // ── Status Steps (shown while waiting for API) ──
    const STATUS_STEPS = [
        { text: 'Mapping site structure...',        delay: 0,     pct: 10 },
        { text: 'Scraping pages...',                delay: 2000,  pct: 25 },
        { text: 'Extracting data signals...',       delay: 5000,  pct: 45 },
        { text: 'ScamShield AI analyzing...',       delay: 8000,  pct: 65 },
        { text: 'Generating trust report...',       delay: 12000, pct: 85 },
    ];

    // ── Clock ──
    function updateClock() {
        const now = new Date();
        const t = now.toLocaleTimeString('en-US', { hour12: false });
        if (headerClock) headerClock.textContent = t;
        if (footerClock) footerClock.textContent = t;
    }
    updateClock();
    setInterval(updateClock, 1000);

    // ── Helpers ──
    function setStatus(text, dotCls, pct) {
        statusText.textContent = text;
        statusDot.className = 'status-dot' + (dotCls ? ' ' + dotCls : '');
        if (pct !== undefined) progressFill.style.width = pct + '%';
    }

    function heatColor(val) {
        const isLight = document.body.classList.contains('light-theme');
        if (val <= 20) return isLight ? '#dc2626' : '#ef4444';
        if (val <= 35) return isLight ? '#ea580c' : '#f97316';
        if (val <= 55) return isLight ? '#ca8a04' : '#eab308';
        if (val <= 75) return isLight ? '#65a30d' : '#84cc16';
        return isLight ? '#16a34a' : '#22c55e';
    }

    function stockClass(s) {
        if (!s) return 'out-of-stock';
        var lower = String(s).toLowerCase();
        if (lower.includes('in stock') || lower === 'available') return 'in-stock';
        if (lower.includes('low stock')) return 'low-stock';
        if (lower.includes('out of stock')) return 'out-of-stock';
        // Available / other — treat as in-stock
        if (lower) return 'in-stock';
        return 'out-of-stock';
    }

    function renderStars(r) {
        if (!r) return '—';
        // Already a star string like ★★★★½
        if (typeof r === 'string' && r.includes('★')) return r;
        var rating = parseFloat(r) || 0;
        if (rating === 0) return '—';
        var full = Math.floor(rating);
        var half = rating % 1 >= 0.5 ? 1 : 0;
        var empty = 5 - full - half;
        return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
    }

    function reportIconSymbol(type) {
        if (type === 'warning' || type === 'error' || type === 'warn') return '⚠';
        return '◎';
    }

    function reportIconClass(type) {
        if (type === 'warning' || type === 'warn') return 'warn';
        if (type === 'error') return 'error';
        return 'info';
    }

    /**
     * Map a site data value to a CSS class for coloring
     */
    function siteDataClass(key, value) {
        if (!value) return '';
        var v = String(value).toLowerCase();
        switch (key) {
            case 'domainAge':
                if (v.includes('unknown') || v.includes('requires') || v.includes('null')) return 'warn';
                return '';
            case 'ssl':
                if (v.includes('valid') || v.includes('https')) return 'ok';
                if (v.includes('no https') || v.includes('mismatch')) return 'danger';
                return 'warn';
            case 'registrar':
                if (!v || v.includes('unknown') || v.includes('requires') || v.includes('null')) return 'warn';
                return '';
            case 'legalCompliance':
                if (!v || v.includes('unknown') || v.includes('requires') || v.includes('null')) return 'warn';
                if (v.includes('valid') || v.includes('found')) {
                    if (v.includes('no refund') || v.includes('missing') || v.includes('incomplete')) return 'warn';
                    return 'ok';
                }
                if (v.includes('missing') || v.includes('none')) return 'danger';
                return 'warn';
            case 'contact':
                if (v.includes('found') && !v.includes('not')) return 'ok';
                if (v.includes('not found')) return 'danger';
                return '';
            case 'social':
                if (v === 'none detected') return 'danger';
                return 'ok';
            case 'pages':
                return '';
            case 'tech':
                if (v === 'unknown') return 'warn';
                return 'ok';
            case 'whois':
                if (!v || v.includes('unknown') || v === '—') return 'warn';
                return '';
            case 'jurisdiction':
                if (!v || v.includes('unknown') || v === '—') return 'warn';
                return 'ok';
            default:
                return '';
        }
    }

    /**
     * Map recommendation text to a CSS class
     */
    function recClass(rec) {
        if (!rec) return '';
        var lower = rec.toLowerCase();
        if (lower.includes('proceed normally')) return 'safe';
        if (lower.includes('proceed with caution')) return 'caution';
        if (lower.includes('verify')) return 'caution';
        if (lower.includes('avoid sharing')) return 'warn';
        if (lower.includes('avoid')) return 'avoid';
        return '';
    }

    // ── Animate Score Ring ──
    function animateScore(score) {
        var circumference = 2 * Math.PI * 52; // ~326.73
        var offset = circumference - (score / 100) * circumference;
        scoreArc.style.strokeDashoffset = offset;
        scoreArc.style.stroke = heatColor(score);

        // Animate number counting up
        var current = 0;
        var step = Math.max(1, Math.floor(score / 30));
        var timer = setInterval(function () {
            current += step;
            if (current >= score) {
                current = score;
                clearInterval(timer);
            }
            scoreValue.textContent = current;
        }, 40);
    }

    // ── Animate Heatmap Bars ──
    function animateHeatmap(data) {
        Object.keys(data).forEach(function (key) {
            var val = data[key];
            var fill = heatFills[key];
            var valEl = heatVals[key];
            if (!fill || !valEl) return;

            setTimeout(function () {
                fill.style.width = val + '%';
                fill.style.background = heatColor(val);
                valEl.textContent = val;
                valEl.style.color = heatColor(val);
            }, 200);
        });
    }

    // ── Populate Site Data ──
    // Accepts the new scraped_site_data shape
    function populateSiteData(siteData) {
        if (!siteData) return;

        var mapping = {
            domainAge: siteData.domain_age   || 'Unknown',
            ssl:       siteData.ssl_status   || '—',
            registrar: siteData.registrar    || 'Unknown',
            legalCompliance: siteData.legal_compliance || 'Unknown',
            contact:   siteData.contact_page || '—',
            social:    siteData.social_links || '—',
            pages:     siteData.page_count   || '—',
            tech:      siteData.tech_stack   || '—',
            whois:     siteData.whois_data     || '—',
            jurisdiction: siteData.jurisdiction || 'Unknown',
        };

        Object.keys(mapping).forEach(function (key) {
            var ref = dataRefs[key];
            if (!ref) return;
            ref.textContent = mapping[key];
            var cls = siteDataClass(key, mapping[key]);
            ref.className = 'data-val' + (cls ? ' ' + cls : '');
        });
    }

    // ── Populate Investigation Report ──
    function populateReport(items) {
        reportList.innerHTML = '';
        if (!items || !Array.isArray(items)) return;

        items.forEach(function (item, i) {
            var li = document.createElement('li');
            li.className = 'report-item';
            li.style.animationDelay = (i * 0.06) + 's';
            li.style.animation = 'fadeSlideIn 0.4s cubic-bezier(0.22,1,0.36,1) both';
            li.style.animationDelay = (i * 0.06) + 's';

            // Support both field names: investigation_report items have { type, text }
            var iconType = item.type || item.icon || 'info';
            var iconCls = reportIconClass(iconType);

            li.innerHTML =
                '<span class="report-icon ' + iconCls + '">' + reportIconSymbol(iconType) + '</span>' +
                '<span>' + (item.text || '') + '</span>';
            reportList.appendChild(li);
        });
    }

    // ── Populate Red Flags ──
    function populateRedFlags(flags) {
        redFlagsList.innerHTML = '';
        if (!flags || !Array.isArray(flags) || flags.length === 0) {
            redFlagsList.innerHTML = '<li class="flags-empty">None detected</li>';
            return;
        }
        flags.forEach(function (text, i) {
            var li = document.createElement('li');
            li.textContent = text;
            li.style.animationDelay = (i * 0.05) + 's';
            redFlagsList.appendChild(li);
        });
    }

    // ── Populate Positive Findings ──
    function populatePositiveFindings(findings) {
        positiveList.innerHTML = '';
        if (!findings || !Array.isArray(findings) || findings.length === 0) {
            positiveList.innerHTML = '<li class="flags-empty">None identified</li>';
            return;
        }
        findings.forEach(function (text, i) {
            var li = document.createElement('li');
            li.textContent = text;
            li.style.animationDelay = (i * 0.05) + 's';
            positiveList.appendChild(li);
        });
    }

    // ── Render Extracted Data Table ──
    function renderTable(extractedData) {
        if (!extractedData || !extractedData.rows || extractedData.rows.length === 0) {
            tableHead.innerHTML = '';
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; opacity:0.5">No products or listings detected on this site</td></tr>';
            tableMeta.textContent = '0 records';
            if (tableLabel) tableLabel.textContent = 'EXTRACTED DATA TABLE';
            return;
        }

        // Update label dynamically
        if (tableLabel && extractedData.table_label) {
            tableLabel.textContent = extractedData.table_label.toUpperCase();
        }

        var rows = extractedData.rows;
        var cols = extractedData.columns || ['title', 'category', 'price', 'availability', 'rating'];

        tableHead.innerHTML = '<tr>' +
            '<th>#</th><th>' + cols.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join('</th><th>') + '</th>' +
            '</tr>';
        tableBody.innerHTML = '';

        rows.forEach(function (item, idx) {
            var tr = document.createElement('tr');
            var stock = item.availability || '';
            var rating = item.rating || '';
            var price = item.price || '—';
            var category = item.category || '—';

            tr.innerHTML =
                '<td>' + (item.rank || idx + 1) + '</td>' +
                '<td>' + (item.title || '—') + '</td>' +
                '<td>' + category + '</td>' +
                '<td class="cell-price">' + price + '</td>' +
                '<td><span class="cell-stock ' + stockClass(stock) + '">' + (stock || '—') + '</span></td>' +
                '<td class="cell-rating">' + renderStars(rating) + '</td>';
            tableBody.appendChild(tr);
        });

        var ts = extractedData.timestamp || new Date().toLocaleTimeString();
        tableMeta.textContent = rows.length + ' records · ' + ts;
    }

    // ── Reset all panels to initial state ──
    function resetPanels() {
        scoreValue.textContent = '—';
        scoreArc.style.strokeDashoffset = 326.73;
        riskBadge.textContent = '—';
        riskBadge.className = 'risk-badge';
        if (confidenceBadge) {
            confidenceBadge.textContent = '';
            confidenceBadge.className = 'confidence-badge';
        }
        verdictText.textContent = '—';
        reportList.innerHTML = '';
        redFlagsList.innerHTML = '<li class="flags-empty">No data yet</li>';
        positiveList.innerHTML = '<li class="flags-empty">No data yet</li>';
        recBadge.textContent = '—';
        recBadge.className = 'rec-badge';
        tableBody.innerHTML = '';
        tableHead.innerHTML = '';
        tableMeta.textContent = '';
        if (tableLabel) tableLabel.textContent = 'EXTRACTED DATA TABLE';
        Object.keys(dataRefs).forEach(function (k) {
            dataRefs[k].textContent = '—';
            dataRefs[k].className = 'data-val';
        });
        Object.keys(heatFills).forEach(function (k) {
            heatFills[k].style.width = '0%';
            heatVals[k].textContent = '—';
            heatVals[k].style.color = '';
        });
        btnExport.classList.remove('exported');
        btnExport.innerHTML =
            '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>' +
            '<polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>' +
            '</svg> Export as Excel File';
    }

    // ── Populate UI with the normalized investigation object ──
    // Expected: the `data` field from the API, which is the `investigation` sub-object
    function populateUI(inv) {
        // ── Trust Score ──
        var score = inv.trust_score?.overall ?? 0;
        animateScore(score);

        // Risk badge
        setTimeout(function () {
            riskBadge.textContent = inv.trust_score?.risk_level || '—';
            if (score <= 39)      riskBadge.className = 'risk-badge high';
            else if (score <= 74) riskBadge.className = 'risk-badge medium';
            else                  riskBadge.className = 'risk-badge low';

            // Confidence badge
            if (confidenceBadge && inv.trust_score?.confidence) {
                confidenceBadge.textContent = 'Confidence: ' + inv.trust_score.confidence;
                confidenceBadge.className = 'confidence-badge visible';
            }
        }, 300);

        // ── Heatmap ──
        if (inv.trust_heatmap) {
            animateHeatmap(inv.trust_heatmap);
        }

        // ── Site Data ──
        setTimeout(function () { populateSiteData(inv.scraped_site_data); }, 400);

        // ── Verdict ──
        setTimeout(function () {
            verdictText.textContent = inv.verdict || '—';
        }, 500);

        // ── Investigation Report ──
        setTimeout(function () {
            populateReport(inv.investigation_report);
        }, 600);

        // ── Red Flags ──
        setTimeout(function () {
            populateRedFlags(inv.red_flags);
        }, 650);

        // ── Positive Findings ──
        setTimeout(function () {
            populatePositiveFindings(inv.positive_findings);
        }, 700);

        // ── Recommendation ──
        setTimeout(function () {
            var rec = inv.recommendation || '—';
            recBadge.textContent = rec;
            recBadge.className = 'rec-badge ' + recClass(rec);
        }, 750);

        // ── Extraction Table ──
        setTimeout(function () {
            renderTable(inv.extracted_data);
        }, 850);
    }

    // ── Run Investigation (real API call) ──
    function runInvestigation() {
        if (isRunning) return;

        var url = inputUrl.value.trim();
        if (!url) {
            inputUrl.focus();
            return;
        }

        // Basic client-side URL validation
        try {
            var parsed = new URL(url);
            if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
                setStatus('Error: URL must start with http:// or https://', 'error', 0);
                return;
            }
        } catch (e) {
            setStatus('Error: Please enter a valid URL', 'error', 0);
            return;
        }

        isRunning = true;
        lastResult = null;
        btnInvestigate.classList.add('running');
        btnInvestigate.querySelector('span').textContent = 'Investigating...';

        // Reset panels
        resetPanels();

        // Show initial status
        setStatus('Initializing ScamShield AI investigation...', 'active', 2);

        // Start timed status messages
        var statusTimers = [];
        STATUS_STEPS.forEach(function (step) {
            var timer = setTimeout(function () {
                if (isRunning) {
                    setStatus(step.text, 'active', step.pct);
                }
            }, step.delay);
            statusTimers.push(timer);
        });

        const cacheToggle = document.getElementById('cache-toggle');
        const bypassCache = cacheToggle ? !cacheToggle.checked : false;

        // Make API call
        fetch('/api/investigate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: url, bypassCache: bypassCache }),
        })
        .then(function (response) {
            if (!response.ok) {
                return response.json().then(function (errData) {
                    throw new Error(errData.message || 'Investigation failed (HTTP ' + response.status + ')');
                });
            }
            return response.json();
        })
        .then(function (result) {
            // Clear status timers
            statusTimers.forEach(clearTimeout);

            // result.data IS the normalized investigation object
            var inv = result.data;
            lastResult = inv;

            var score = inv.trust_score?.overall ?? 0;
            var cacheMsg = result.cached ? ' (cached)' : '';
            setStatus(
                'Investigation complete' + cacheMsg + ' — Trust Score: ' + score + '/100',
                'done',
                100
            );

            // Populate all UI panels
            populateUI(inv);

            // Re-enable button
            setTimeout(function () {
                isRunning = false;
                btnInvestigate.classList.remove('running');
                btnInvestigate.querySelector('span').textContent = 'Investigate';
            }, 900);
        })
        .catch(function (err) {
            // Clear status timers
            statusTimers.forEach(clearTimeout);

            console.error('[Investigation Error]', err);
            setStatus('Error: ' + err.message, 'error', 0);

            isRunning = false;
            btnInvestigate.classList.remove('running');
            btnInvestigate.querySelector('span').textContent = 'Investigate';
        });
    }

    // ── Explain like grandmother → open modal ──
    function handleExplain() {
        if (lastResult && lastResult.explain_like_grandmother) {
            explainText.textContent = lastResult.explain_like_grandmother;
        } else {
            explainText.textContent = 'No explanation available yet. Run an investigation first!';
        }
        explainModal.classList.remove('hidden');
    }

    // ── Export ──
    function handleExport() {
        if (!lastResult) {
            alert('No investigation data to export. Run an investigation first.');
            return;
        }

        btnExport.classList.add('exporting');
        btnExport.innerHTML = 'Exporting...';

        fetch('/api/export-excel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: lastResult }),
        })
        .then(function (res) {
            if (!res.ok) throw new Error('Export failed');
            return res.blob();
        })
        .then(function (blob) {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const cleanUrl = lastResult.meta?.url 
                ? lastResult.meta.url.replace(/^https?:\/\//i, '').replace(/[^a-z0-9]/gi, '_') 
                : 'report';
            a.download = `scamshield_${cleanUrl}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            btnExport.classList.remove('exporting');
            btnExport.classList.add('exported');
            btnExport.innerHTML =
                '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                '<polyline points="20 6 9 17 4 12"/>' +
                '</svg> Exported ✓';

            // Reset after 3 seconds
            setTimeout(function () {
                btnExport.classList.remove('exported');
                btnExport.innerHTML =
                    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>' +
                    '<polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>' +
                    '</svg> Export as Excel File';
            }, 3000);
        })
        .catch(function (err) {
            console.error(err);
            btnExport.classList.remove('exporting');
            btnExport.innerHTML = 'Error!';
            setTimeout(function () {
                btnExport.innerHTML =
                    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>' +
                    '<polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>' +
                    '</svg> Export as Excel File';
            }, 3000);
        });
    }

    // ── JSON Modal ──
    function showJson() {
        var data;
        if (lastResult) {
            data = lastResult;
        } else {
            data = { message: 'No investigation data available. Run an investigation first.' };
        }
        jsonOutput.textContent = JSON.stringify(data, null, 2);
        jsonModal.classList.remove('hidden');
    }

    function hideJson() {
        jsonModal.classList.add('hidden');
    }

    function hideExplain() {
        explainModal.classList.add('hidden');
    }

    // ── Events ──
    btnInvestigate.addEventListener('click', runInvestigation);
    btnExplain.addEventListener('click', handleExplain);
    btnExport.addEventListener('click', handleExport);
    btnJson.addEventListener('click', showJson);
    modalClose.addEventListener('click', hideJson);
    jsonModal.addEventListener('click', function (e) {
        if (e.target === jsonModal) hideJson();
    });
    if (explainModalClose) {
        explainModalClose.addEventListener('click', hideExplain);
    }
    if (explainModal) {
        explainModal.addEventListener('click', function (e) {
            if (e.target === explainModal) hideExplain();
        });
    }
    inputUrl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') runInvestigation();
    });

    // Theme toggle
    if (themeToggle) {
        themeToggle.addEventListener('click', function () {
            document.body.classList.toggle('light-theme');
            const theme = document.body.classList.contains('light-theme') ? 'light' : 'dark';
            localStorage.setItem('theme', theme);

            // Update dynamic visual element colors immediately
            const scoreText = scoreValue.textContent;
            if (scoreText && scoreText !== '—') {
                const score = parseInt(scoreText, 10);
                if (!isNaN(score)) {
                    scoreArc.style.stroke = heatColor(score);
                }
            }

            ['domain', 'content', 'transparency', 'reputation'].forEach(function (key) {
                const fill = heatFills[key];
                const valEl = heatVals[key];
                if (fill && valEl && valEl.textContent !== '—') {
                    const val = parseInt(valEl.textContent, 10);
                    if (!isNaN(val)) {
                        fill.style.background = heatColor(val);
                        valEl.style.color = heatColor(val);
                    }
                }
            });
        });
    }

})();
