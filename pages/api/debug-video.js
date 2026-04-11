/**
 * GET /api/debug-video?findKey=X&batchId=Y&subjectId=Z
 * Shows exactly what the backend returns for a video request.
 * REMOVE THIS FILE IN PRODUCTION.
 */
const { safeDecrypt } = require('../../lib/decrypt');
const { getApiUrlFromFirebase } = require('../../lib/firebaseAdmin');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { findKey, batchId, subjectId } = req.query;

  let BASE = '(firebase failed)';
  try { BASE = await getApiUrlFromFirebase(); } catch (e) { BASE = 'ERROR: ' + e.message; }

  const results = { BASE, findKey, batchId, subjectId, endpoints: [] };

  if (!findKey) return res.json({ error: 'findKey required', ...results });

  const bid = batchId || '';
  const sid = subjectId || '';

  const urls = [
    `${BASE}/api/pw/get-url?batchId=${bid}&subjectId=${sid}&childId=${findKey}`,
    `${BASE}/api/pw/videonew?batchId=${bid}&subjectId=${sid}&childId=${findKey}`,
    `${BASE}/api/pw/video?batchId=${bid}&subjectId=${sid}&childId=${findKey}`,
    `${BASE}/api/pw/videoplay?batchId=${bid}&childId=${findKey}`,
  ];

  for (const url of urls) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10000) });
      const text = await r.text();
      let parsed = null;
      let decrypted = null;
      try {
        parsed = JSON.parse(text);
        if (parsed?.data && typeof parsed.data === 'string') {
          decrypted = safeDecrypt(parsed.data);
        }
      } catch (_) {}

      results.endpoints.push({
        url,
        status: r.status,
        rawPreview: text.substring(0, 400),
        parsed: parsed ? JSON.stringify(parsed).substring(0, 400) : null,
        decrypted: decrypted ? JSON.stringify(decrypted).substring(0, 400) : null,
      });
    } catch (e) {
      results.endpoints.push({ url, error: e.message });
    }
  }

  res.json(results);
}
