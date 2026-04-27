const { getApiUrlFromFirebase } = require('../../lib/firebaseAdmin');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  const { batchId } = req.query;
  if (!batchId) return res.status(400).json({ error: 'batchId required' });

  const PW = await getApiUrlFromFirebase();

  try {
    const r = await fetch(`${PW}/api/pw/announcements?batchId=${batchId}`, {
      signal: AbortSignal.timeout(15000),
    });

    if (!r.ok) throw new Error(`API ${r.status}`);
    const json = await r.json();
    return res.json(json);
  } catch (e) {
    // fallback: try PW public API directly
    try {
      const r2 = await fetch(`https://api.penpencil.co/v1/batches/${batchId}/announcement`, {
        headers: {
          randomid: 'c8faf83e-46c5-414f-b6e8-78b056158f01',
          'client-version': '12.0.2',
          'User-Agent': 'PW-Android-12.0.2',
          'Content-Type': 'application/json; charset=utf-8',
        },
        signal: AbortSignal.timeout(15000),
      });
      if (!r2.ok) throw new Error(`Fallback API ${r2.status}`);
      const json2 = await r2.json();
      return res.json(json2);
    } catch (e2) {
      return res.status(500).json({ error: e2.message });
    }
  }
}
