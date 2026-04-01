const crypto = require('crypto');
const https = require('https');

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

function getReq(path) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), 12000);
    https.get('https://apiserver-6hat.onrender.com' + path, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { clearTimeout(t); try { resolve({ status: res.statusCode, body: JSON.parse(d) }); } catch (e) { resolve({ status: res.statusCode, body: d.substring(0, 300) }); } });
    }).on('error', e => { clearTimeout(t); reject(e); });
  });
}

async function main() {
  const batchId = '699eb68042fc3387632ca249';
  const subSlug = '-air--physics-795041';
  const findKey = '69afdd2d4725e0bf43d65a72';

  // Test all 4 video APIs - full response
  const apis = [
    `/api/pw/videonew?batchId=${batchId}&subjectId=${subSlug}&childId=${findKey}`,
    `/api/pw/video?batchId=${batchId}&subjectId=${subSlug}&childId=${findKey}`,
    `/api/pw/videosuper?batchId=${batchId}&childId=${findKey}`,
    `/api/pw/videoplay?batchId=${batchId}&childId=${findKey}`,
  ];

  for (const path of apis) {
    const name = path.split('/api/pw/')[1].split('?')[0];
    try {
      const r = await getReq(path);
      console.log('\n' + name + ' status:', r.status);
      if (typeof r.body === 'object' && r.body.data && typeof r.body.data === 'string') {
        try {
          const dec = decrypt(r.body.data);
          console.log(name + ' decrypted:', JSON.stringify(dec).substring(0, 400));
        } catch (e) {
          console.log(name + ' raw data:', r.body.data.substring(0, 100));
        }
      } else {
        console.log(name + ' body:', JSON.stringify(r.body).substring(0, 300));
      }
    } catch (e) { console.log(name + ' ERR:', e.message); }
  }
}
main().catch(e => console.log('ERR:', e.message));
