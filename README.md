# Refinery.io — Web Scraper Dashboard

A premium cybernetic-themed frontend template for a web scraping application. Built with vanilla HTML, CSS, and JavaScript — **no build tools or dependencies required**.

## Project Structure

```
Group60WebScraper/
├── frontend/              ← Website source code
│   ├── index.html         ← App layout & all panels
│   ├── styles.css         ← Cybernetic design system & component styles
│   └── app.js             ← Interactive logic, simulations, exporters
└── README.md
```

## Features

- **5-Tab Dashboard** — Dashboard, Scraper Builder, Refinery Jobs, Data Explorer, Schedules
- **Metrics Strip** — Animated KPI cards with live progress bars
- **Scraper Builder** — Dynamic CSS selector field mapping with add/remove fields
- **Interactive Web Canvas** — Click mock DOM elements to auto-generate CSS selectors
- **Simulated Terminal** — Realistic crawler log output with timestamps and colored log levels
- **Data Explorer** — Auto-populated results table + raw JSON preview after each simulated run
- **CSV / JSON Export** — Working download buttons for scraped data
- **Schedule Manager** — Add cron-based scraper routines

## Running Locally

No build step needed — just serve the `frontend/` directory with any static file server.

**Option 1 — Python (built-in):**
```bash
cd frontend
python -m http.server 8000
```
Then open [http://localhost:8000](http://localhost:8000).

**Option 2 — Node `http-server`:**
```bash
npx http-server frontend -p 8000
```

## Backend Integration

The frontend is designed to be a drop-in template. All scraper logic is currently simulated in `app.js`. To wire up a real backend:

1. Replace the `runSimulation()` method in `app.js` with a `fetch()` call to your API endpoint.
2. Replace `generateMockIngestionData()` with the parsed API response.
3. The `renderDataTable()` and `renderJSONPreview()` methods will handle displaying any data structure you pass in.

## Tech Stack

| Layer | Technology |
|---|---|
| Structure | HTML5 |
| Styling | Vanilla CSS3 (custom design system) |
| Logic | Vanilla JavaScript (ES6+ classes) |
| Fonts | Google Fonts (Syne, Outfit, JetBrains Mono, Share Tech Mono) |
