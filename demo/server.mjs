// Demo: drop an image, see Argus Lens's assessment with the evidence outlined.
// npm run demo → http://localhost:8800 (needs MODEL_API_KEY in .env.local)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLens } from '../src/lens.mjs';
import { apiKey } from '../src/meta.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const lens = createLens();
const MAX = 10 * 1024 * 1024, MAX_VIDEO = 20 * 1024 * 1024;
const port = Number(process.env.PORT || 8800);

const send = (res, code, type, body) => { res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(body); };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'GET' && url.pathname === '/') return send(res, 200, 'text/html; charset=utf-8', fs.readFileSync(path.join(HERE, 'index.html')));
  // The extension's test feed and its content script, for trying the extension without logging in anywhere.
  if (req.method === 'GET' && url.pathname === '/test') return send(res, 200, 'text/html; charset=utf-8', fs.readFileSync(path.join(HERE, '..', 'extension', 'test', 'feed.html')));
  if (req.method === 'GET' && url.pathname === '/ext/content.js') return send(res, 200, 'text/javascript; charset=utf-8', fs.readFileSync(path.join(HERE, '..', 'extension', 'content.js')));
  const sample = url.pathname.match(/^\/samples\/([a-z-]+\.(webp|jpg|png|mp4))$/);
  if (req.method === 'GET' && sample && fs.existsSync(path.join(HERE, 'samples', sample[1]))) {
    const type = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', mp4: 'video/mp4' }[sample[2]];
    const body = fs.readFileSync(path.join(HERE, 'samples', sample[1]));
    // Byte ranges, so a <video> can seek (without them the browser can only play from the start).
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (range) {
      const start = range[1] ? Number(range[1]) : body.length - Number(range[2]), end = range[1] && range[2] ? Math.min(Number(range[2]), body.length - 1) : body.length - 1;
      res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${body.length}`, 'Content-Length': end - start + 1, 'Accept-Ranges': 'bytes' });
      return res.end(body.subarray(start, end + 1));
    }
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': body.length, 'Accept-Ranges': 'bytes' });
    return res.end(body);
  }
  if (req.method === 'POST' && (url.pathname === '/api/assess' || url.pathname === '/api/assess-video')) {
    const video = url.pathname.endsWith('video'), max = video ? MAX_VIDEO : MAX;
    const chunks = []; let size = 0;
    for await (const c of req) { size += c.length; if (size > max) return send(res, 413, 'application/json', JSON.stringify({ error: video ? 'Videos up to 20 MB.' : 'Images up to 10 MB.' })); chunks.push(c); }
    try { return send(res, 200, 'application/json', JSON.stringify(await (video ? lens.assessVideo : lens.assess)(Buffer.concat(chunks)))); }
    catch (err) { console.error(err); return send(res, 500, 'application/json', JSON.stringify({ error: `Lens could not check this ${video ? 'video' : 'image'}.` })); }
  }
  send(res, 404, 'text/plain', 'Not found');
}).listen(port, '127.0.0.1', () => console.log(`Argus Lens demo on http://localhost:${port}${apiKey() ? '' : ' (no MODEL_API_KEY in .env.local: only the file-label check will work)'}`));
