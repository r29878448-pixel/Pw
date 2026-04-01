const { safeDecrypt } = require('../../lib/decrypt');
const { getApiUrlFromFirebase } = require('../../lib/firebaseAdmin');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const PW = await getApiUrlFromFirebase();
  console.log('🌐 Calling API:', PW + '/api/pw/live');
  
  const { batchId } = req.query;
  if (!batchId) return res.status(400).json({ error: 'batchId required' });
  
  try {
    const r = await fetch(`${PW}/api/pw/live`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batchId }),
      signal: AbortSignal.timeout(30000),
    });
    
    if (!r.ok) {
      console.error('❌ API Error:', r.status, r.statusText);
      return res.status(r.status).json({ error: `API returned ${r.status}` });
    }
    
    const json = await r.json();
    const dec = safeDecrypt(json?.data);
    
    if (!dec) {
      console.error('❌ Decrypt failed');
      return res.status(500).json({ error: 'Decrypt failed' });
    }
    
    console.log('✅ Live classes fetched');
    res.json(dec);
  } catch (e) {
    console.error('❌ Error:', e.message);
    res.status(500).json({ error: e.message });
  }
}
