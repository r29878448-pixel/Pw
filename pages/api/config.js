/**
 * GET /config
 * Returns the admin-configured base API URL from Firebase.
 * Frontend fetches this on load to avoid any hardcoded URLs.
 */
const { getApiUrlFromFirebase } = require('../../lib/firebaseAdmin');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  try {
    const base_url = await getApiUrlFromFirebase();
    return res.json({ base_url });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to load config', detail: e.message });
  }
}
