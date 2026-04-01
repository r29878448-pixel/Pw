const { safeDecrypt } = require('../../lib/decrypt');
const { getApiUrlFromFirebase } = require('../../lib/firebaseAdmin');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const PW = await getApiUrlFromFirebase();
  
  const { batchId, subjectSlug } = req.query;
  if (!batchId || !subjectSlug) return res.status(400).json({ error: 'batchId, subjectSlug required' });
  try {
    const r = await fetch(`${PW}/api/pw/topics?BatchId=${batchId}&SubjectId=${subjectSlug}`, {
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
