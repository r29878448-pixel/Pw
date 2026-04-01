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
  // Use Parishram batch which has empty keys
  const batchId = '64468e214033fa0018880651';
  const subSlug = 'physics-436310';
  const subjectId = '6448aa5dfb4acc00189b1458'; // from earlier test

  // Get topics and notes
  const traw = await getReq('/api/pw/topics?BatchId=' + batchId + '&SubjectId=' + subSlug);
  const topics = decrypt(traw.data).data;
  const topic = topics.find(t => t.notes > 0) || topics[0];
  console.log('Topic:', topic.name, topic.slug);

  const nraw = await getReq('/api/pw/datacontent?batchId=' + batchId + '&subjectSlug=' + subSlug + '&topicSlug=' + topic.slug + '&contentType=notes');
  const notes = decrypt(nraw.data).data;
  const note = notes[0];
  const hw = note.homeworkIds[0];
  const scheduleId = note._id;
  const hwId = hw._id;
  const attId = hw.attachmentIds[0]._id;

  console.log('scheduleId (note._id):', scheduleId);
  console.log('hwId:', hwId);
  console.log('attId:', attId);
  console.log('batchSubjectId:', hw.batchSubjectId);

  // Try attachments-url API with different param combos
  const tests = [
    `/api/pw/attachments-url?BatchId=${batchId}&SubjectId=${subSlug}&ContentId=${scheduleId}`,
    `/api/pw/attachments-url?BatchId=${batchId}&SubjectId=${subjectId}&ContentId=${scheduleId}`,
    `/api/pw/attachments-url?BatchId=${batchId}&SubjectId=${hw.batchSubjectId}&ContentId=${scheduleId}`,
    `/api/pw/attachment-link?batchId=${batchId}&subjectId=${subSlug}&scheduleId=${scheduleId}`,
    `/api/pw/attachment-link?batchId=${batchId}&subjectId=${subjectId}&scheduleId=${scheduleId}`,
    `/api/pw/attachment-link?batchId=${batchId}&subjectId=${hw.batchSubjectId}&scheduleId=${scheduleId}`,
    `/api/pw/attachments-url?BatchId=${batchId}&SubjectId=${subSlug}&ContentId=${hwId}`,
    `/api/pw/attachments-url?BatchId=${batchId}&SubjectId=${subSlug}&ContentId=${attId}`,
  ];

  for (const path of tests) {
    try {
      const r = await getReq(path);
      const paramStr = path.split('?')[1];
      if (r.data && typeof r.data === 'string') {
        const dec = decrypt(r.data);
        const url = dec?.url || dec?.pdfUrl || dec?.attachmentUrl || dec?.link || dec?.data?.url;
        if (url) {
          console.log('\n✅ SUCCESS:', paramStr);
          console.log('URL:', url);
        } else {
          console.log('❌', paramStr, '->', JSON.stringify(dec).substring(0, 100));
        }
      } else if (r.url || r.pdfUrl || r.link) {
        console.log('\n✅ PLAIN SUCCESS:', paramStr);
        console.log('URL:', r.url || r.pdfUrl || r.link);
      } else {
        console.log('❌', paramStr, '->', JSON.stringify(r).substring(0, 100));
      }
    } catch (e) { console.log('ERR:', e.message); }
  }

  // Also test video URL APIs
  console.log('\n--- Video URL APIs ---');
  const vraw = await getReq('/api/pw/datacontent?batchId=' + batchId + '&subjectSlug=' + subSlug + '&topicSlug=' + topic.slug + '&contentType=videos');
  const vdec = decrypt(vraw.data);
  const videos = vdec.data;
  if (videos && videos.length > 0) {
    const v = videos[0];
    const findKey = v.videoDetails?.findKey || v._id;
    console.log('findKey:', findKey, '| urlType:', v.urlType);
    
    const videoTests = [
      `/api/pw/videonew?batchId=${batchId}&subjectId=${subSlug}&childId=${findKey}`,
      `/api/pw/video?batchId=${batchId}&subjectId=${subSlug}&childId=${findKey}`,
      `/api/pw/videosuper?batchId=${batchId}&childId=${findKey}`,
      `/api/pw/videoplay?batchId=${batchId}&childId=${findKey}`,
    ];
    for (const path of videoTests) {
      try {
        const r = await getReq(path);
        const name = path.split('/api/pw/')[1].split('?')[0];
        if (r.data && typeof r.data === 'string') {
          const dec = decrypt(r.data);
          const url = dec?.url || dec?.videoUrl || dec?.data?.url || dec?.data?.videoUrl;
          if (url) console.log('✅', name, ':', url.substring(0, 80));
          else console.log('❌', name, ':', JSON.stringify(dec).substring(0, 100));
        } else {
          const url = r?.url || r?.videoUrl || r?.data?.url;
          if (url) console.log('✅', name, '(plain):', url.substring(0, 80));
          else console.log('❌', name, ':', JSON.stringify(r).substring(0, 100));
        }
      } catch (e) { console.log('ERR:', e.message); }
    }
  } else {
    console.log('No videos in this topic');
  }
}
main().catch(e => console.log('ERR:', e.message));
