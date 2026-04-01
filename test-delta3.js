const https = require('https');

function get(url) {
  return new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('timeout')), 10000);
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (r) => {
      let d = ''; r.on('data', c => d += c);
      r.on('end', () => { clearTimeout(t); res({ status: r.statusCode, body: d }); });
    }).on('error', e => { clearTimeout(t); rej(e); });
  });
}

async function main() {
  const findKey = '69b7e804e99c9bd2e15baec9';
  const batchId = '69897f0ad7c19b7b2f7cc35f';
  const subSlug = 'notices-481478';
  const subjectId = '699e91d03aea6d639b21d541';
  const topicSlug = 'batch-demo-videos-763541';
  const scheduleId = '69b7e804e99c9bd2e15baec9';

  // Test all player URLs
  const players = [
    `https://apiserver-skpg.onrender.com/pw/drm/play?video_id=${findKey}&subject_slug=${subSlug}&batch_id=${batchId}&schedule_id=${scheduleId}&subject_id=${subjectId}&topicSlug=${topicSlug}`,
    `https://apiserver-6hat.onrender.com/pw/drm/play?video_id=${findKey}&subject_slug=${subSlug}&batch_id=${batchId}&schedule_id=${scheduleId}&subject_id=${subjectId}&topicSlug=${topicSlug}`,
    `https://apiserver-skpg.onrender.com/pw/drm/apple/play?video_id=${findKey}`,
  ];

  for (const url of players) {
    const r = await get(url);
    const hasError = r.body.includes('Application error') || r.body.includes('Error');
    const hasPlayer = r.body.includes('video') || r.body.includes('player') || r.body.includes('shaka');
    console.log(url.split('//')[1].split('/')[0], url.split('/pw/')[1].split('?')[0], ':', r.status, hasError ? 'ERROR' : hasPlayer ? 'PLAYER OK' : 'UNKNOWN');
    if (!hasError && r.status === 200) console.log('  -> WORKS!');
  }
}
main().catch(e => console.log('ERR:', e.message));
