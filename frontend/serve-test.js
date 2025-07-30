const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/test-pong.html') {
    fs.readFile(path.join(__dirname, 'test-pong.html'), (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('File not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

const PORT = 3002;
server.listen(PORT, () => {
  console.log(`🌐 Test server running at http://localhost:${PORT}`);
  console.log(`📱 Open http://localhost:${PORT} to test the pong game`);
});