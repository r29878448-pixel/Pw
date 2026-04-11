/**
 * GET /api/stream?url=encodedSignedUrl
 * Proxies signed CDN URLs — the URL already has auth (CloudFront signature).
 * No special headers needed, just forward the full signed URL.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url required' });

  const targetUrl = decodeURIComponent(url);

  try {
    // Signed CloudFront URLs don't need extra headers — just fetch them
    const r = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(25000),
    });

    if (!r.ok) {
      return res.status(r.status).json({ error: `CDN ${r.status}`, url: targetUrl.substring(0, 100) });
    }

    const ct = r.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', ct);
    res.setHeader('Cache-Control', 'public, max-age=300');

    // M3U8 — rewrite segment URLs through proxy
    if (targetUrl.includes('.m3u8') || ct.includes('mpegurl')) {
      let text = await r.text();
      const base = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);
      text = text.replace(/^(?!#)(.+\.m3u8.*)$/gm, m => {
        const abs = m.startsWith('http') ? m : base + m;
        return `/api/stream?url=${encodeURIComponent(abs)}`;
      });
      text = text.replace(/^(?!#)(.+\.ts.*)$/gm, m => m.startsWith('http') ? m : base + m);
      return res.send(text);
    }

    // MPD and everything else — pipe through
    const buf = await r.arrayBuffer();
    return res.send(Buffer.from(buf));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export const config = { api: { responseLimit: '50mb' } };
