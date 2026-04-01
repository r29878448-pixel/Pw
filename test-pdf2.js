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
    const t = setTimeout(() => reject(new Error('timeout')), 15000);
    https.get('https://apiserver-6hat.onrender.com' + path, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { clearTimeout(t); try { resolve(JSON.parse(d)); } catch (e) { resolve({ _raw: d.substring(0, 300) }); } });
    }).on('error', e => { clearTimeout(t); reject(e); });
  });
}

async function main() {
  const batchId = '64468e214033fa0018880651';
  const subjectId = '6448aa5dfb4acc00189b1458';
  const scheduleId = '65944de2c2000c001859602a';

  // Full response from attachment-link
  const r = await getReq(`/api/pw/attachment-link?batchId=${batchId}&subjectId=${subjectId}&scheduleId=${scheduleId}`);
  console.log('attachment-link full response:');
  console.log(JSON.stringify(r, null, 2).substring(0, 1000));

  // Full response from attachments-url
  const r2 = await getReq(`/api/pw/attachments-url?BatchId=${batchId}&SubjectId=${subjectId}&ContentId=${scheduleId}`);
  console.log('\nattachments-url full response:');
  console.log(JSON.stringify(r2, null, 2).substring(0, 1000));
}
main().catch(e => console.log('ERR:', e.message));
