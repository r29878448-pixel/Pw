/**
 * GET /api/stream?url=encodedUrl
 * Proxies MPD/M3U8/TS segments from CloudFront
 * Adds proper headers to bypass CORS
 */
export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url required' });

  const targetUrl = decodeURIComponent(url);

  try {
    const r = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.pw.live/',
        'Origin': 'https://www.pw.live',
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!r.ok) {
      return res.status(r.status).json({ error: `Upstream ${r.status}`, url: targetUrl });
    }

    const contentType = r.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=300');

    // For M3U8 — rewrite segment URLs to go through proxy
    if (targetUrl.endsWith('.m3u8') || contentType.includes('mpegurl')) {
      let text = await r.text();
      const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);

      // Rewrite relative URLs in M3U8 to absolute proxied URLs
      text = text.replace(/^(?!#)(.+\.m3u8.*)$/gm, (match) => {
        if (match.startsWith('http')) {
          return `/api/stream?url=${encodeURIComponent(match)}`;
        }
        return `/api/stream?url=${encodeURIComponent(baseUrl + match)}`;
      });
      text = text.replace(/^(?!#)(.+\.ts.*)$/gm, (match) => {
        if (match.startsWith('http')) return match; // TS segments direct
        return baseUrl + match;
      });

      return res.send(text);
    }

    // For MPD/other — stream directly
    const buf = await r.arrayBuffer();
    res.send(Buffer.from(buf));
  } catch (e) {
    res.status(500).json({ error: e.message, url: targetUrl });
  }
}

export const config = {
  api: { responseLimit: '50mb' },
};
