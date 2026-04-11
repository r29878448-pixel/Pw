/**
 * GET /api/drm?findKey=X&batchId=Y&subjectId=Z&mpdUrl=encodedUrl
 *
 * 1. Fetch KID from ${BASE}/api/pw/kid?mpdUrl=... (spec endpoint)
 *    OR extract from MPD XML directly
 * 2. Fetch key from ${BASE}/api/pw/otp?kid=...
 * 3. Return { clearKeys: { [kid]: key } }
 */
const { safeDecrypt } = require('../../lib/decrypt');
const { getApiUrlFromFirebase } = require('../../lib/firebaseAdmin');

async function fetchText(url) {
  const r = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.pw.live/' },
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
}

function extractKidFromXml(xml) {
  const patterns = [
    /default_KID="([a-f0-9-]{36})"/i,
    /cenc:default_KID="([a-f0-9-]{36})"/i,
    /kid="([a-f0-9-]{36})"/i,
    /KID="([a-f0-9-]{36})"/i,
  ];
  for (const p of patterns) {
    const m = xml.match(p);
    if (m) return m[1].replace(/-/g, '').toLowerCase();
  }
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  const BASE = await getApiUrlFromFirebase();
  const { findKey, batchId, subjectId, mpdUrl } = req.query;

  if (!findKey) return res.status(400).json({ error: 'findKey required' });

  const result = { findKey, kid: null, key: null, clearKeys: null };

  try {
    const decodedMpd = mpdUrl ? decodeURIComponent(mpdUrl) : null;

    // ── Step 1: Get KID ──────────────────────────────────────────────────────

    // Try spec endpoint first: /api/pw/kid?mpdUrl=...
    if (decodedMpd) {
      try {
        const kidRes = await fetch(
          `${BASE}/api/pw/kid?mpdUrl=${encodeURIComponent(decodedMpd)}`,
          { signal: AbortSignal.timeout(8000) }
        );
        if (kidRes.ok) {
          const kidJson = await kidRes.json();
          result.kid = kidJson?.kid || kidJson?.data?.kid || null;
        }
      } catch (_) {}
    }

    // Fallback: parse MPD XML directly (signed URL works server-side)
    if (!result.kid && decodedMpd) {
      try {
        const xml = await fetchText(decodedMpd);
        result.kid = extractKidFromXml(xml);
      } catch (_) {}
    }

    // ── Step 2: Get Key via OTP ──────────────────────────────────────────────

    const kidsToTry = [...new Set([result.kid, findKey].filter(Boolean))];

    for (const kid of kidsToTry) {
      try {
        const r = await fetch(
          `${BASE}/api/pw/otp?kid=${kid}`,
          { signal: AbortSignal.timeout(10000) }
        );
        const json = await r.json();

        let data = json;
        if (json?.data && typeof json.data === 'string') {
          data = safeDecrypt(json.data) || json;
        }

        const keyid = data?.keyid || data?.kid || data?.data?.keyid || data?.data?.kid;
        const key   = data?.key   || data?.data?.key;

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
