const { app, BrowserWindow } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = app.isPackaged
  ? path.join(process.resourcesPath, 'out')
  : path.join(__dirname, '..', 'out');
const TYPES = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.wasm':'application/wasm',
  '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml', '.ico':'image/x-icon',
  '.woff2':'font/woff2', '.txt':'text/plain' };

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      let file = path.join(ROOT, p);
      if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
      if (!fs.existsSync(file) && fs.existsSync(file + '.html')) file += '.html';
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); return res.end('Not found'); }
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
}

app.whenReady().then(async () => {
  const port = await startServer();
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    title: 'FileFlex',
    icon: path.join(ROOT, 'favicon.ico'),
  });
  win.loadURL(`http://127.0.0.1:${port}/`);
});
app.on('window-all-closed', () => app.quit());
