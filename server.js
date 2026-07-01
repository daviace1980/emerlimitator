const express = require('express');
const fs      = require('fs');
const path    = require('path');

const app      = express();
const PORT     = 3000;
const DATA_DIR = path.join(__dirname, 'data');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

app.use(express.json({ limit: '1mb' }));

// data/personnel.json es legible como fichero estático (GET)
app.get('/data/personnel.json', (req, res) => {
  res.json(readJson(path.join(DATA_DIR, 'personnel.json'), { LRE: [], MCE: [] }));
});

// Bloquea acceso directo al resto de /data/
app.use('/data', (req, res) => res.status(403).end());

// Sirve HTML, JS, CSS y assets
app.use(express.static(__dirname, { index: 'index.html' }));

function readJson(file, fallback) {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {}
  return fallback;
}

// ── Personal ──────────────────────────────────────────────────────────────────
app.get('/api/personnel', (req, res) => {
  res.json(readJson(path.join(DATA_DIR, 'personnel.json'), { LRE: [], MCE: [] }));
});

app.post('/api/personnel', (req, res) => {
  try {
    fs.writeFileSync(path.join(DATA_DIR, 'personnel.json'), JSON.stringify(req.body, null, 2));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Credenciales ──────────────────────────────────────────────────────────────
app.get('/api/credentials', (req, res) => {
  res.json(readJson(path.join(DATA_DIR, 'credentials.json'), { user: 'Ala23RPAS', pass: 'AdelanteRPAS' }));
});

app.post('/api/credentials', (req, res) => {
  try {
    fs.writeFileSync(path.join(DATA_DIR, 'credentials.json'), JSON.stringify(req.body, null, 2));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`EMERLIMITATOR → http://localhost:${PORT}`);
});
