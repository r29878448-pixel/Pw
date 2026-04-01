/**
 * GET /api/videourl?batchId=X&subjectId=Y&findKey=Z
 * Tries 4 fallback APIs to get a playable video URL
 */
const { safeDecrypt } = require('../../lib/decrypt');
const PW = 'https://apiserver-skpg.onrender.com';

async function tryFetch(url) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) return null;
    const json = await r.json();
    // Try decrypt first
    if (json?.data && typeof json.data === 'string') {
      const dec = safeDecrypt(json.data);
      if (dec) return dec;
    }
    return json;
  } catch (_) { return null; }
}

function extractUrl(data) {
  if (!data) return null;
  return (
    data?.url || data?.videoUrl || data?.playbackUrl ||
    data?.data?.url || data?.data?.videoUrl || data?.hlsUrl ||
    data?.data?.hlsUrl || data?.streamUrl || data?.data?.streamUrl
  ) || null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { batchId, subjectId, findKey } = req.query;
  if (!batchId || !findKey) return res.status(400).json({ error: 'batchId, findKey required' });

  const apis = [
    `${PW}/api/pw/videonew?batchId=${batchId}&subjectId=${subjectId || ''}&childId=${findKey}`,
    `${PW}/api/pw/video?batchId=${batchId}&subjectId=${subjectId || ''}&childId=${findKey}`,
    `${PW}/api/pw/videosuper?batchId=${batchId}&childId=${findKey}`,
    `${PW}/api/pw/videoplay?batchId=${batchId}&childId=${findKey}`,
  ];

  for (const api of apis) {
    const data = await tryFetch(api);
    const url = extractUrl(data);
    if (url) return res.json({ url, source: api.split('/api/pw/')[1].split('?')[0] });
  }

  return res.status(404).json({ error: 'No video URL found from any API' });
}
