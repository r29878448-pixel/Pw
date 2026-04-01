const https = require('https');

const url = 'https://deltastudy.site/pw/drm/play?video_id=69b7e804e99c9bd2e15baec9&subject_slug=notices-481478&batch_id=69897f0ad7c19b7b2f7cc35f&schedule_id=69b7e804e99c9bd2e15baec9&subject_id=699e91d03aea6d639b21d541&topicSlug=batch-demo-videos-763541';

https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    // Check access key
    if (d.includes('delta-access-key')) console.log('NEEDS: delta-access-key');
    if (d.includes('delta-auth')) console.log('NEEDS: delta-auth redirect');
    if (d.includes('localStorage')) console.log('Uses localStorage');
    
    // Find API base URL used
    const apiMatch = d.match(/apiserver[a-z0-9-]+\.onrender\.com/g);
    if (apiMatch) console.log('API servers:', [...new Set(apiMatch)]);
    
    // Check for error indicators
    if (d.includes('Application error')) console.log('Has Application error text');
    
    // Find any hardcoded config
    const configMatch = d.match(/"[a-z]+":\s*"https:\/\/[^"]+"/g);
    if (configMatch) console.log('Config URLs:', configMatch.slice(0, 5));
    
    console.log('\nPage size:', d.length, 'bytes');
    console.log('First 500:', d.substring(0, 500));
  });
}).on('error', e => console.log('ERR:', e.message));
