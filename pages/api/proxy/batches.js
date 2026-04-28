/**
 * Proxy endpoint for /api/pw/batches
 * Handles CORS by proxying requests through our server
 */

import { getApiUrl } from '../../../lib/apiConfig';

export default async function handler(req, res) {
  try {
    // Get API URL from Firebase
    const apiUrl = await getApiUrl();
    
    console.log('🔗 Batches Proxy - API URL:', apiUrl);
    
    if (!apiUrl) {
      console.error('❌ API URL not configured');
      return res.status(500).json({ error: 'API not configured' });
    }

    const targetUrl = `${apiUrl}/api/pw/batches`;
    console.log('📡 Fetching from:', targetUrl);

    // Fetch from external API
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('📥 Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API error response:', errorText);
      throw new Error(`API responded with status ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Batches data received:', data ? 'Yes' : 'No');
    console.log('📦 Data structure:', Object.keys(data || {}));
    
    // Return the data
    res.status(200).json(data);
  } catch (error) {
    console.error('❌ Batches proxy error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch batches' });
  }
}
