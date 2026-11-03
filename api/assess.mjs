// POST /api/assess: an image's bytes in, Argus Lens's assessment out (the same as the local server).
import { json, lens, readFile } from './_shared.mjs';

export async function POST(request) {
  const bytes = await readFile(request, 'image');
  if (bytes instanceof Response) return bytes;
  try { return json(await lens.assess(bytes)); }
  catch (err) { console.error(err); return json({ error: 'Lens could not check this image.' }, 500); }
}
