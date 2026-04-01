const { safeDecrypt } = require('../../lib/decrypt');
const { getApiUrlFromFirebase } = require('../../lib/firebaseAdmin');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const PW = await getApiUrlFromFirebase();
  
  const { batchId, subjectSlug, topicSlug, contentType } = req.query;
  if (!batchId || !subjectSlug || !topicSlug || !contentType)
    return res.status(400).json({ error: 'batchId, subjectSlug, topicSlug, contentType required' });
  try {
    const url = `${PW}/api/pw/datacontent?batchId=${batchId}&subjectSlug=${subjectSlug}&topicSlug=${topicSlug}&contentType=${contentType}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
    const json = await r.json();
    const dec = safeDecrypt(json?.data);
    if (!dec) return res.status(500).json({ error: 'Decrypt failed' });
    res.json(dec);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
