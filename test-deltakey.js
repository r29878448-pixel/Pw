const https = require('https');

function get(url) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), 10000);
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { clearTimeout(t); resolve({ status: res.statusCode, body: d, headers: res.headers }); });
    }).on('error', e => { clearTimeout(t); reject(e); });
  });
}

async function main() {
  const r = await get('https://deltastudy.site/deltakeydone');
  console.log('Status:', r.status);
  console.log('Headers:', JSON.stringify(r.headers).substring(0, 200));
  console.log('Body (first 1000):', r.body.substring(0, 1000));
  
  // Check for key in response
  if (r.body.includes('delta-access-key') || r.body.includes('key')) {
    console.log('\nKEY RELATED CONTENT FOUND');
    const keyMatch = r.body.match(/[a-f0-9]{32,64}/g);
    if (keyMatch) console.log('Possible keys:', keyMatch.slice(0, 5));
  }
}
main().catch(e => console.log('ERR:', e.message));
