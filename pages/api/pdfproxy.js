/**
 * GET /api/pdfproxy?url=...&filename=...&dl=1
 * Proxies PDF files to avoid CORS issues
 */
export default async function handler(req, res) {
  const { url, filename, dl } = req.query;
  if (!url) return res.status(400).json({ error: 'url required' });

  try {
    const decoded = decodeURIComponent(url);
    const r = await fetch(decoded, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/pdf,*/*',
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!r.ok) throw new Error(`Upstream ${r.status}`);

    const ct = r.headers.get('content-type') || 'application/pdf';
    const fname = filename ? decodeURIComponent(filename) : 'document.pdf';
    const disposition = dl === '1' ? 'attachment' : 'inline';

    res.setHeader('Content-Type', ct);
    res.setHeader('Content-Disposition', `${disposition}; filename="${fname}"`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=3600');

    const buf = await r.arrayBuffer();
    res.send(Buffer.from(buf));
  } catch (e) {
    console.error('pdfproxy error:', e.message);
    res.status(500).json({ error: e.message });
  }
}

export const config = {
  api: { responseLimit: '50mb' },
};
