/**
 * GET /api/live?batchId=X
 * Fetches today's live/upcoming/recorded classes for a batch.
 * Tries multiple endpoints from apiserver-henna.vercel.app
 */
const { safeDecrypt } = require('../../lib/decrypt');

const API_BASE = 'https://apiserver-henna.vercel.app';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  const { batchId } = req.query;
  if (!batchId) return res.status(400).json({ error: 'batchId required' });

  const endpoints = [
    // POST endpoint (primary)
    () => fetch(`${API_BASE}/api/pw/live`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batchId }),
      signal: AbortSignal.timeout(15000),
    }),
    // GET fallbacks
    () => fetch(`${API_BASE}/api/pw/live?batchId=${batchId}`, { signal: AbortSignal.timeout(12000) }),
    () => fetch(`${API_BASE}/api/pw/schedule?batchId=${batchId}`, { signal: AbortSignal.timeout(12000) }),
    () => fetch(`${API_BASE}/api/pw/live-classes?batchId=${batchId}`, { signal: AbortSignal.timeout(12000) }),
  ];

  for (const call of endpoints) {
    try {
      const r = await call();
      if (!r.ok) continue;
      const json = await r.json();

      // Decrypt if needed
      if (json?.data && typeof json.data === 'string') {
        const dec = safeDecrypt(json.data);
        if (dec) return res.json(dec);
      }

      // Return plain JSON if it has data
      const arr = json?.data || json;
      if (Array.isArray(arr) && arr.length >= 0) return res.json(arr);
      if (json?.success !== false) return res.json(json);
    } catch (_) {}
  }

  return res.status(404).json({ error: 'No live classes found', batchId });
}
