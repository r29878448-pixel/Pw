/**
 * GET /api/drm?findKey=X&batchId=Y&subjectId=Z
 * 
 * 1. Fetch MPD via proxy
 * 2. Extract KID from MPD
 * 3. Get DRM key from /api/pw/otp?kid=KID
 * 4. Return { mpdUrl, kid, key } for Shaka clearKeys
 */
const { safeDecrypt } = require('../../lib/decrypt');

// Use default API URL directly in API routes (server-side)
const DEFAULT_API_URL = 'https://adc.onrender.app';

async function fetchText(url) {
  const r = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
}

function extractKid(mpdXml) {
  // Try multiple patterns
  const patterns = [
    /default_KID="([a-f0-9-]{36})"/i,
    /cenc:default_KID="([a-f0-9-]{36})"/i,
    /kid="([a-f0-9-]{36})"/i,
    /KID="([a-f0-9-]{36})"/i,
  ];
  for (const p of patterns) {
    const m = mpdXml.match(p);
    if (m) return m[1].replace(/-/g, '').toLowerCase();
  }
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Use default API URL for server-side requests
  const PW = DEFAULT_API_URL;
  
  const { findKey, batchId, subjectId, mpdUrl } = req.query;

  if (!findKey) return res.status(400).json({ error: 'findKey required' });

  const result = { findKey, mpdUrl: mpdUrl || null, kid: null, key: null, error: null };

  try {
    // Step 1: Fetch MPD to extract KID
    if (mpdUrl) {
      try {
        const mpdXml = await fetchText(decodeURIComponent(mpdUrl));
        result.kid = extractKid(mpdXml);
        result.mpdXmlPreview = mpdXml.substring(0, 200);
      } catch (e) {
        result.mpdError = e.message;
      }
    }

    // Step 2: Get OTP/key — try with KID and findKey
    const kidToTry = result.kid || findKey;
    const otpEndpoints = [
      `${PW}/api/pw/otp?kid=${kidToTry}`,
      `${PW}/api/pw/otp?kid=${findKey}`,
    ];

    for (const endpoint of otpEndpoints) {
      try {
        const r = await fetch(endpoint, { signal: AbortSignal.timeout(10000) });
        const json = await r.json();

        let data = json;
        if (json?.data && typeof json.data === 'string') {
          data = safeDecrypt(json.data) || json;
        }

        const keyid = data?.keyid || data?.kid || data?.data?.keyid;
        const key = data?.key || data?.data?.key;

        if (keyid && key) {
          result.kid = keyid;
          result.key = key;
          result.clearKeys = { [keyid]: key };
          break;
        }
      } catch (_) {}
    }

    return res.json(result);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
