const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db/database');
const { calcProposal } = require('./db/pricing');
const { generateProposalPDF } = require('./pdf/generator');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ─── ROLES ──────────────────────────────────────────────────────────────────
app.get('/api/roles', (req, res) => res.json(db.getRoles()));
app.post('/api/roles', (req, res) => {
  const { name, hourlyRate } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  res.json(db.createRole(name, hourlyRate || 0));
});
app.put('/api/roles/:id', (req, res) => {
  const { name, hourlyRate } = req.body;
  const result = db.updateRole(parseInt(req.params.id), name, hourlyRate);
  if (!result) return res.status(404).json({ error: 'Not found' });
  res.json(result);
});
app.delete('/api/roles/:id', (req, res) => {
  db.deleteRole(parseInt(req.params.id));
  res.json({ success: true });
});

// ─── SERVICE GROUPS ──────────────────────────────────────────────────────────
app.get('/api/service-groups', (req, res) => res.json(db.getServiceGroups()));
app.post('/api/service-groups', (req, res) => {
  const { name, sortOrder, duration } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  res.json(db.createServiceGroup(name, sortOrder, duration));
});
app.put('/api/service-groups/:id', (req, res) => {
  const { name, sortOrder, duration } = req.body;
  const result = db.updateServiceGroup(parseInt(req.params.id), { name, sortOrder, duration });
  if (!result) return res.status(404).json({ error: 'Not found' });
  res.json(result);
});
app.delete('/api/service-groups/:id', (req, res) => {
  db.deleteServiceGroup(parseInt(req.params.id));
  res.json({ success: true });
});

// ─── PAYMENT METHODS ─────────────────────────────────────────────────────────
app.get('/api/payment-methods', (req, res) => res.json(db.getPaymentMethods()));
app.post('/api/payment-methods', (req, res) => {
  const { name, commission } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  res.json(db.createPaymentMethod(name, commission));
});
app.put('/api/payment-methods/:id', (req, res) => {
  const { name, commission } = req.body;
  const result = db.updatePaymentMethod(parseInt(req.params.id), name, commission);
  if (!result) return res.status(404).json({ error: 'Not found' });
  res.json(result);
});
app.delete('/api/payment-methods/:id', (req, res) => {
  db.deletePaymentMethod(parseInt(req.params.id));
  res.json({ success: true });
});

// ─── SERVICES ─────────────────────────────────────────────────────────────────
app.get('/api/services', (req, res) => res.json(db.getServices()));
app.get('/api/services/:id', (req, res) => {
  const s = db.getService(parseInt(req.params.id));
  if (!s) return res.status(404).json({ error: 'Not found' });
  res.json(s);
});
app.post('/api/services', (req, res) => {
  try { res.json(db.createService(req.body)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/services/:id', (req, res) => {
  try {
    const result = db.updateService(parseInt(req.params.id), req.body);
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/services/:id', (req, res) => {
  db.deleteService(parseInt(req.params.id));
  res.json({ success: true });
});

// ─── PROPOSALS ───────────────────────────────────────────────────────────────
app.get('/api/proposals', (req, res) => res.json(db.getProposals()));
app.get('/api/proposals/:id', (req, res) => {
  const p = db.getProposal(parseInt(req.params.id));
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json(p);
});
app.post('/api/proposals', (req, res) => {
  try { res.json(db.createProposal(req.body)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/proposals/:id', (req, res) => {
  try {
    const result = db.updateProposal(parseInt(req.params.id), req.body);
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/proposals/:id', (req, res) => {
  db.deleteProposal(parseInt(req.params.id));
  res.json({ success: true });
});
app.post('/api/proposals/:id/duplicate', (req, res) => {
  const result = db.duplicateProposal(parseInt(req.params.id));
  if (!result) return res.status(404).json({ error: 'Not found' });
  res.json(result);
});

// ─── PROPOSAL PRICING (preview) ──────────────────────────────────────────────
app.get('/api/proposals/:id/pricing', (req, res) => {
  const proposal = db.getProposal(parseInt(req.params.id));
  if (!proposal) return res.status(404).json({ error: 'Not found' });
  const services = db.getServices();
  const roles = db.getRoles();
  const paymentMethod = proposal.paymentMethod;
  const pricing = calcProposal(proposal, services, roles, paymentMethod);
  res.json(pricing);
});

// ─── PROPOSAL PDF ─────────────────────────────────────────────────────────────
app.get('/api/proposals/:id/pdf', (req, res) => {
  try {
    const proposal = db.getProposal(parseInt(req.params.id));
    if (!proposal) return res.status(404).json({ error: 'Not found' });
    const services = db.getServices();
    const roles = db.getRoles();
    const serviceGroups = db.getServiceGroups();
    const paymentMethod = proposal.paymentMethod;
    const pricing = calcProposal(proposal, services, roles, paymentMethod);
    generateProposalPDF(proposal, pricing, serviceGroups, res);
  } catch (e) {
    console.error('PDF error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ─── INDEXATION ───────────────────────────────────────────────────────────────
app.post('/api/indexation', (req, res) => {
  const { percent } = req.body;
  if (!percent || isNaN(percent)) return res.status(400).json({ error: 'Percent required' });
  res.json(db.applyIndexation(percent));
});

// ─── EXCHANGE RATE ─────────────────────────────────────────────────────────────
app.get('/api/exchange-rate', async (req, res) => {
  try {
    const https = require('https');
    const fetchRate = () => new Promise((resolve, reject) => {
      https.get('https://api.frankfurter.app/latest?from=EUR&to=USD', (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed.rates?.USD || null);
          } catch { resolve(null); }
        });
      }).on('error', () => resolve(null));
    });
    const rate = await fetchRate();
    if (rate) {
      res.json({ rate, source: 'frankfurter.app' });
    } else {
      // Fallback: try another API
      const fetchFallback = () => new Promise((resolve) => {
        https.get('https://open.er-api.com/v6/latest/EUR', (response) => {
          let data = '';
          response.on('data', chunk => data += chunk);
          response.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              resolve(parsed.rates?.USD || null);
            } catch { resolve(null); }
          });
        }).on('error', () => resolve(null));
      });
      const fallbackRate = await fetchFallback();
      res.json({ rate: fallbackRate || 1.12, source: fallbackRate ? 'er-api.com' : 'fallback' });
    }
  } catch { res.json({ rate: 1.12, source: 'fallback' }); }
});

// Serve React frontend build
app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`\n✅ Agency Pricing Tool running at http://localhost:${PORT}\n`);
});
