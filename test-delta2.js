const https = require('https');

function get(url) {
  return new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('timeout')), 10000);
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (r) => {
      let d = ''; r.on('data', c => d += c);
      r.on('end', () => { clearTimeout(t); res(d); });
    }).on('error', e => { clearTimeout(t); rej(e); });
  });
}

async function main() {
  const base = 'https://deltastudy.site';
  const html = await get(base + '/pw/drm/play?video_id=69b7e804e99c9bd2e15baec9&subject_slug=notices-481478&batch_id=69897f0ad7c19b7b2f7cc35f&schedule_id=69b7e804e99c9bd2e15baec9&subject_id=699e91d03aea6d639b21d541&topicSlug=batch-demo-videos-763541');
  
  console.log('HTML size:', html.length);
  
  // Find all JS chunks
  const chunks = [...html.matchAll(/src="(\/_next\/static\/chunks\/[^"]+\.js[^"]*)"/g)].map(m => m[1]);
  console.log('JS chunks:', chunks.length);
  
  // Check one of the page-specific chunks (not webpack/framework)
  const pageChunks = chunks.filter(c => !c.includes('webpack') && !c.includes('framework') && !c.includes('polyfills'));
  console.log('Page chunks:', pageChunks.slice(0, 3));
  
  for (const chunk of pageChunks.slice(0, 2)) {
    try {
      const js = await get(base + chunk);
      console.log('\nChunk:', chunk.split('/').pop().substring(0, 40), 'size:', js.length);
      if (js.includes('delta-access-key')) console.log('  -> HAS delta-access-key');
      if (js.includes('maggikhalo')) console.log('  -> HAS maggikhalo key');
      if (js.includes('apiserver')) {
        const apis = [...new Set(js.match(/apiserver[a-z0-9-]+\.onrender\.com/g) || [])];
        console.log('  -> API servers:', apis);
      }
      if (js.includes('delta-auth')) console.log('  -> HAS delta-auth');
      if (js.includes('localStorage')) console.log('  -> Uses localStorage');
    } catch (e) {
      console.log('Chunk fetch error:', e.message);
    }
  }
}

main().catch(e => console.log('ERR:', e.message));
