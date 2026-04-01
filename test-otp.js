const https = require('https');
const crypto = require('crypto');

function decrypt(payload) {
  const [ivHex, dataHex] = payload.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const data = Buffer.from(dataHex, 'hex');
  const key = Buffer.alloc(32);
  Buffer.from('maggikhalo').copy(key);
  const authTag = data.slice(-16);
  const encData = data.slice(0, -16);
  const d = crypto.createDecipheriv('aes-256-gcm', key, iv);
  d.setAuthTag(authTag);
  return JSON.parse(d.update(encData, null, 'utf8') + d.final('utf8'));
}

function get(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), 15000);
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', ...headers } }, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => {
        clearTimeout(t);
        try { resolve({ status: res.statusCode, json: JSON.parse(d), raw: d }); }
        catch (e) { resolve({ status: res.statusCode, json: null, raw: d }); }
      });
    }).on('error', e => { clearTimeout(t); reject(e); });
  });
}

async function main() {
  const BASE = 'https://apiserver-skpg.onrender.com';
  const mpdUrl = 'https://d1d34p8vz63oiq.cloudfront.net/a179b397-2590-4e60-b890-17e715630848/master.mpd';
  const findKey = '69b7e804e99c9bd2e15baec9';

  // Step 1: Fetch MPD via proxy to get KID
  console.log('=== Step 1: Fetch MPD via proxy ===');
  const proxyUrl = `${BASE}/api/proxy?url=${encodeURIComponent(mpdUrl)}`;
  const r1 = await get(proxyUrl);
  console.log('Proxy status:', r1.status);
  
  let kid = null;
  if (r1.raw && r1.raw.includes('<?xml')) {
    console.log('MPD XML found!');
    // Extract KID
    const patterns = [
      /default_KID="([a-f0-9-]{36})"/i,
      /cenc:default_KID="([a-f0-9-]{36})"/i,
      /KID="([a-f0-9-]{36})"/i,
      /kid="([a-f0-9-]{36})"/i,
    ];
    for (const p of patterns) {
      const m = r1.raw.match(p);
      if (m) { kid = m[1].replace(/-/g, '').toLowerCase(); break; }
    }
    console.log('Extracted KID:', kid);
    console.log('MPD preview:', r1.raw.substring(0, 500));
  } else {
    console.log('Proxy failed, raw:', r1.raw.substring(0, 200));
  }

  // Step 2: Try OTP with KID and findKey
  console.log('\n=== Step 2: OTP API ===');
  const otpIds = [kid, findKey].filter(Boolean);
  
  for (const id of otpIds) {
    for (const server of [BASE, 'https://apiserver-6hat.onrender.com']) {
      const url = `${server}/api/pw/otp?kid=${id}`;
      const r = await get(url);
      const sname = server.includes('skpg') ? 'skpg' : '6hat';
      
      if (r.json?.data && typeof r.json.data === 'string') {
        try {
          const dec = decrypt(r.json.data);
          console.log(`✅ OTP (${sname}, kid=${id.substring(0,8)}...):`, JSON.stringify(dec));
        } catch (e) {
          console.log(`❌ OTP (${sname}) decrypt fail:`, r.json.data.substring(0, 50));
        }
      } else {
        console.log(`❌ OTP (${sname}, kid=${id.substring(0,8)}...): ${r.status}`, JSON.stringify(r.json || r.raw).substring(0, 100));
      }
    }
  }

  // Step 3: Check if MPD is accessible via different proxy
  console.log('\n=== Step 3: MPD access test ===');
  const proxies = [
    `${BASE}/api/proxy?url=${encodeURIComponent(mpdUrl)}`,
    `https://apiserver-6hat.onrender.com/api/proxy?url=${encodeURIComponent(mpdUrl)}`,
  ];
  for (const p of proxies) {
    const r = await get(p);
    const server = p.includes('skpg') ? 'skpg' : '6hat';
    console.log(`Proxy (${server}): ${r.status}`, r.raw.includes('<?xml') ? 'MPD OK' : r.raw.substring(0, 80));
  }
}
main().catch(e => console.log('ERR:', e.message));
