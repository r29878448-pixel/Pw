const { safeDecrypt } = require('../../lib/decrypt');
const PW = 'https://apiserver-skpg.onrender.com';

// In-memory cache — batches rarely change
let cache = null;
let cacheTime = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Serve from cache if fresh
  if (cache && Date.now() - cacheTime < CACHE_TTL) {
    res.setHeader('X-Cache', 'HIT');
    return res.json(cache);
  }

  try {
    const r = await fetch(`${PW}/api/pw/batches`, { signal: AbortSignal.timeout(35000) });
    const json = await r.json();
    const dec = safeDecrypt(json?.data);
    if (!dec) return res.status(500).json({ error: 'Decrypt failed' });

    cache = dec;
    cacheTime = Date.now();
    res.setHeader('X-Cache', 'MISS');
    res.json(dec);
  } catch (e) {
    // Return stale cache on error
    if (cache) {
      res.setHeader('X-Cache', 'STALE');
      return res.json(cache);
    }
    res.status(500).json({ error: e.message });
  }
}
