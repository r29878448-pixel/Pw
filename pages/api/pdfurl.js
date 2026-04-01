/**
 * GET /api/pdfurl?batchId=X&subjectId=Y&scheduleId=Z
 * Fetches PDF URL using attachments-url then attachment-link fallback
 */
const { safeDecrypt } = require('../../lib/decrypt');

// Use default API URL directly in API routes (server-side)
const DEFAULT_API_URL = 'https://adc.onrender.app';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Use default API URL for server-side requests
  const PW = DEFAULT_API_URL;
  
  const { batchId, subjectId, scheduleId } = req.query;
  if (!batchId || !subjectId || !scheduleId)
    return res.status(400).json({ error: 'batchId, subjectId, scheduleId required' });

  // API 1: attachments-url — returns plain JSON { success, data: [{topic, baseUrl, key, url}] }
  try {
    const r = await fetch(
      `${PW}/api/pw/attachments-url?BatchId=${batchId}&SubjectId=${subjectId}&ContentId=${scheduleId}`,
      { signal: AbortSignal.timeout(15000) }
    );
    if (r.ok) {
      const json = await r.json();
      // Try decrypt if encrypted
      let data = json;
      if (json?.data && typeof json.data === 'string') {
        data = safeDecrypt(json.data) || json;
      }
      const list = data?.data || data;
      if (Array.isArray(list) && list.length > 0) {
        const pdfs = list
          .filter(item => item.url || (item.baseUrl && item.key))
          .map(item => ({
            url: item.url || (item.baseUrl + item.key),
            name: item.name || item.topic || 'document.pdf',
            topic: item.topic || 'Document',
          }));
        if (pdfs.length > 0) return res.json({ pdfs });
      }
    }
  } catch (_) {}

  // API 2: attachment-link fallback
  try {
    const r = await fetch(
      `${PW}/api/pw/attachment-link?batchId=${batchId}&subjectId=${subjectId}&scheduleId=${scheduleId}`,
      { signal: AbortSignal.timeout(15000) }
    );
    if (r.ok) {
      const json = await r.json();
      let data = json;
      if (json?.data && typeof json.data === 'string') {
        data = safeDecrypt(json.data) || json;
      }
      const list = data?.data || data;
      if (Array.isArray(list) && list.length > 0) {
        const pdfs = list
          .filter(item => item.url || (item.baseUrl && item.key))
          .map(item => ({
            url: item.url || (item.baseUrl + item.key),
            name: item.name || item.topic || 'document.pdf',
            topic: item.topic || 'Document',
          }));
        if (pdfs.length > 0) return res.json({ pdfs });
      }
    }
  } catch (_) {}

  return res.status(404).json({ error: 'No PDF URL found', pdfs: [] });
}
