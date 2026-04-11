/**
 * GET /api/liveurl
 * Exactly same flow as recorded player (videourl.js)
 * 1. /api/pw/get-url   → direct
 * 2. /api/pw/video     → encrypted → decrypt → url + signedUrl
 * 3. /api/pw/videoplay → fallback
 * + live-specific endpoints as extra fallback
 */
const { safeDecrypt } = require('../../lib/decrypt');
const { getApiUrlFromFirebase } = require('../../lib/firebaseAdmin');

function detectType(url) {
  if (!url) return 'hls';
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
  if (url.includes('.mpd')) return 'mpd';
  return 'hls';
}

function buildFinalUrl(item) {
  if (!item) return null;
  const fields = ['url','streamUrl','liveUrl','hlsUrl','playbackUrl','videoUrl','link','src'];
  let base = null;
  for (const f of fields) {
    if (typeof item[f] === 'string' && item[f].startsWith('http')) { base = item[f]; break; }
  }
  if (!base) return null;
  const signed = item.signedUrl || item.signed_url || item.token || '';
  return (signed && signed.startsWith('?')) ? base + signed : base;
}

function extractUrl(data) {
  if (!data) return null;
  // { success, data: { url, signedUrl } }
  if (data?.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
    const u = buildFinalUrl(data.data);
    if (u) return u;
  }
  // top-level { url, signedUrl }
  const u = buildFinalUrl(data);
  if (u) return u;
  // { data: [{ url }] }
  if (Array.isArray(data?.data) && data.data[0]) return buildFinalUrl(data.data[0]);
  // [{ url }]
  if (Array.isArray(data) && data[0]) return buildFinalUrl(data[0]);
  return null;
}

async function tryEndpoint(url) {
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) return null;
    const json = await r.json();
    if (json?.data && typeof json.data === 'string') {
      const dec = safeDecrypt(json.data);
      if (dec) return dec;
    }
    return json;
  } catch (_) { return null; }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  let BASE;
  try { BASE = await getApiUrlFromFirebase(); }
  catch (e) { return res.status(503).json({ error: 'Config: ' + e.message }); }

  const bid = req.query.batch_id   || req.query.batchId   || '';
  const sid = req.query.subject_id || req.query.subjectId || '';
  const vid = req.query.video_id   || req.query.videoId   || req.query.childId || '';
  const sch = req.query.schedule_id || req.query.scheduleId || '';

  if (!bid) return res.status(400).json({ error: 'batch_id required' });

  const childId = vid || sch;
  if (!childId) return res.status(400).json({ error: 'video_id or schedule_id required' });

  const endpoints = [
    // Same 3 as recorded player — these work for live too
    { name: 'get-url',    url: `${BASE}/api/pw/get-url?batchId=${bid}&subjectId=${sid}&childId=${childId}` },
    { name: 'video',      url: `${BASE}/api/pw/video?batchId=${bid}&subjectId=${sid}&childId=${childId}` },
    { name: 'videoplay',  url: `${BASE}/api/pw/videoplay?batchId=${bid}&subjectId=${sid}&childId=${childId}` },
    // Live-specific
    { name: 'live-url',   url: `${BASE}/api/live/get-url?batchId=${bid}&scheduleId=${sch || childId}` },
    { name: 'live-pw',    url: `${BASE}/api/pw/live-url?batchId=${bid}&scheduleId=${sch || childId}` },
    { name: 'videonew',   url: `${BASE}/api/pw/videonew?batchId=${bid}&subjectId=${sid}&childId=${childId}` },
  ];

  const debugLog = [];
  for (const ep of endpoints) {
    const data = await tryEndpoint(ep.url);
    const videoUrl = extractUrl(data);
    debugLog.push({ name: ep.name, gotUrl: !!videoUrl, preview: JSON.stringify(data || {}).substring(0, 200) });
    if (videoUrl) {
      console.log(`✅ Live [${ep.name}]:`, videoUrl.substring(0, 80));
      return res.json({ url: videoUrl, type: detectType(videoUrl), source: ep.name });
    }
  }

  return res.status(404).json({ error: 'Live stream not available', bid, sid, vid, sch, debug: debugLog });
}
