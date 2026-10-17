import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript', '.json': 'application/json', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.png': 'image/png', '.jpg': 'image/jpeg', '.css': 'text/css' };
export function startServer(port = 0) {
  return new Promise((res) => {
    const srv = http.createServer((req, rsp) => {
      let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
      const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); return rsp.end('nf'); }
      const stat = fs.statSync(f); const range = req.headers.range;
      const h = { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'Accept-Ranges': 'bytes' };
      if (range) { const [a, b] = range.replace('bytes=', '').split('-'); const s = +a, e = b ? +b : stat.size - 1; rsp.writeHead(206, { ...h, 'Content-Range': `bytes ${s}-${e}/${stat.size}`, 'Content-Length': e - s + 1 }); fs.createReadStream(f, { start: s, end: e }).pipe(rsp); }
      else { rsp.writeHead(200, { ...h, 'Content-Length': stat.size }); fs.createReadStream(f).pipe(rsp); }
    });
    srv.listen(port, '127.0.0.1', () => res({ srv, port: srv.address().port, url: `http://127.0.0.1:${srv.address().port}` }));
  });
}
if (process.argv[1] && process.argv[1].endsWith('server.mjs')) { const p = +(process.argv[2] || 8123); startServer(p).then((s) => console.log('serving', s.url)); }
