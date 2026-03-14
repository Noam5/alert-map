const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 3456;

function proxyRequest(targetUrl, referer, res) {
  const url = new URL(targetUrl);
  const options = {
    hostname: url.hostname,
    path: url.pathname + url.search,
    headers: {
      'accept': 'application/json',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
      'referer': referer || targetUrl,
    }
  };
  https.get(options, (proxyRes) => {
    const chunks = [];
    proxyRes.on('data', c => chunks.push(c));
    proxyRes.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(Buffer.concat(chunks));
    });
  }).on('error', (e) => {
    res.writeHead(500);
    res.end(JSON.stringify({ error: e.message }));
  });
}

http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // Proxy alerts API
  if (url.pathname.startsWith('/api/alerts')) {
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const target = `https://tzevadom.com/api/alerts-history/summary/custom/${from}/${to}`;
    const referer = `https://tzevadom.com/summary/custom/${from}/${to}`;
    return proxyRequest(target, referer, res);
  }

  // Proxy cities DB
  if (url.pathname === '/api/cities') {
    return proxyRequest('https://www.tzevaadom.co.il/static/cities.json', 'https://www.tzevaadom.co.il/', res);
  }

  // Serve static files
  let filePath = url.pathname === '/' ? '/index.html' : url.pathname;
  filePath = path.join(__dirname, filePath);
  const ext = path.extname(filePath);
  const mimeTypes = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css' };

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
