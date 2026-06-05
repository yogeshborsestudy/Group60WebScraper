/**
 * REFINERY.IO - INTERACTIVE CONTROL ENGINE
 * Frontend application logic, simulations, and data handlers
 */

class RefineryApp {
    constructor() {
        this.activeTab = 'dashboard';
        this.selectorFields = [];
        this.scrapedData = [];
        this.isScraping = false;
        
        // Default preset configurations
        this.presets = {
            ecommerce: {
                name: 'E-Commerce Prices (Product Scraper)',
                url: 'https://example-shopping-site.com/products',
                method: 'PUPPETEER',
                fields: [
                    { id: 'f1', name: 'product_name', selector: '.product-card .product-title', type: 'text' },
                    { id: 'f2', name: 'price', selector: '.product-card .price', type: 'text' },
                    { id: 'f3', name: 'image_url', selector: '.product-card img', type: 'attr:src' },
                    { id: 'f4', name: 'availability', selector: '.product-card .stock-tag', type: 'text' }
                ],
                mockData: [
                    { product_name: 'Quantum X-200 Headset', price: '$149.99', image_url: 'https://example-shopping-site.com/assets/headset.jpg', availability: 'In Stock' },
                    { product_name: 'Vortex-8 Mechanical Keyboard', price: '$89.50', image_url: 'https://example-shopping-site.com/assets/keyboard.jpg', availability: 'Low Stock' },
                    { product_name: 'Horizon WideScreen Monitor 27"', price: '$329.99', image_url: 'https://example-shopping-site.com/assets/monitor.jpg', availability: 'Out of Stock' }
                ]
            },
            news: {
                name: 'Global News Feed Crawler',
                url: 'https://news.ycombinator.com',
                method: 'GET',
                fields: [
                    { id: 'fn1', name: 'article_title', selector: '.titleline > a', type: 'text' },
                    { id: 'fn2', name: 'article_url', selector: '.titleline > a', type: 'attr:href' },
                    { id: 'fn3', name: 'subtext_score', selector: '.subtext .score', type: 'text' }
                ],
                mockData: [
                    { article_title: 'Show HN: LiteFS – Replication for SQLite', article_url: 'https://github.com/superbase/litefs', subtext_score: '245 points' },
                    { article_title: 'Refining unstructured data at scale with CSS heuristics', article_url: 'https://refinery.io/blog/css-heuristic-scraping', subtext_score: '188 points' },
                    { article_title: 'Why I still build server-rendered HTML applications in 2026', article_url: 'https://dev.to/html-lover/server-render-2026', subtext_score: '312 points' }
                ]
            },
            custom: {
                name: 'Custom Extraction Node',
                url: 'https://my-target-website.org/list',
                method: 'GET',
                fields: [
                    { id: 'fc1', name: 'title', selector: 'h1', type: 'text' }
                ],
                mockData: [
                    { title: 'Simulated Target Document Heading Node' }
                ]
            }
        };

        // Initialize elements and event listeners
        this.init();
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.bindEvents();
            this.loadPreset('ecommerce'); // Default active preset
            this.updateStatsDisplay();
            this.setupInteractiveCanvas();
        });
    }

    bindEvents() {
        // Tab switching
        document.querySelectorAll('.sidebar-nav .nav-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabId = btn.getAttribute('data-tab');
                this.switchTab(tabId);
            });
        });

        // Preset selector drop down
        const presetSelect = document.getElementById('active-scraper-select');
        presetSelect.addEventListener('change', (e) => {
            const presetId = e.target.value;
            this.loadPreset(presetId);
        });

        // Dynamic builder actions
        document.getElementById('btn-add-selector-field').addEventListener('click', () => this.addSelectorField());
        
        // Execute crawler triggers
        document.getElementById('btn-global-trigger').addEventListener('click', () => this.runSimulation());
        document.getElementById('btn-builder-test-run').addEventListener('click', () => this.runSimulation());
        document.getElementById('btn-quick-run').addEventListener('click', () => {
            const quickUrl = document.getElementById('quick-url-input').value;
            document.getElementById('builder-scraper-url').value = quickUrl;
            this.switchTab('builder');
            this.runSimulation();
        });

        // Collapsible sections
        document.querySelectorAll('.collapsible-section-toggle').forEach(toggle => {
            toggle.addEventListener('click', () => {
                toggle.classList.toggle('active');
            });
        });

        // Exporter hooks
        document.getElementById('btn-export-csv').addEventListener('click', () => this.exportToCSV());
        document.getElementById('btn-export-json').addEventListener('click', () => this.exportToJSON());
        document.getElementById('btn-clear-console').addEventListener('click', () => {
            const screen = document.getElementById('builder-terminal-logs');
            screen.innerHTML = '<p class="term-log-line info">[Refinery Console Cleared]</p><p class="term-log-line"><span class="term-cursor">_</span></p>';
        });

        // Job history view logs buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-view-run-logs')) {
                const jobHash = e.target.getAttribute('data-job');
                this.showJobLogs(jobHash);
            }
            if (e.target.classList.contains('btn-view-run-data')) {
                this.switchTab('explorer');
            }
        });

        // New schedule creator
        document.getElementById('btn-schedule-create').addEventListener('click', () => {
            const cron = document.getElementById('schedule-cron').value;
            const nodeSel = document.getElementById('schedule-node-select');
            const nodeName = nodeSel.options[nodeSel.selectedIndex].text;
            const concurrency = document.getElementById('schedule-concurrency').value;
            
            this.addScheduleRow(nodeName, cron, concurrency);
        });
    }

    switchTab(tabId) {
        this.activeTab = tabId;

        // Navigation visual update
        document.querySelectorAll('.sidebar-nav .nav-item').forEach(btn => {
            if (btn.getAttribute('data-tab') === tabId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Panel toggle
        document.querySelectorAll('.tab-pane').forEach(panel => {
            if (panel.id === `tab-${tabId}`) {
                panel.classList.add('active');
            } else {
                panel.classList.remove('active');
            }
        });

        // Update Headers Titles
        const titles = {
            dashboard: { title: 'Refinery Dashboard', desc: 'Operational status, extraction health, and rapid configuration panels.' },
            builder: { title: 'Scraper Schema Builder', desc: 'Map DOM elements, test HTTP requests, and assemble parsing pipelines.' },
            runs: { title: 'Refinery Process Jobs', desc: 'View complete log traces, execution intervals, and pipeline audits.' },
            explorer: { title: 'Refined Ingestion Explorer', desc: 'Review, filter, and extract compiled data structures.' },
            scheduler: { title: 'Crawler Schedule Manager', desc: 'Automate scraper pipelines using target cron patterns.' }
        };

        if (titles[tabId]) {
            document.getElementById('current-tab-title').textContent = titles[tabId].title;
            document.getElementById('current-tab-desc').textContent = titles[tabId].desc;
        }
    }

    loadPreset(presetId) {
        const preset = this.presets[presetId];
        if (!preset) return;

        // Sync Builder Fields
        document.getElementById('builder-scraper-name').value = preset.name;
        document.getElementById('builder-scraper-url').value = preset.url;
        document.getElementById('builder-request-method').value = preset.method;

        // Sync Selectors Form List
        const listContainer = document.getElementById('selector-fields-list');
        listContainer.innerHTML = '';
        this.selectorFields = [];

        preset.fields.forEach(field => {
            this.addSelectorField(field.name, field.selector, field.type);
        });

        // Sync Explorer mock data initial state
        this.scrapedData = [...preset.mockData];
        this.renderDataTable();
        this.renderJSONPreview();
    }

    addSelectorField(name = '', selector = '', type = 'text') {
        const fieldId = 'f-' + Math.random().toString(36).substr(2, 9);
        const field = { id: fieldId, name, selector, type };
        this.selectorFields.push(field);

        const row = document.createElement('div');
        row.className = 'selector-item-card';
        row.id = fieldId;
        row.innerHTML = `
            <div class="selector-card-header">
                <span class="form-group-custom label">FIELD MAPPING</span>
                <button class="btn-remove-selector" data-id="${fieldId}">✕ Remove</button>
            </div>
            <div class="form-row-2">
                <div class="form-group-custom">
                    <label>FIELD KEY</label>
                    <input type="text" class="field-key-input" value="${name}" placeholder="e.g. price">
                </div>
                <div class="form-group-custom">
                    <label>EXTRACT TYPE</label>
                    <select class="field-type-select">
                        <option value="text" ${type === 'text' ? 'selected' : ''}>Inner Text</option>
                        <option value="attr:href" ${type === 'attr:href' ? 'selected' : ''}>Attribute: href</option>
                        <option value="attr:src" ${type === 'attr:src' ? 'selected' : ''}>Attribute: src</option>
                        <option value="html" ${type === 'html' ? 'selected' : ''}>Outer HTML</option>
                    </select>
                </div>
            </div>
            <div class="form-group-custom">
                <label>CSS SELECTOR PATH</label>
                <input type="text" class="field-selector-input" value="${selector}" placeholder="e.g. .card .price">
            </div>
        `;

        // Bind delete action
        row.querySelector('.btn-remove-selector').addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            this.removeSelectorField(id);
        });

        // Sync changes on input
        row.querySelector('.field-key-input').addEventListener('input', (e) => {
            field.name = e.target.value;
        });
        row.querySelector('.field-selector-input').addEventListener('input', (e) => {
            field.selector = e.target.value;
        });
        row.querySelector('.field-type-select').addEventListener('change', (e) => {
            field.type = e.target.value;
        });

        document.getElementById('selector-fields-list').appendChild(row);
    }

    removeSelectorField(fieldId) {
        this.selectorFields = this.selectorFields.filter(f => f.id !== fieldId);
        const el = document.getElementById(fieldId);
        if (el) el.remove();
    }

    // Set up Hover & Select listener in Simulated Target Page preview
    setupInteractiveCanvas() {
        const canvas = document.getElementById('visual-dom-canvas');
        const tooltip = document.getElementById('dom-selector-tooltip');

        canvas.addEventListener('mousemove', (e) => {
            const target = e.target.closest('.dom-element');
            if (target) {
                const rect = target.getBoundingClientRect();
                const containerRect = canvas.getBoundingClientRect();
                
                // Set tooltip text and position
                const selector = target.getAttribute('data-selector');
                tooltip.textContent = selector;
                tooltip.style.display = 'block';
                tooltip.style.left = `${e.clientX - containerRect.left + canvas.scrollLeft + 15}px`;
                tooltip.style.top = `${e.clientY - containerRect.top + canvas.scrollTop + 15}px`;
            } else {
                tooltip.style.display = 'none';
            }
        });

        canvas.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
        });

        canvas.addEventListener('click', (e) => {
            const target = e.target.closest('.dom-element');
            if (target) {
                e.preventDefault();
                e.stopPropagation();

                // Toggle Selection Class
                canvas.querySelectorAll('.dom-element').forEach(el => el.classList.remove('selected-node'));
                target.classList.add('selected-node');

                // Get selector
                const selector = target.getAttribute('data-selector');
                
                // Autofill the last empty selector field or create a new one
                let targetField = this.selectorFields[this.selectorFields.length - 1];
                if (!targetField) {
                    this.addSelectorField('scraped_field', selector, 'text');
                } else {
                    targetField.selector = selector;
                    const fieldCard = document.getElementById(targetField.id);
                    if (fieldCard) {
                        fieldCard.querySelector('.field-selector-input').value = selector;
                    }
                }

                // Add log output to terminal
                this.logToConsole('builder-terminal-logs', `[EVENT] User selected element Node <${target.tagName.toLowerCase()}> with Selector [${selector}]`, 'success');
            }
        });
    }

    // Interactive Ingestion Crawler Simulation Loop
    runSimulation() {
        if (this.isScraping) return;
        this.isScraping = true;
        this.switchTab('builder');

        const mainTriggerBtn = document.getElementById('btn-global-trigger');
        const builderTriggerBtn = document.getElementById('btn-builder-test-run');
        
        mainTriggerBtn.disabled = true;
        builderTriggerBtn.disabled = true;
        
        const builderLogsScreen = document.getElementById('builder-terminal-logs');
        const dashLogsScreen = document.getElementById('dash-terminal-logs');

        // Clear terminal output
        builderLogsScreen.innerHTML = '';
        
        const targetUrl = document.getElementById('builder-scraper-url').value;
        const method = document.getElementById('builder-request-method').value;
        const headersUa = document.getElementById('builder-ua').value;

        // Sequence of logs
        const logsSequence = [
            { text: `[SYSTEM] Spawning crawler process node...`, type: 'info', delay: 100 },
            { text: `[NETWORK] Connecting to proxy gateway pool...`, type: 'info', delay: 400 },
            { text: `[NETWORK] Tunnel established via Proxy 185.220.101.4:8080`, type: 'success', delay: 800 },
            { text: `[REQUEST] Emulating method [${method}] to target URI: ${targetUrl}`, type: 'info', delay: 1200 },
            { text: `[REQUEST] Injecting Headers (User-Agent: "${headersUa.substring(0, 30)}...")`, type: 'info', delay: 1600 },
            { text: `[NETWORK] HTTP Status Code: 200 OK (Connection time: 420ms)`, type: 'success', delay: 2000 },
            { text: `[PARSER] Received document payload size: 142.4 KB`, type: 'info', delay: 2400 }
        ];

        // Append selector evaluation logs
        let delayOffset = 2800;
        this.selectorFields.forEach((field, i) => {
            logsSequence.push({
                text: `[COMPILER] Querying selector path "${field.selector}" map to key <${field.name}>`,
                type: 'info',
                delay: delayOffset + (i * 300)
            });
            logsSequence.push({
                text: `[PARSER] Evaluated: matched elements. Extraction format [${field.type}] resolved.`,
                type: 'success',
                delay: delayOffset + (i * 300) + 150
            });
        });

        delayOffset += (this.selectorFields.length * 300);

        logsSequence.push({ text: `[SYSTEM] Generating processed data stream preview...`, type: 'info', delay: delayOffset });
        logsSequence.push({ text: `[DATABASE] Ingested and stored records successfully into workspace state.`, type: 'success', delay: delayOffset + 500 });
        logsSequence.push({ text: `[SYSTEM] Refinery agent execution completed. [SUCCESS STATE]`, type: 'success', delay: delayOffset + 900 });

        // Run logs timeout loop
        logsSequence.forEach(log => {
            setTimeout(() => {
                const timestamp = new Date().toLocaleTimeString();
                const logLine = `<p class="term-log-line ${log.type}"><span class="term-time">[${timestamp}]</span> ${log.text}</p>`;
                
                // Add to Builder console
                builderLogsScreen.insertAdjacentHTML('beforeend', logLine);
                builderLogsScreen.scrollTop = builderLogsScreen.scrollHeight;

                // Add to Dashboard console
                dashLogsScreen.insertAdjacentHTML('beforeend', logLine);
                dashLogsScreen.scrollTop = dashLogsScreen.scrollHeight;
            }, log.duration || log.delay);
        });

        // Complete Scrape Simulation: Populate output data structures
        setTimeout(() => {
            this.generateMockIngestionData();
            this.renderDataTable();
            this.renderJSONPreview();
            this.updateStatsDisplay(true); // Increment counters
            this.addHistoricalJobRow(targetUrl); // Append row in jobs
            
            // Reset state
            this.isScraping = false;
            mainTriggerBtn.disabled = false;
            builderTriggerBtn.disabled = false;

            this.switchTab('explorer'); // View final data
        }, delayOffset + 1200);
    }

    logToConsole(elementId, text, type = '') {
        const screen = document.getElementById(elementId);
        if (!screen) return;
        const timestamp = new Date().toLocaleTimeString();
        const cursor = screen.querySelector('.term-cursor');
        if (cursor) cursor.remove();
        
        const line = `<p class="term-log-line ${type}"><span class="term-time">[${timestamp}]</span> ${text}</p>`;
        screen.insertAdjacentHTML('beforeend', line);
        screen.insertAdjacentHTML('beforeend', '<p class="term-log-line"><span class="term-cursor">_</span></p>');
        screen.scrollTop = screen.scrollHeight;
    }

    // Creates dynamic values matching user specified selector mapping headers
    generateMockIngestionData() {
        const customRows = [];
        const itemsToGenerate = 4;
        
        // Target list values library to pick from depending on keys
        const mockValueLibrary = {
            product_name: ['Apex Pro Mechanical Keyboard', 'G-Pro Superlight Mouse', 'HyperX QuadCast Mic', 'Alienware 34" Curved Monitor'],
            price: ['$199.99', '$129.00', '$159.50', '$829.99'],
            availability: ['In Stock', 'Out of Stock', 'In Stock', 'Low Stock'],
            article_title: ['Reflections on writing a CSS parser in Zig', 'Show HN: FlowEdit - Multi-cursor text engine', 'DNS over HTTPS: Security vs Performance metrics', 'The rise of utility-first CSS frameworks is slowing'],
            article_url: ['https://blog.zig-lovers.org/parser', 'https://flowedit.dev', 'https://netsec.org/doh-vs-dns', 'https://trends.co/css-2026'],
            subtext_score: ['512 points', '92 points', '140 points', '405 points'],
            title: ['Data Row Output Index #0', 'Data Row Output Index #1', 'Data Row Output Index #2', 'Data Row Output Index #3']
        };

        for (let i = 0; i < itemsToGenerate; i++) {
            const rowData = {};
            this.selectorFields.forEach(field => {
                const key = field.name || 'key_' + field.id;
                
                // Try matching custom keys
                if (mockValueLibrary[key]) {
                    rowData[key] = mockValueLibrary[key][i];
                } else if (field.selector.includes('price')) {
                    rowData[key] = `$${(Math.random() * 200 + 10).toFixed(2)}`;
                } else if (field.selector.includes('img') || field.type.includes('src')) {
                    rowData[key] = `https://refinery.io/static/images/mock_node_${i}.png`;
                } else if (field.selector.includes('a') || field.type.includes('href')) {
                    rowData[key] = `https://target-destination-node.com/extracted-link/${i}`;
                } else {
                    rowData[key] = `Simulated Val [Node ${i}]`;
                }
            });
            customRows.push(rowData);
        }

        this.scrapedData = customRows;
    }

    // Injects dynamic columns & values in Explorer Data Table
    renderDataTable() {
        const table = document.getElementById('explorer-data-table');
        const thead = table.querySelector('thead');
        const tbody = table.querySelector('tbody');

        thead.innerHTML = '';
        tbody.innerHTML = '';

        if (this.selectorFields.length === 0 || this.scrapedData.length === 0) {
            thead.innerHTML = `<tr><th>NO EXTRACTION MAP LOADED</th></tr>`;
            tbody.innerHTML = `<tr><td>Configure selector fields in the Builder tab and click Run.</td></tr>`;
            return;
        }

        // Render header keys
        const headerRow = document.createElement('tr');
        this.selectorFields.forEach(field => {
            const th = document.createElement('th');
            th.textContent = (field.name || 'UNNAMED_KEY').toUpperCase();
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);

        // Render rows data
        this.scrapedData.forEach(row => {
            const tr = document.createElement('tr');
            this.selectorFields.forEach(field => {
                const td = document.createElement('td');
                const val = row[field.name] || 'N/A';
                
                // Truncate URLs or long content nicely
                if (typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://'))) {
                    td.innerHTML = `<a href="${val}" target="_blank" class="truncate-url mono" style="color: var(--accent-blue);">${val}</a>`;
                } else {
                    td.textContent = val;
                }
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
    }

    renderJSONPreview() {
        const preview = document.getElementById('explorer-json-preview');
        preview.textContent = JSON.stringify(this.scrapedData, null, 4);
    }

    // Adjust dashboard counters
    updateStatsDisplay(scrapedRunSuccess = false) {
        const recordsEl = document.getElementById('stats-records-scraped');
        const successRateEl = document.getElementById('stats-success-rate');

        if (scrapedRunSuccess) {
            // Simulated increment
            const currentRecords = parseInt(recordsEl.textContent.replace(/,/g, ''));
            const added = this.scrapedData.length;
            recordsEl.textContent = (currentRecords + added).toLocaleString();
            
            successRateEl.innerHTML = `99.91<span class="metric-unit">%</span>`;
        }
    }

    // Appends audit row into Run History logs
    addHistoricalJobRow(url) {
        const tbody = document.querySelector('#runs-history-table tbody');
        const hash = '#850-x' + Math.floor(Math.random() * 9);
        const name = document.getElementById('builder-scraper-name').value;
        const count = this.scrapedData.length;

        const row = `
            <tr>
                <td class="mono">${hash}</td>
                <td>${name}</td>
                <td><span class="badge badge-success">Success</span></td>
                <td class="mono truncate-url">${url}</td>
                <td>${count} Items</td>
                <td>${(Math.random() * 2 + 0.5).toFixed(1)}s</td>
                <td>Just Now</td>
                <td>
                    <button class="btn btn-secondary btn-xs btn-view-run-logs" data-job="${hash}">LOGS</button>
                    <button class="btn btn-secondary btn-xs btn-view-run-data">DATA</button>
                </td>
            </tr>
        `;
        tbody.insertAdjacentHTML('afterbegin', row);
    }

    // Displays logs popup in Job History panel
    showJobLogs(jobHash) {
        const auditPanel = document.getElementById('detailed-log-panel');
        const auditScreen = document.getElementById('audit-terminal-screen');
        const auditTitle = document.getElementById('active-job-details-title');

        auditTitle.textContent = jobHash;
        auditPanel.style.display = 'block';
        
        // Custom simulated audit logs
        const mockLogs = [
            `[SYSTEM] Audit retrieval query for Run Hash ID: ${jobHash}`,
            `[SECURITY] Initiating credential checks for crawler request proxy pool... OK`,
            `[NETWORK] Host IP resolution succeeded.`,
            `[ROUTING] Target redirect matches DOM routing maps.`,
            `[PARSER] Scrape finalized with 0 execution exceptions. Data streams flushed.`,
            `[SYSTEM] End audit log trail.`
        ];

        auditScreen.innerHTML = '';
        mockLogs.forEach(line => {
            const timestamp = new Date().toLocaleTimeString();
            auditScreen.insertAdjacentHTML('beforeend', `<p class="term-log-line success"><span class="term-time">[${timestamp}]</span> ${line}</p>`);
        });
        auditScreen.insertAdjacentHTML('beforeend', '<p class="term-log-line"><span class="term-cursor">_</span></p>');
    }

    addScheduleRow(name, cron, concurrency) {
        const tbody = document.querySelector('#schedules-table tbody');
        const row = `
            <tr>
                <td>${name}</td>
                <td class="mono">${cron}</td>
                <td>In ${Math.floor(Math.random()*50 + 10)}m</td>
                <td>${concurrency}</td>
                <td><span class="badge badge-success">ACTIVE</span></td>
                <td><button class="btn btn-secondary btn-xs">SUSPEND</button></td>
            </tr>
        `;
        tbody.insertAdjacentHTML('beforeend', row);
    }

    // CSV Download Builder Helper
    exportToCSV() {
        if (this.scrapedData.length === 0) return;
        
        const keys = this.selectorFields.map(f => f.name || 'key');
        const csvRows = [
            keys.join(','), // header row
            ...this.scrapedData.map(row => 
                keys.map(fieldName => {
                    const cell = row[fieldName] || '';
                    // Escape quote characters
                    return `"${cell.toString().replace(/"/g, '""')}"`;
                }).join(',')
            )
        ];

        const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `refinery_export_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // JSON Download Builder Helper
    exportToJSON() {
        if (this.scrapedData.length === 0) return;
        
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.scrapedData, null, 2));
        const link = document.createElement("a");
        link.setAttribute("href", dataStr);
        link.setAttribute("download", `refinery_export_${Date.now()}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Instantiate App
const app = new RefineryApp();
// Expose on global window object for simple HTML onclick reference hooks
window.app = app;
