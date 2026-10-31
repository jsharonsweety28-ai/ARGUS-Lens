// Argus Lens: is this image AI-generated, and is it harmful to post? With the evidence.
//
//   file metadata ──► provenance()  (code: certain when a label is present)
//   image ─────────► Muse Spark    (model: careful assessment + where the signs are)
//   each sign ─────► SAM 3.1       (model: the exact outline of that area)
//   code combines them: a label in the file beats a guess; a weak guess becomes "can't tell";
//   if the model fails, Lens says it couldn't check — it never defaults to "authentic".
import { buildObjectPrompt, decodeMaskToSVGPath, parseImageStream, recordsOfKind } from '@meta-sam/parser';
import { MODELS, parseJson, respond, respondEvents } from './meta.mjs';
import { provenance } from './provenance.mjs';
import { ASSESS_PROMPT } from './prompts.mjs';

// The model can only say it found AI signs, found none, or can't tell. Looking at a picture
// can never show it's real, so there is no "authentic" verdict.
const VERDICTS = ['likely_ai', 'no_ai_signs', 'cant_tell'];
const HARM = ['none', 'violence', 'sexual', 'hate', 'threat', 'doxxing', 'self_harm', 'deceptive_fake'];

// Plain words for each verdict, shown to the viewer.
export const LABELS = {
  labelled_ai: 'Labelled as AI-made',
  likely_ai: 'Likely AI-generated',
  no_ai_signs: 'No signs of AI found',
  cant_tell: "Can't tell",
  unavailable: "Couldn't check",
};

const mimeOf = type => ({ jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' })[type] || 'application/octet-stream';
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// A box on the 0–1000 grid, clamped; null when missing or inside out.
function cleanBox(box) {
  const b = Array.isArray(box) && box.length === 4 && box.every(Number.isFinite) ? box.map(v => clamp(Math.round(v), 0, 1000)) : null;
  return b && b[2] > b[0] && b[3] > b[1] ? b : null;
}

// Muse Spark's answer, checked: unknown values become safe ones, boxes are clamped to the grid.
function cleanAssessment(raw) {
  const signs = (Array.isArray(raw.signs) ? raw.signs : []).slice(0, 4).flatMap(s => {
    if (typeof s?.why !== 'string' || !s.why.trim()) return [];
    return [{ what: String(s.what || '').trim().slice(0, 60), why: s.why.trim(), box: cleanBox(s.box) }];
  });
  const harm = raw.harm && typeof raw.harm === 'object' ? raw.harm : {};
  const category = HARM.includes(harm.category) ? harm.category : 'none';
  const harmful = harm.harmful === true && category !== 'none';
  // The parts to hide so the rest could be posted; only boxed ones are usable.
  const regions = harmful && Array.isArray(harm.regions)
    ? harm.regions.slice(0, 6).flatMap(r => { const box = cleanBox(r?.box); return box ? [{ what: String(r.what || '').trim().slice(0, 60) || 'Private detail', box }] : []; })
    : [];
  // An older or off-script "authentic" answer is read as "no signs found", never as proof.
  const verdict = raw.verdict === 'likely_authentic' ? 'no_ai_signs' : VERDICTS.includes(raw.verdict) ? raw.verdict : 'cant_tell';
  return {
    verdict,
    confidence: Number.isFinite(raw.confidence) ? clamp(raw.confidence, 0, 1) : 0,
    kind: typeof raw.kind === 'string' ? raw.kind : 'other',
    summary: typeof raw.summary === 'string' ? raw.summary.trim() : '',
    signs,
    harm: { harmful, category, reason: typeof harm.reason === 'string' ? harm.reason.trim() : '', regions },
  };
}

/**
 * options.ask(dataUrl) → Muse Spark's raw text answer (default: the Meta Model API).
 * options.segment({ dataUrl, width, height, items: [{ id, box }] }) → [{ id, box, path }] (default: SAM 3.1).
 * options.minConfidence: a "likely AI" answer below this becomes "can't tell" (default 0.6).
 */
export function createLens({ ask, segment, minConfidence = 0.6, reasoning = 'medium' } = {}) {
  ask ??= dataUrl => respond({
    model: MODELS.spark,
    content: [{ type: 'input_text', text: ASSESS_PROMPT }, { type: 'input_image', image_url: dataUrl }],
    extra: { reasoning: { effort: reasoning } },
  });
  segment ??= samOutlines;

  async function assess(bytes) {
    const prov = provenance(bytes);
    if (prov.type === 'unknown') return { verdict: 'unavailable', label: LABELS.unavailable, summary: 'This file is not a JPEG, PNG or WebP image.', signs: [], harm: null, provenance: prov };
    const dataUrl = `data:${mimeOf(prov.type)};base64,${Buffer.from(bytes).toString('base64')}`;

    let model = null, modelError = null;
    try { model = cleanAssessment(parseJson(await ask(dataUrl))); }
    catch (err) { modelError = err?.message || 'The model could not be reached.'; }

    // The verdict. A label in the file is a fact; otherwise the model's careful opinion.
    let verdict, certain = false, summary;
    if (prov.aiLabel) {
      verdict = 'labelled_ai'; certain = true;
      summary = prov.signals.find(s => s.kind !== 'content-credentials').detail;
    } else if (!model) {
      verdict = 'unavailable';
      summary = "We couldn't check this image right now. That doesn't mean it's real or fake.";
    } else {
      verdict = model.verdict === 'likely_ai' && model.confidence < minConfidence ? 'cant_tell' : model.verdict;
      summary = model.summary || (verdict === 'cant_tell' ? "There aren't enough clear signs either way." : '');
      if (verdict === 'no_ai_signs') summary = `${summary ? summary.replace(/\.?$/, '. ') : ''}That doesn't prove it's real: AI images can look flawless.`;
    }

    // Evidence = AI mistakes only: a list of reasons an image "looks real" would read as proof.
    let signs = model && model.verdict === 'likely_ai' ? model.signs : [];
    let harm = model ? model.harm : null;
    // Each harmful part is hidden by its hide box: Muse Spark's box, grown a little, so a
    // detail it boxed loosely is still fully covered.
    if (harm) harm = { ...harm, regions: harm.regions.map(r => ({ ...r, hideBox: grow(r.box, 15) })) };

    // Exact outlines from SAM 3.1, for the AI signs (ids 1…) and the harmful parts (ids 101…),
    // in one request. Best effort: if it fails, Muse Spark's boxes stay.
    const items = [
      ...signs.flatMap((s, i) => s.box ? [{ id: i + 1, box: s.box }] : []),
      ...(harm ? harm.regions.map((r, i) => ({ id: 101 + i, box: r.box })) : []),
    ];
    if (items.length && prov.width && prov.height) {
      try {
        const outlines = await segment({ dataUrl, width: prov.width, height: prov.height, items });
        const outline = id => { const o = outlines.find(x => x.id === id); return o ? { box: o.box, ...(o.path ? { path: o.path } : {}) } : {}; };
        signs = signs.map((s, i) => ({ ...s, ...outline(i + 1) }));
        // The hide box covers both SAM's object and Muse Spark's box: hiding a little too much is fine,
        // leaving part of a phone number visible is not.
        if (harm) harm = { ...harm, regions: harm.regions.map((r, i) => { const o = outline(101 + i); return o.box ? { ...r, ...o, hideBox: union(r.hideBox, grow(o.box, 10)) } : r; }) };
      } catch { /* keep Muse Spark's boxes */ }
    }

    return {
      verdict, label: LABELS[verdict], certain, summary,
      confidence: model ? model.confidence : null,
      kind: model ? model.kind : null,
      signs, harm,
      provenance: prov,
      width: prov.width, height: prov.height,
      ...(modelError ? { error: modelError } : {}),
    };
  }

  return { assess };
}

const grow = (b, by) => [clamp(b[0] - by, 0, 1000), clamp(b[1] - by, 0, 1000), clamp(b[2] + by, 0, 1000), clamp(b[3] + by, 0, 1000)];
const union = (a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];

/**
 * SAM 3.1 outlines for boxes on the 0–1000 grid: one box prompt per item, all in one request.
 * → [{ id, box: [x1,y1,x2,y2] on the 0–1000 grid, path: { d, x, y, w, h, rasterW, rasterH } }]
 * `path.d` is an SVG path in the mask's own raster (rasterW × rasterH); draw it scaled into
 * the pixel rectangle (x, y, w, h) of the image.
 */
export async function samOutlines({ dataUrl, width, height, items }) {
  const px = (v, size) => Math.round(v * size / 1000);
  const text = buildObjectPrompt({
    size: { width, height },
    objects: items.map(({ id, box }) => ({ id, prompts: [{ box: { left: px(box[0], width), top: px(box[1], height), right: Math.max(px(box[2], width), px(box[0], width) + 1), bottom: Math.max(px(box[3], height), px(box[1], height) + 1) } }] })),
  });
  const events = respondEvents({ model: MODELS.sam, content: [{ type: 'input_text', text }, { type: 'input_image', image_url: dataUrl }] });
  const result = await parseImageStream(events).finalResult;
  const boxes = recordsOfKind(result.records, 'box'), masks = recordsOfKind(result.records, 'mask');
  const grid = (v, size) => Math.round(v * 1000 / size);
  return boxes.map(b => {
    const m = masks.find(x => x.objectId === b.objectId);
    return {
      id: Number(b.objectId),
      box: [grid(b.left, width), grid(b.top, height), grid(b.right, width), grid(b.bottom, height)],
      ...(m ? { path: { d: decodeMaskToSVGPath(m.mask), x: m.bounds.left, y: m.bounds.top, w: m.bounds.right - m.bounds.left, h: m.bounds.bottom - m.bounds.top, rasterW: m.mask.width, rasterH: m.mask.height } } : {}),
    };
  });
}
