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
      res.on('end', () => { clearTimeout(t); try { resolve(JSON.parse(d)); } catch (e) { resolve({ _raw: d.substring(0, 200) }); } });
    }).on('error', e => { clearTimeout(t); reject(e); });
  });
}

async function testBatch(batchId, subSlug, label) {
  console.log('\n========', label, '========');
  try {
    const traw = await getReq('/api/pw/topics?BatchId=' + batchId + '&SubjectId=' + subSlug);
    if (!traw.data) { console.log('Topics fail:', JSON.stringify(traw).substring(0, 100)); return; }
    const topics = decrypt(traw.data).data;
    const topicWithNotes = topics.find(t => t.notes > 0) || topics[0];
    console.log('Topic:', topicWithNotes.name, '| notes:', topicWithNotes.notes, '| videos:', topicWithNotes.lectureVideos);

    // Test notes
    const nraw = await getReq('/api/pw/datacontent?batchId=' + batchId + '&subjectSlug=' + subSlug + '&topicSlug=' + topicWithNotes.slug + '&contentType=notes');
    const notes = decrypt(nraw.data).data;
    if (Array.isArray(notes) && notes.length > 0) {
      let hasKey = false;
      notes.forEach(n => {
        (n.homeworkIds || []).forEach(hw => {
          (hw.attachmentIds || []).forEach(att => {
            if (att.key) hasKey = true;
          });
        });
      });
      console.log('Notes:', notes.length, '| Has PDF keys:', hasKey);
      if (hasKey) {
        const hw = notes[0].homeworkIds[0];
        const att = hw.attachmentIds[0];
        console.log('Sample PDF:', att.baseUrl + att.key);
      }
    }

    // Test videos
    const vraw = await getReq('/api/pw/datacontent?batchId=' + batchId + '&subjectSlug=' + subSlug + '&topicSlug=' + topicWithNotes.slug + '&contentType=videos');
    const videos = decrypt(vraw.data).data;
    if (Array.isArray(videos) && videos.length > 0) {
      const v = videos[0];
      const vd = v.videoDetails || {};
      console.log('Video URL:', vd.videoUrl || v.url);
      console.log('urlType:', v.urlType);
      console.log('drmProtected:', vd.drmProtected);
      console.log('types:', vd.types);
    }
  } catch (e) { console.log('ERR:', e.message); }
}

async function main() {
  // Test multiple batches to find ones with working PDFs and videos
  await testBatch('699eb68042fc3387632ca249', '-air--physics-795041', 'Prayas JEE AIR Physics');
  await testBatch('64468e214033fa0018880651', 'physics-436310', 'Parishram Physics');
  
  // Get a few more batches and test them
  const braw = await getReq('/api/pw/batches');
  const batches = decrypt(braw.data).data;
  // Find batches with common names
  const testBatches = batches.filter(b => 
    b.batchName && (b.batchName.includes('Arjuna') || b.batchName.includes('Lakshya') || b.batchName.includes('Yakeen'))
  ).slice(0, 3);
  
  for (const b of testBatches) {
    // Get subjects
    try {
      const postData = JSON.stringify({ searchParams: { BatchId: b.batchId } });
      const draw = await new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('timeout')), 12000);
        const opts = { hostname: 'apiserver-6hat.onrender.com', path: '/api/pw/batchdetails', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) } };
        const req = https.request(opts, (res) => { let d = ''; res.on('data', c => d += c); res.on('end', () => { clearTimeout(t); try { resolve(JSON.parse(d)); } catch (e) { resolve({}); } }); });
        req.on('error', e => { clearTimeout(t); reject(e); }); req.write(postData); req.end();
      });
      const subjects = decrypt(draw.data).data.subjects.filter(s => s.subject !== 'Notices');
      if (subjects.length > 0) {
        const sub = subjects[0];
        await testBatch(b.batchId, sub.slug, b.batchName + ' - ' + sub.subject);
      }
    } catch (e) { console.log(b.batchName, 'ERR:', e.message); }
  }
}
main().catch(e => console.log('ERR:', e.message));
