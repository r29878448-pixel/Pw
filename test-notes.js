// Test the /api/content endpoint directly via HTTP
const http = require('http');

function getLocal(path) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), 10000);
    http.get('http://localhost:3001' + path, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        clearTimeout(t);
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch (e) { resolve({ status: res.statusCode, body: d.substring(0, 300) }); }
      });
    }).on('error', e => { clearTimeout(t); reject(e); });
  });
}

async function main() {
  const batchId = '699eb68042fc3387632ca249';
  const subSlug = encodeURIComponent('-air--physics-795041');
  const topicSlug = encodeURIComponent('kinematics-488134');

  console.log('Testing /api/content for notes...');
  const r = await getLocal(`/api/content?batchId=${batchId}&subjectSlug=${subSlug}&topicSlug=${topicSlug}&contentType=notes`);
  console.log('Status:', r.status);
  console.log('Response keys:', typeof r.body === 'object' ? Object.keys(r.body) : 'string');
  
  if (r.body && r.body.data) {
    const notes = r.body.data;
    console.log('data type:', typeof notes, Array.isArray(notes) ? 'array len:' + notes.length : '');
    if (Array.isArray(notes) && notes.length > 0) {
      const n = notes[0];
      console.log('Note[0] keys:', Object.keys(n));
      console.log('homeworkIds:', n.homeworkIds && n.homeworkIds.length);
      if (n.homeworkIds && n.homeworkIds[0]) {
        const hw = n.homeworkIds[0];
        console.log('HW attachmentIds:', hw.attachmentIds && hw.attachmentIds.length);
        if (hw.attachmentIds && hw.attachmentIds[0]) {
          const att = hw.attachmentIds[0];
          console.log('att.key:', JSON.stringify(att.key));
          console.log('att.baseUrl:', att.baseUrl);
        }
      }
    }
  } else {
    console.log('Full response:', JSON.stringify(r.body).substring(0, 500));
  }
}
main().catch(e => console.log('ERR:', e.message));
