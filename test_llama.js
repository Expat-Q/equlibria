import https from 'https';

https.get('https://yields.llama.fi/pools', (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log(JSON.parse(body).data.slice(0, 5)));
}).on('error', e => console.error(e));
