/**
 * Fetches real marketplace statistics for Veverke.chatwizard
 */
const https = await import('https');

function httpsPost(url, body) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const data = JSON.stringify(body);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json;api-version=7.2-preview.1',
        'Content-Length': Buffer.byteLength(data),
      },
    };
    const req = https.request(options, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => resolve(JSON.parse(d)));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'user-agent': 'node' } }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => resolve(d));
    }).on('error', reject);
  });
}

try {
  // Fetch VS Marketplace stats
  const vsData = await httpsPost(
    'https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery',
    { filters: [{ criteria: [{ filterType: 7, value: 'Veverke.chatwizard' }] }], flags: 914 }
  );
  
  if (vsData?.results?.[0]?.extensions?.[0]?.statistics) {
    console.log('=== VS Marketplace Stats ===');
    for (const s of vsData.results[0].extensions[0].statistics) {
      console.log(`${s.statisticName}: ${s.value}`);
    }
  } else {
    console.log('No VS Marketplace statistics found');
    console.log(JSON.stringify(vsData, null, 2).substring(0, 1000));
  }
} catch (e) {
  console.log('VS Marketplace error:', e.message);
}

try {
  // Fetch Open VSX stats
  const ovsxBody = await httpsGet('https://open-vsx.org/api/Veverke/chatwizard');
  const ovsx = JSON.parse(ovsxBody);
  console.log('=== Open VSX Stats ===');
  console.log('downloadCount:', ovsx.downloadCount);
  console.log('reviewCount:', ovsx.reviewCount);
  console.log('averageRating:', ovsx.averageRating);
} catch (e) {
  console.log('Open VSX error:', e.message);
}