// POST /api/assess-video: an MP4's bytes in, Argus Lens's video assessment out.
import { json, lens, readFile } from './_shared.mjs';

export async function POST(request) {
  const bytes = await readFile(request, 'video');
  if (bytes instanceof Response) return bytes;
  try { return json(await lens.assessVideo(bytes)); }
  catch (err) { console.error(err); return json({ error: 'Lens could not check this video.' }, 500); }
}
