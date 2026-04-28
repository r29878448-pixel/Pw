import { getApiUrl } from '../../../lib/apiConfig';

export default async function handler(req, res) {
  const { batchId, childId, subjectId } = req.query;
  
  try {
    const baseUrl = await getApiUrl();
    const apiUrl = `${baseUrl}/api/pw/get-url?batchId=${batchId}&childId=${childId}&subjectId=${subjectId}`;
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
