/* ============================================================
   GROUP60 — THE INVESTIGATOR — Express Server Entry Point
   ============================================================ */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const investigateRoute = require('./routes/investigate');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──
app.use(cors());
app.use(express.json());

// ── Serve frontend static files securely from root ──
const rootPath = path.join(__dirname, '..', '..');
app.get('/', (req, res) => res.sendFile(path.join(rootPath, 'index.html')));
app.get('/index.html', (req, res) => res.sendFile(path.join(rootPath, 'index.html')));
app.get('/app.js', (req, res) => res.sendFile(path.join(rootPath, 'app.js')));
app.get('/styles.css', (req, res) => res.sendFile(path.join(rootPath, 'styles.css')));

// ── Health Check ──
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ── API Routes ──
app.use('/api', investigateRoute);

// ── Catch-all: serve index.html for any non-API route ──
app.get('*', (req, res) => {
  res.sendFile(path.join(rootPath, 'index.html'));
});

// ── Start Server ──
app.listen(PORT, () => {
  console.log(`\n  ╔═══════════════════════════════════════════╗`);
  console.log(`  ║  GROUP60 — THE INVESTIGATOR                ║`);
  console.log(`  ║  Server running on http://localhost:${PORT}   ║`);
  console.log(`  ╚═══════════════════════════════════════════╝\n`);
});
