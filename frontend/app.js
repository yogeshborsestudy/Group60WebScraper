/* ============================================================
   GROUP60 — THE INVESTIGATOR — Application Logic
   Trust analysis simulation, heatmap, score ring, report,
   product extraction table, JSON viewer, export.
   ============================================================ */

(function () {
    'use strict';

    // ── DOM Refs ──
    const inputUrl       = document.getElementById('input-url');
    const btnInvestigate = document.getElementById('btn-investigate');
    const statusDot      = document.getElementById('status-dot');
    const statusText     = document.getElementById('status-text');
    const progressFill   = document.getElementById('status-progress-fill');
    const scoreValue     = document.getElementById('score-value');
    const scoreArc       = document.getElementById('score-arc');
    const riskBadge      = document.getElementById('risk-badge');
    const verdictText    = document.getElementById('verdict-text');
    const reportList     = document.getElementById('report-list');
    const recBadge       = document.getElementById('rec-badge');
    const tableMeta      = document.getElementById('table-meta');
    const tableHead      = document.getElementById('table-head');
    const tableBody      = document.getElementById('table-body');
    const btnExport      = document.getElementById('btn-export');
    const btnExplain     = document.getElementById('btn-explain');
    const btnJson        = document.getElementById('btn-json');
    const jsonModal      = document.getElementById('json-modal');
    const jsonOutput     = document.getElementById('json-output');
    const modalClose     = document.getElementById('modal-close');
    const headerClock    = document.getElementById('header-clock');
    const footerClock    = document.getElementById('footer-clock');

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
        whois:     document.getElementById('data-whois'),
        contact:   document.getElementById('data-contact'),
        social:    document.getElementById('data-social'),
        pages:     document.getElementById('data-pages'),
        tech:      document.getElementById('data-tech'),
    };

    // ── Mock Investigation Data ──
    const INVESTIGATION = {
        score: 23,
        risk: 'High risk',
        heatmap: {
            domain: 18,
            content: 31,
            transparency: 12,
            reputation: 22,
        },
        siteData: {
            domainAge:  { text: '11 days',               cls: 'danger' },
            ssl:        { text: 'Mismatch detected',     cls: 'danger' },
            registrar:  { text: 'NameCheap Inc.',         cls: '' },
            whois:      { text: 'Privacy-protected',     cls: 'warn' },
            contact:    { text: 'Not found',             cls: 'danger' },
            social:     { text: 'None detected',         cls: 'danger' },
            pages:      { text: '14 pages crawled',      cls: '' },
            tech:       { text: 'Shopify, Cloudflare',   cls: 'ok' },
        },
        verdict: 'Likely fraudulent. Domain registered 11 days ago. No WHOIS data. SSL certificate mismatch detected. No physical address or contact page found.',
        report: [
            { icon: 'warn',  text: 'Domain registered 11 days ago — very new for a shopping site' },
            { icon: 'error', text: 'SSL certificate does not match domain name' },
            { icon: 'warn',  text: 'No physical address or contact page found' },
            { icon: 'info',  text: 'No social media presence detected' },
            { icon: 'warn',  text: 'WHOIS registration data is privacy-protected' },
            { icon: 'error', text: 'Product images appear to be stolen from other retailers' },
            { icon: 'info',  text: 'Prices are 60-80% below market average for listed products' },
        ],
        recommendation: {
            text: '⊘ Avoid this site',
            cls: 'avoid',
        },
    };

    // ── Mock Products ──
    const PRODUCTS = [
        { id: 1,  title: 'Quantum X-200 Wireless Headset',        price: '$149.99', stock: 'In Stock',     rating: 4.7, category: 'Audio' },
        { id: 2,  title: 'Vortex-8 Mechanical Keyboard',          price: '$89.50',  stock: 'Low Stock',    rating: 4.5, category: 'Peripherals' },
        { id: 3,  title: 'Horizon 27" 4K IPS Monitor',            price: '$329.99', stock: 'In Stock',     rating: 4.8, category: 'Displays' },
        { id: 4,  title: 'NovaDrive 1TB NVMe SSD',                price: '$74.99',  stock: 'In Stock',     rating: 4.9, category: 'Storage' },
        { id: 5,  title: 'Stealth Pro Gaming Mouse',              price: '$59.99',  stock: 'Out of Stock', rating: 4.3, category: 'Peripherals' },
        { id: 6,  title: 'ArcLight 34" Ultrawide Curved Display', price: '$549.00', stock: 'In Stock',     rating: 4.6, category: 'Displays' },
        { id: 7,  title: 'ClearCast USB-C Webcam 4K',             price: '$112.00', stock: 'Low Stock',    rating: 4.2, category: 'Video' },
        { id: 8,  title: 'TitanPad XL Desk Mat',                  price: '$34.99',  stock: 'In Stock',     rating: 4.4, category: 'Accessories' },
        { id: 9,  title: 'ZenBook Laptop Stand Aluminum',         price: '$42.00',  stock: 'In Stock',     rating: 4.1, category: 'Accessories' },
        { id: 10, title: 'HyperThread 32GB DDR5 Kit',             price: '$189.99', stock: 'Low Stock',    rating: 4.7, category: 'Memory' },
    ];

    // ── Status Steps ──
    const STATUS_STEPS = [
        { text: 'Resolving DNS for target domain...',     pct: 5  },
        { text: 'Establishing secure connection...',       pct: 12 },
        { text: 'Mapping site structure...',               pct: 22 },
        { text: 'Crawling page content...',                pct: 32 },
        { text: 'Analyzing DOM and meta tags...',          pct: 42 },
        { text: 'Checking SSL certificate chain...',       pct: 52 },
        { text: 'Querying WHOIS database...',              pct: 60 },
        { text: 'Scanning for social media links...',      pct: 68 },
        { text: 'Extracting product data...',              pct: 76 },
        { text: 'Computing trust heatmap scores...',       pct: 85 },
        { text: 'Generating investigation report...',      pct: 93 },
        { text: 'Investigation complete.',                 pct: 100 },
    ];

    // ── State ──
    let isRunning = false;

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
        if (val <= 20) return '#ef4444';
        if (val <= 35) return '#f97316';
        if (val <= 55) return '#eab308';
        if (val <= 75) return '#84cc16';
        return '#22c55e';
    }

    function stockClass(s) {
        if (s === 'In Stock') return 'in-stock';
        if (s === 'Low Stock') return 'low-stock';
        return 'out-of-stock';
    }

    function renderStars(r) {
        var full = Math.floor(r);
        var half = r % 1 >= 0.5 ? 1 : 0;
        var empty = 5 - full - half;
        return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
    }

    function reportIconSymbol(type) {
        if (type === 'error') return '⚠';
        if (type === 'warn')  return '△';
        return '◎';
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
    function populateSiteData(data) {
        Object.keys(data).forEach(function (key) {
            var ref = dataRefs[key];
            if (!ref) return;
            ref.textContent = data[key].text;
            ref.className = 'data-val' + (data[key].cls ? ' ' + data[key].cls : '');
        });
    }

    // ── Populate Report ──
    function populateReport(items) {
        reportList.innerHTML = '';
        items.forEach(function (item, i) {
            var li = document.createElement('li');
            li.className = 'report-item';
            li.style.animationDelay = (i * 0.06) + 's';
            li.style.animation = 'fadeSlideIn 0.4s cubic-bezier(0.22,1,0.36,1) both';
            li.style.animationDelay = (i * 0.06) + 's';
            li.innerHTML =
                '<span class="report-icon ' + item.icon + '">' + reportIconSymbol(item.icon) + '</span>' +
                '<span>' + item.text + '</span>';
            reportList.appendChild(li);
        });
    }

    // ── Render Products Table ──
    function renderTable(data) {
        tableHead.innerHTML = '<tr>' +
            '<th>#</th><th>Product Title</th><th>Category</th><th>Price</th><th>Availability</th><th>Rating</th>' +
            '</tr>';
        tableBody.innerHTML = '';
        data.forEach(function (item) {
            var tr = document.createElement('tr');
            tr.innerHTML =
                '<td>' + item.id + '</td>' +
                '<td>' + item.title + '</td>' +
                '<td>' + item.category + '</td>' +
                '<td class="cell-price">' + item.price + '</td>' +
                '<td><span class="cell-stock ' + stockClass(item.stock) + '">' + item.stock + '</span></td>' +
                '<td class="cell-rating">' + renderStars(item.rating) + '</td>';
            tableBody.appendChild(tr);
        });
        tableMeta.textContent = data.length + ' records · ' + new Date().toLocaleTimeString();
    }

    // ── Run Investigation ──
    function runInvestigation() {
        if (isRunning) return;

        var url = inputUrl.value.trim();
        if (!url) {
            inputUrl.focus();
            return;
        }

        isRunning = true;
        btnInvestigate.classList.add('running');
        btnInvestigate.querySelector('span').textContent = 'Investigating...';

        // Reset panels
        scoreValue.textContent = '—';
        scoreArc.style.strokeDashoffset = 326.73;
        riskBadge.textContent = '—';
        riskBadge.className = 'risk-badge';
        verdictText.textContent = '—';
        reportList.innerHTML = '';
        recBadge.textContent = '—';
        recBadge.className = 'rec-badge';
        tableBody.innerHTML = '';
        tableHead.innerHTML = '';
        tableMeta.textContent = '';
        Object.keys(dataRefs).forEach(function (k) {
            dataRefs[k].textContent = '—';
            dataRefs[k].className = 'data-val';
        });
        Object.keys(heatFills).forEach(function (k) {
            heatFills[k].style.width = '0%';
            heatVals[k].textContent = '—';
        });
        btnExport.classList.remove('exported');
        btnExport.querySelector('span') && (btnExport.textContent = '');
        // Rebuild export button text
        btnExport.innerHTML =
            '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>' +
            '<polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>' +
            '</svg> Export to Google Sheets';

        // Animate status steps
        var stepIndex = 0;

        function nextStep() {
            if (stepIndex >= STATUS_STEPS.length) {
                finishInvestigation();
                return;
            }
            var s = STATUS_STEPS[stepIndex];
            setStatus(s.text, 'active', s.pct);
            stepIndex++;
            setTimeout(nextStep, 350 + Math.random() * 400);
        }

        setStatus('Initializing investigation agent...', 'active', 1);
        setTimeout(nextStep, 500);
    }

    function finishInvestigation() {
        var inv = INVESTIGATION;
        setStatus('Investigation complete — Trust Score: ' + inv.score + '/100', 'done', 100);

        // Animate score ring
        animateScore(inv.score);

        // Risk badge
        setTimeout(function () {
            riskBadge.textContent = inv.risk;
            if (inv.score <= 30) riskBadge.className = 'risk-badge high';
            else if (inv.score <= 60) riskBadge.className = 'risk-badge medium';
            else riskBadge.className = 'risk-badge low';
        }, 300);

        // Heatmap
        animateHeatmap(inv.heatmap);

        // Site data
        setTimeout(function () { populateSiteData(inv.siteData); }, 400);

        // Verdict
        setTimeout(function () { verdictText.textContent = inv.verdict; }, 500);

        // Report
        setTimeout(function () { populateReport(inv.report); }, 600);

        // Recommendation
        setTimeout(function () {
            recBadge.textContent = inv.recommendation.text;
            recBadge.className = 'rec-badge ' + inv.recommendation.cls;
        }, 700);

        // Products table
        setTimeout(function () { renderTable(PRODUCTS); }, 800);

        // Re-enable button
        setTimeout(function () {
            isRunning = false;
            btnInvestigate.classList.remove('running');
            btnInvestigate.querySelector('span').textContent = 'Investigate';
        }, 900);
    }

    // ── Explain (mock) ──
    function handleExplain() {
        verdictText.textContent =
            'Sweetheart, this website is like a pop-up shop that appeared overnight in a parking lot. ' +
            'It\'s only been around for 11 days — real stores have been around for years! ' +
            'The security lock on their door doesn\'t even match their sign, which is like a store ' +
            'with a different name on the receipt. There\'s no phone number, no address, and nobody on ' +
            'social media has ever heard of them. My advice? Walk away, dear. Don\'t give them your money.';
    }

    // ── Export ──
    function handleExport() {
        btnExport.classList.add('exported');
        btnExport.innerHTML =
            '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<polyline points="20 6 9 17 4 12"/>' +
            '</svg> Exported ✓';
    }

    // ── JSON Modal ──
    function showJson() {
        var data = {
            url: inputUrl.value,
            trustScore: INVESTIGATION.score,
            risk: INVESTIGATION.risk,
            heatmap: INVESTIGATION.heatmap,
            verdict: INVESTIGATION.verdict,
            recommendation: INVESTIGATION.recommendation.text,
            report: INVESTIGATION.report.map(function (r) { return r.text; }),
            products: PRODUCTS,
        };
        jsonOutput.textContent = JSON.stringify(data, null, 2);
        jsonModal.classList.remove('hidden');
    }

    function hideJson() {
        jsonModal.classList.add('hidden');
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
    inputUrl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') runInvestigation();
    });

})();
