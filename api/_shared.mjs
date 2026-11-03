// Shared by the Vercel functions (files starting with _ are not routes).
// The hosted demo is public, so it protects the model credits: a per-visitor limit and a size cap.
import { createLens } from '../src/lens.mjs';

export const lens = createLens();

// Vercel rejects request bodies over 4.5 MB; stay under it with room for headers.
export const MAX_BYTES = 4 * 1024 * 1024;

// Checks per visitor per 10 minutes. Kept in memory, so it's per running instance: a speed bump
// against someone looping the demo, not a guarantee (set a spend limit on the Meta account too).
const WINDOW_MS = 10 * 60_000, PER_WINDOW = 15;
const seen = new Map();
export function limited(request) {
  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  const now = Date.now(), hits = (seen.get(ip) || []).filter(t => now - t < WINDOW_MS);
  hits.push(now); seen.set(ip, hits);
  if (seen.size > 5000) seen.delete(seen.keys().next().value);
  return hits.length > PER_WINDOW;
}

export const json = (value, status = 200) => new Response(JSON.stringify(value), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
});

/** The request's file, or a Response explaining why not. */
export async function readFile(request, what) {
  if (limited(request)) return json({ error: 'Too many checks from here. Wait a few minutes and try again.' }, 429);
  const size = Number(request.headers.get('content-length') || 0);
  if (size > MAX_BYTES) return json({ error: `The hosted demo takes ${what}s up to 4 MB. Run Argus Lens locally for bigger files.` }, 413);
  const bytes = Buffer.from(await request.arrayBuffer());
  if (bytes.length > MAX_BYTES) return json({ error: `The hosted demo takes ${what}s up to 4 MB. Run Argus Lens locally for bigger files.` }, 413);
  if (!bytes.length) return json({ error: `No ${what} was sent.` }, 400);
  return bytes;
}
