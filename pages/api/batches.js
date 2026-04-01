const { safeDecrypt } = require('../../lib/decrypt');
const { getApiUrlFromFirebase } = require('../../lib/firebaseAdmin');

// In-memory cache — batches rarely change
let cache = null;
let cacheTime = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Get API URL from Firebase
  const PW = await getApiUrlFromFirebase();
  console.log('🌐 Calling API:', PW + '/api/pw/batches');

  // Serve from cache if fresh
  if (cache && Date.now() - cacheTime < CACHE_TTL) {
    res.setHeader('X-Cache', 'HIT');
    return res.json(cache);
  }

  try {
    const r = await fetch(`${PW}/api/pw/batches`, { signal: AbortSignal.timeout(35000) });
    
    if (!r.ok) {
      console.error('❌ API Error:', r.status, r.statusText);
      // Return stale cache on error
      if (cache) {
        res.setHeader('X-Cache', 'STALE');
        return res.json(cache);
      }
      return res.status(r.status).json({ error: `API returned ${r.status}` });
    }
    
    const json = await r.json();
    const dec = safeDecrypt(json?.data);
    
    if (!dec) {
      console.error('❌ Decrypt failed');
      // Return stale cache on error
      if (cache) {
        res.setHeader('X-Cache', 'STALE');
        return res.json(cache);
      }
      return res.status(500).json({ error: 'Decrypt failed' });
    }

    cache = dec;
    cacheTime = Date.now();
    res.setHeader('X-Cache', 'MISS');
    console.log('✅ Success');
    res.json(dec);
  } catch (e) {
    console.error('❌ Error:', e.message);
    // Return stale cache on error
    if (cache) {
      res.setHeader('X-Cache', 'STALE');
      return res.json(cache);
    }
    res.status(500).json({ error: e.message });
  }
}
