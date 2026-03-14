const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3456;
const MIME_TYPES = {
  '.css': 'text/css; charset=UTF-8',
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
};

http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  let filePath = decodeURIComponent(url.pathname);
  filePath = filePath === '/' ? '/index.html' : filePath;
  filePath = path.normalize(path.join(__dirname, filePath));

  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=UTF-8' });
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
      res.end('Not found');
      return;
    }

    res.writeHead(200, {
      'Content-Type': MIME_TYPES[path.extname(filePath)] || 'application/octet-stream'
    });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
