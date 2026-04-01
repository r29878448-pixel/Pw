const https = require('https');

function getUrl(url, headers = {}) {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve({ status: 'timeout' }), 8000);
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', ...headers } }, (res) => {
      clearTimeout(t);
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d.substring(0, 200), headers: res.headers }));
    });
    req.on('error', () => { clearTimeout(t); resolve({ status: 'error' }); });
  });
}

async function main() {
  const videoId = '5e3d8ae0-d0df-42d3-a203-cb1894919425';
  
  // Try various PenPencil/PW streaming endpoints
  const tests = [
    // Direct penpencil CDN
    `https://d26g5bnklkwsh4.cloudfront.net/${videoId}/master.m3u8`,
    `https://d1d34p8vz63oiq.cloudfront.net/${videoId}/master.m3u8`,
    // With pw.live referer
    { url: `https://d1d34p8vz63oiq.cloudfront.net/${videoId}/master.m3u8`, headers: { 'Referer': 'https://www.pw.live/', 'Origin': 'https://www.pw.live' } },
    // PenPencil API for stream URL
    `https://api.penpencil.co/v1/videos/${videoId}/get-otp`,
    `https://api.penpencil.co/v3/videos/${videoId}/get-otp`,
    // VdoCipher style
    `https://player.vdocipher.com/v2/?otp=&playbackInfo=`,
  ];

  for (const test of tests) {
    const url = typeof test === 'string' ? test : test.url;
    const headers = typeof test === 'object' ? test.headers : {};
    const r = await getUrl(url, headers);
    console.log(url.substring(0, 70), '->', r.status);
    if (r.status === 200) console.log('  BODY:', r.body.substring(0, 100));
  }
}
main().catch(e => console.log('ERR:', e.message));
