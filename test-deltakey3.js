const https = require('https');

function get(url) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), 15000);
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { clearTimeout(t); resolve(d); });
    }).on('error', e => { clearTimeout(t); reject(e); });
  });
}

async function main() {
  const base = 'https://deltastudy.site';
  const html = await get(base + '/deltakeydone');
  
  const chunks = [...html.matchAll(/src="(\/_next\/static\/chunks\/[^"]+\.js[^"]*)"/g)].map(m => m[1]);
  
  // Get the page-specific chunk
  const pageChunk = chunks.find(c => c.includes('page-'));
  if (!pageChunk) { console.log('No page chunk found'); return; }
  
  console.log('Page chunk:', pageChunk);
  const js = await get(base + pageChunk);
  
  // Find the full deltakeydone component
  const idx = js.indexOf('deltakeydone');
  if (idx > -1) {
    console.log('\ndeltakeydone context (500 chars):');
    console.log(js.substring(Math.max(0, idx - 100), idx + 500));
  }
  
  // Find localStorage.setItem with key
  const setIdx = js.indexOf('localStorage.setItem(i.Df');
  if (setIdx > -1) {
    console.log('\nsetItem context (800 chars):');
    console.log(js.substring(Math.max(0, setIdx - 400), setIdx + 400));
  }
  
  // Find where key value 's' comes from
  // Look for fetch call or hardcoded value
  const fetchIdx = js.indexOf('fetch(');
  if (fetchIdx > -1) {
    console.log('\nfetch context:');
    console.log(js.substring(fetchIdx, fetchIdx + 300));
  }
  
  // Find any hardcoded key value
  const keyMatch = js.match(/['"](delta-key-[^'"]{10,})['"]/g);
  if (keyMatch) console.log('\nHardcoded keys:', keyMatch);
  
  // Find expiration logic
  const expIdx = js.indexOf('delta-key-expiration');
  if (expIdx > -1) {
    console.log('\nExpiration context:');
    console.log(js.substring(Math.max(0, expIdx - 200), expIdx + 300));
  }
}
main().catch(e => console.log('ERR:', e.message));
