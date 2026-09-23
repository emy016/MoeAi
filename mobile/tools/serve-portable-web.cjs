const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const root = path.resolve(__dirname, '..', 'web-build');
const port = Number(process.env.PORT || process.argv[2] || 8080);
const mime = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

if (!fs.existsSync(path.join(root, 'index.html'))) {
  console.error('The web-build folder is missing. Run "npm run build:web" first.');
  process.exit(1);
}

const server = http.createServer((request, response) => {
  let pathname = '/';
  try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); } catch (_) {}
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  let filename = path.resolve(root, relative);
  if (!filename.startsWith(`${root}${path.sep}`) && filename !== path.join(root, 'index.html')) {
    response.writeHead(403).end('Forbidden');
    return;
  }
  if (!fs.existsSync(filename) || fs.statSync(filename).isDirectory()) filename = path.join(root, 'index.html');
  fs.readFile(filename, (error, data) => {
    if (error) { response.writeHead(404).end('Not found'); return; }
    const extension = path.extname(filename).toLowerCase();
    response.writeHead(200, {
      'Content-Type': mime[extension] || 'application/octet-stream',
      'Cache-Control': extension === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    });
    if (request.method === 'HEAD') response.end();
    else response.end(data);
  });
});

server.on('error', (error) => {
  console.error(`Could not start MoeAI on port ${port}: ${error.message}`);
  process.exitCode = 1;
});
server.listen(port, '0.0.0.0', () => {
  console.log(`MoeAI is ready: http://127.0.0.1:${port}`);
  const addresses = Object.values(os.networkInterfaces()).flat().filter((item) => item && item.family === 'IPv4' && !item.internal);
  addresses.forEach((item) => console.log(`Same Wi-Fi: http://${item.address}:${port}`));
  console.log('Press Ctrl+C to stop.');
});
