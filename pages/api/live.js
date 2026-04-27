const { safeDecrypt } = require('../../lib/decrypt');
const { getApiUrlFromFirebase } = require('../../lib/firebaseAdmin');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  const { batchId } = req.query;
  if (!batchId) return res.status(400).json({ error: 'batchId required' });

  const PW = await getApiUrlFromFirebase();

  const endpoints = [
    () => fetch(`${PW}/api/pw/live`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batchId }),
      signal: AbortSignal.timeout(15000),
    }),
    () => fetch(`${PW}/api/pw/live?batchId=${batchId}`, { signal: AbortSignal.timeout(12000) }),
    () => fetch(`${PW}/api/pw/schedule?batchId=${batchId}`, { signal: AbortSignal.timeout(12000) }),
    () => fetch(`${PW}/api/pw/live-classes?batchId=${batchId}`, { signal: AbortSignal.timeout(12000) }),
  ];

  for (const call of endpoints) {
    try {
      const r = await call();
      if (!r.ok) continue;
      const json = await r.json();

      if (json?.data && typeof json.data === 'string') {
        const dec = safeDecrypt(json.data);
        if (dec) return res.json(dec);
      }

      const arr = json?.data || json;
      if (Array.isArray(arr)) return res.json(arr);
      if (json?.success !== false) return res.json(json);
    } catch (_) {}
  }

  return res.status(404).json({ error: 'No live classes found', batchId });
}
