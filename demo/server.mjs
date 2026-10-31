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
const MAX = 10 * 1024 * 1024;
const port = Number(process.env.PORT || 8800);

const send = (res, code, type, body) => { res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(body); };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'GET' && url.pathname === '/') return send(res, 200, 'text/html; charset=utf-8', fs.readFileSync(path.join(HERE, 'index.html')));
  if (req.method === 'POST' && url.pathname === '/api/assess') {
    const chunks = []; let size = 0;
    for await (const c of req) { size += c.length; if (size > MAX) return send(res, 413, 'application/json', JSON.stringify({ error: 'Images up to 10 MB.' })); chunks.push(c); }
    try { return send(res, 200, 'application/json', JSON.stringify(await lens.assess(Buffer.concat(chunks)))); }
    catch (err) { console.error(err); return send(res, 500, 'application/json', JSON.stringify({ error: 'Lens could not check this image.' })); }
  }
  send(res, 404, 'text/plain', 'Not found');
}).listen(port, '127.0.0.1', () => console.log(`Argus Lens demo on http://localhost:${port}${apiKey() ? '' : ' (no MODEL_API_KEY in .env.local: only the file-label check will work)'}`));
