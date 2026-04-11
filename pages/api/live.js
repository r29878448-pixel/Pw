/**
 * GET /api/live?batchId=X
 * POST to backend /api/pw/live with { batchId }
 * Returns today's live classes list
 */
const { safeDecrypt } = require('../../lib/decrypt');
const { getApiUrlFromFirebase } = require('../../lib/firebaseAdmin');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  let PW;
  try { PW = await getApiUrlFromFirebase(); }
  catch (e) { return res.status(503).json({ error: 'Config: ' + e.message }); }

  const { batchId } = req.query;
  if (!batchId) return res.status(400).json({ error: 'batchId required' });

  try {
    const r = await fetch(`${PW}/api/pw/live`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batchId }),
      signal: AbortSignal.timeout(15000),
    });

    if (!r.ok) return res.status(r.status).json({ error: `API ${r.status}` });

    const json = await r.json();

    // Try decrypt first
    if (json?.data && typeof json.data === 'string') {
      const dec = safeDecrypt(json.data);
      if (dec) return res.json(dec);
    }

    // Already plain JSON
    return res.json(json);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
