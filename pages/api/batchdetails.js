const { safeDecrypt } = require('../../lib/decrypt');

// Use default API URL directly in API routes (server-side)
const DEFAULT_API_URL = 'https://adc.onrender.app';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Use default API URL for server-side requests
  const PW = DEFAULT_API_URL;
  
  const { batchId } = req.query;
  if (!batchId) return res.status(400).json({ error: 'batchId required' });
  try {
    const r = await fetch(`${PW}/api/pw/batchdetails`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ searchParams: { BatchId: batchId } }),
      signal: AbortSignal.timeout(30000),
    });
    const json = await r.json();
    const dec = safeDecrypt(json?.data);
    if (!dec) return res.status(500).json({ error: 'Decrypt failed' });
    res.json(dec);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
