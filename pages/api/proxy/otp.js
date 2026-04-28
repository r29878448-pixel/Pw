import { getApiUrl } from '../../../lib/apiConfig';

export default async function handler(req, res) {
  const { kid } = req.query;
  
  try {
    const baseUrl = await getApiUrl();
    const apiUrl = `${baseUrl}/api/pw/otp?kid=${kid}`;
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
