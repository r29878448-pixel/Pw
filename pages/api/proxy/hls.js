/**
 * HLS Proxy - fetches m3u8 playlists and ts segments server-side to avoid CORS
 */
export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url required' });

  try {
    const targetUrl = decodeURIComponent(url);
    const response = await fetch(targetUrl);

    if (!response.ok) {
      return res.status(response.status).json({ error: `Upstream ${response.status}` });
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    // For m3u8 - return as text
    if (targetUrl.includes('.m3u8') || contentType.includes('mpegurl')) {
      const text = await response.text();
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(200).send(text);
    }

    // For ts segments - stream binary
    const buffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'video/mp2t');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Length', buffer.byteLength);
    return res.status(200).send(Buffer.from(buffer));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export const config = {
  api: { responseLimit: '100mb' },
};
