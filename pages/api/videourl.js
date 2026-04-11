/**
 * GET /api/videourl?batchId=X&subjectId=Y&findKey=Z
 * Returns: { url, type, source }
 */
const { safeDecrypt } = require('../../lib/decrypt');
const { getApiUrlFromFirebase } = require('../../lib/firebaseAdmin');

function detectType(url) {
  if (!url) return 'mpd';
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
  if (url.includes('.m3u8')) return 'hls';
  if (url.includes('.mp4')) return 'mp4';
  return 'mpd';
}

// Build full signed URL from response data
// Handles: data.url + data.signedUrl (query string) pattern
function extractUrl(data) {
  if (!data) return null;

  // Unwrap success wrapper: { success, data: { url, signedUrl } }
  const inner = data?.data || data;
  const item = Array.isArray(inner) ? inner[0] : inner;
  if (!item) return null;

  const baseUrl =
    item.url || item.videoUrl || item.playbackUrl ||
    item.hlsUrl || item.streamUrl || item.dashUrl ||
    item.cdnUrl || item.mediaUrl || item.link || item.src;

  if (!baseUrl || !baseUrl.startsWith('http')) return null;

  // Append signedUrl query string if present (CloudFront signed URL)
  const signed = item.signedUrl || item.signed_url || item.token || '';
  if (signed && signed.startsWith('?')) {
    return baseUrl + signed;
  }

  return baseUrl;
}

async function tryEndpoint(url) {
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(12000),
    });
    const text = await r.text();
    let json;
    try { json = JSON.parse(text); } catch (_) { return null; }

    // Decrypt if data is encrypted string
    if (json?.data && typeof json.data === 'string') {
      const dec = safeDecrypt(json.data);
      if (dec) return dec; // return decrypted object directly
    }
    return json;
  } catch (_) {
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  let BASE;
  try {
    BASE = await getApiUrlFromFirebase();
  } catch (e) {
    return res.status(503).json({ error: 'Config error: ' + e.message });
  }

  const { batchId, subjectId, findKey } = req.query;
  if (!findKey) return res.status(400).json({ error: 'findKey is required' });

  const bid = batchId || '';
  const sid = subjectId || '';

  const endpoints = [
    { name: 'video',      url: `${BASE}/api/pw/video?batchId=${bid}&subjectId=${sid}&childId=${findKey}` },
    { name: 'get-url',    url: `${BASE}/api/pw/get-url?batchId=${bid}&subjectId=${sid}&childId=${findKey}` },
    { name: 'videonew',   url: `${BASE}/api/pw/videonew?batchId=${bid}&subjectId=${sid}&childId=${findKey}` },
    { name: 'videoplay',  url: `${BASE}/api/pw/videoplay?batchId=${bid}&subjectId=${sid}&childId=${findKey}` },
    { name: 'videosuper', url: `${BASE}/api/pw/videosuper?batchId=${bid}&childId=${findKey}` },
  ];

  for (const ep of endpoints) {
    const data = await tryEndpoint(ep.url);
    const videoUrl = extractUrl(data);
    if (videoUrl) {
      const type = detectType(videoUrl);
      const result = { url: videoUrl, type, source: ep.name };

      // Pre-fetch KID for MPD
      if (type === 'mpd') {
        try {
          const kidRes = await fetch(
            `${BASE}/api/pw/kid?mpdUrl=${encodeURIComponent(videoUrl)}`,
            { signal: AbortSignal.timeout(6000) }
          );
          if (kidRes.ok) {
            const kidJson = await kidRes.json();
            const kid = kidJson?.kid || kidJson?.data?.kid;
            if (kid) result.kid = kid;
          }
        } catch (_) {}
      }

      return res.json(result);
    }
  }

  return res.status(404).json({ error: 'No video URL found', findKey, batchId, subjectId, base: BASE });
}
