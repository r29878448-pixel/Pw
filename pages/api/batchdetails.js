const { safeDecrypt } = require('../../lib/decrypt');
const { db } = require('../../lib/firebase');
const { doc, getDoc } = require('firebase/firestore');

// Get API URL from Firebase
async function getApiUrl() {
  try {
    const docRef = doc(db, 'config', 'api');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data().baseUrl || 'https://adc.onrender.app';
    }
  } catch (error) {
    console.error('Error loading API URL:', error);
  }
  return 'https://adc.onrender.app'; // Fallback
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Get API URL from Firebase
  const PW = await getApiUrl();
  console.log('Using API:', PW);
  
  const { batchId } = req.query;
  if (!batchId) return res.status(400).json({ error: 'batchId required' });
  try {
    const r = await fetch(`${PW}/api/pw/batchdetails`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ searchParams: { BatchId: batchId } }),
      signal: AbortSignal.timeout(30000),
    });
    const json = await r.json();
    const dec = safeDecrypt(json?.data);
    if (!dec) return res.status(500).json({ error: 'Decrypt failed' });
    res.json(dec);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
