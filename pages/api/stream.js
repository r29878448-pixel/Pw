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

    // MPD — handle URLPrefix parameter (PW specific)
    if (targetUrl.includes('.mpd') || ct.includes('dash+xml')) {
      let text = await r.text();
      
      // Extract URLPrefix from query params
      try {
        const urlObj = new URL(targetUrl);
        const urlPrefix = urlObj.searchParams.get('URLPrefix');
        
        if (urlPrefix) {
          // Decode base64 URLPrefix
          const decodedPrefix = Buffer.from(urlPrefix, 'base64').toString('utf-8');
          console.log('🔧 MPD URLPrefix decoded:', decodedPrefix);
          
          // Replace BaseURL in MPD with decoded prefix
          text = text.replace(/<BaseURL>([^<]+)<\/BaseURL>/g, (match, url) => {
            // If BaseURL is relative, prepend the decoded prefix
            if (!url.startsWith('http')) {
              const newUrl = decodedPrefix.endsWith('/') ? decodedPrefix + url : decodedPrefix + '/' + url;
              console.log('🔧 Rewriting BaseURL:', url, '→', newUrl);
              return `<BaseURL>${newUrl}</BaseURL>`;
            }
            return match;
          });
          
          // Also handle media attribute URLs
          text = text.replace(/media="([^"]+)"/g, (match, url) => {
            if (!url.startsWith('http')) {
              const newUrl = decodedPrefix.endsWith('/') ? decodedPrefix + url : decodedPrefix + '/' + url;
              return `media="${newUrl}"`;
            }
            return match;
          });
        }
      } catch (e) {
        console.error('❌ Failed to process URLPrefix:', e);
      }
      
      res.setHeader('Content-Type', 'application/dash+xml');
      return res.send(text);
    }

    // Everything else — pipe through
    const buf = await r.arrayBuffer();
    return res.send(Buffer.from(buf));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export const config = { api: { responseLimit: '50mb' } };
