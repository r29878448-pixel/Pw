import { getApiUrl } from '../../../lib/apiConfig';

export default async function handler(req, res) {
  const { batchId, childId, subjectId } = req.query;
  
  try {
    const baseUrl = await getApiUrl();
    const apiUrl = `${baseUrl}/api/pw/get-urls?batchId=${batchId}&childId=${childId}&subjectId=${subjectId}`;
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    // Handle MPD URLs - ensure they're properly formatted
    if (data.success && Array.isArray(data.data) && data.data.length > 0) {
      data.data = data.data.map(item => {
        if (item.url) {
          // If URL is already MPD, keep it as is
          // If it's M3U8, the player will convert it
          return {
            ...item,
            url: item.url,
            type: item.type || (item.url.includes('youtube') ? 'youtube' : 'video')
          };
        }
        return item;
      });
    }
    
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
