const https = require('https');

function get(url) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), 15000);
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { clearTimeout(t); resolve({ status: res.statusCode, body: d }); });
    }).on('error', e => { clearTimeout(t); reject(e); });
  });
}

async function main() {
  const base = 'https://deltastudy.site';
  const html = (await get(base + '/deltakeydone')).body;
  
  // Get all page-specific chunks
  const chunks = [...html.matchAll(/src="(\/_next\/static\/chunks\/[^"]+\.js[^"]*)"/g)].map(m => m[1]);
  const pageChunks = chunks.filter(c => !c.includes('webpack') && !c.includes('framework') && !c.includes('polyfills'));
  
  console.log('Checking', pageChunks.length, 'chunks...\n');
  
  for (const chunk of pageChunks) {
    try {
      const js = (await get(base + chunk)).body;
      
      // Look for key generation logic
      if (js.includes('deltakeydone') || js.includes('delta-access-key') || js.includes('generateKey') || js.includes('setItem')) {
        console.log('=== FOUND in:', chunk.split('/').pop().substring(0, 50), '===');
        
        // Find key generation
        if (js.includes('delta-access-key')) {
          const idx = js.indexOf('delta-access-key');
          console.log('Key context:', js.substring(Math.max(0, idx - 200), idx + 400));
        }
        
        // Find setItem calls
        const setItems = js.match(/localStorage\.setItem\([^)]+\)/g) || [];
        if (setItems.length) console.log('localStorage.setItem calls:', setItems);
        
        // Find key value patterns
        const keyPatterns = js.match(/['"](delta-[^'"]+)['"]/g) || [];
        if (keyPatterns.length) console.log('Delta keys:', [...new Set(keyPatterns)]);
      }
    } catch (e) {}
  }
}
main().catch(e => console.log('ERR:', e.message));
