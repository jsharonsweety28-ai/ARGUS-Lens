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

const VERDICTS = ['likely_ai', 'likely_authentic', 'cant_tell'];
const HARM = ['none', 'violence', 'sexual', 'hate', 'threat', 'doxxing', 'self_harm', 'deceptive_fake'];

// Plain words for each verdict, shown to the viewer.
export const LABELS = {
  labelled_ai: 'Labelled as AI-made',
  likely_ai: 'Likely AI-generated',
  likely_authentic: 'Likely authentic',
  cant_tell: "Can't tell",
  unavailable: "Couldn't check",
};

const mimeOf = type => ({ jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' })[type] || 'application/octet-stream';
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Muse Spark's answer, checked: unknown values become safe ones, boxes are clamped to the grid.
function cleanAssessment(raw) {
  const signs = (Array.isArray(raw.signs) ? raw.signs : []).slice(0, 4).flatMap(s => {
    const b = Array.isArray(s?.box) && s.box.length === 4 && s.box.every(Number.isFinite) ? s.box.map(v => clamp(Math.round(v), 0, 1000)) : null;
    if (typeof s?.why !== 'string' || !s.why.trim()) return [];
    const box = b && b[2] > b[0] && b[3] > b[1] ? b : null;
    return [{ what: String(s.what || '').trim().slice(0, 60), why: s.why.trim(), box }];
  });
  const harm = raw.harm && typeof raw.harm === 'object' ? raw.harm : {};
  const category = HARM.includes(harm.category) ? harm.category : 'none';
  return {
    verdict: VERDICTS.includes(raw.verdict) ? raw.verdict : 'cant_tell',
    confidence: Number.isFinite(raw.confidence) ? clamp(raw.confidence, 0, 1) : 0,
    kind: typeof raw.kind === 'string' ? raw.kind : 'other',
    summary: typeof raw.summary === 'string' ? raw.summary.trim() : '',
    signs,
    harm: { harmful: harm.harmful === true && category !== 'none', category, reason: typeof harm.reason === 'string' ? harm.reason.trim() : '' },
  };
}

/**
 * options.ask(dataUrl) → Muse Spark's raw text answer (default: the Meta Model API).
 * options.segment({ dataUrl, width, height, signs }) → [{ index, box, path }] (default: SAM 3.1).
 * options.minConfidence: a "likely" answer below this becomes "can't tell" (default 0.6).
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
      verdict = model.verdict !== 'cant_tell' && model.confidence < minConfidence ? 'cant_tell' : model.verdict;
      summary = model.summary || (verdict === 'cant_tell' ? "There aren't enough clear signs either way." : '');
    }

    // Exact outlines for the signs, from SAM 3.1. Best effort: Muse Spark's box stays if this fails.
    let signs = model ? model.signs : [];
    const boxed = signs.map((s, index) => ({ ...s, index })).filter(s => s.box);
    if (boxed.length && prov.width && prov.height) {
      try {
        const outlines = await segment({ dataUrl, width: prov.width, height: prov.height, signs: boxed });
        signs = signs.map((s, i) => ({ ...s, ...(outlines.find(o => o.index === i) || {}) }));
      } catch { /* keep Muse Spark's boxes */ }
    }

    return {
      verdict, label: LABELS[verdict], certain, summary,
      confidence: model ? model.confidence : null,
      kind: model ? model.kind : null,
      signs,
      harm: model ? model.harm : null,
      provenance: prov,
      width: prov.width, height: prov.height,
      ...(modelError ? { error: modelError } : {}),
    };
  }

  return { assess };
}

/**
 * SAM 3.1 outlines for Muse Spark's boxes: one box prompt per sign, all in one request.
 * → [{ index, box: [x1,y1,x2,y2] on the 0–1000 grid, path: { d, x, y, w, h } }]
 * `path.d` is an SVG path in the mask's own raster (path.w × path.h); draw it inside the
 * pixel rectangle (x, y, x+w, y+h) — all in image pixels.
 */
export async function samOutlines({ dataUrl, width, height, signs }) {
  const px = (v, size) => Math.round(v * size / 1000);
  const text = buildObjectPrompt({
    size: { width, height },
    objects: signs.map(s => ({ id: s.index + 1, prompts: [{ box: { left: px(s.box[0], width), top: px(s.box[1], height), right: Math.max(px(s.box[2], width), px(s.box[0], width) + 1), bottom: Math.max(px(s.box[3], height), px(s.box[1], height) + 1) } }] })),
  });
  const events = respondEvents({ model: MODELS.sam, content: [{ type: 'input_text', text }, { type: 'input_image', image_url: dataUrl }] });
  const result = await parseImageStream(events).finalResult;
  const boxes = recordsOfKind(result.records, 'box'), masks = recordsOfKind(result.records, 'mask');
  return boxes.map(b => {
    const m = masks.find(x => x.objectId === b.objectId);
    const grid = (v, size) => Math.round(v * 1000 / size);
    return {
      index: Number(b.objectId) - 1,
      box: [grid(b.left, width), grid(b.top, height), grid(b.right, width), grid(b.bottom, height)],
      ...(m ? { path: { d: decodeMaskToSVGPath(m.mask), x: m.bounds.left, y: m.bounds.top, w: m.bounds.right - m.bounds.left, h: m.bounds.bottom - m.bounds.top, rasterW: m.mask.width, rasterH: m.mask.height } } : {}),
    };
  });
}
