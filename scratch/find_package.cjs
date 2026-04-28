const https = require('https');

function checkParties() {
  const url = 'https://ledger-api-json.participant.hackcanton-01.devnet.naas.noders.services/v1/parties';
  
  const options = {
    rejectUnauthorized: false
  };

  https.get(url, options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        const parties = json.result || [];
        console.log(`Found ${parties.length} parties on DevNet.`);
        console.log('First 5 parties:');
        parties.slice(0, 5).forEach(p => console.log(p.identifier, p.displayName));
      } catch (e) {
        console.error('Parse error:', e.message);
        console.log('Raw output:', data);
      }
    });
  }).on('error', (err) => {
    console.error('Fetch error:', err.message);
  });
}

checkParties();
