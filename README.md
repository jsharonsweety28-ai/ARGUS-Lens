# Argus Lens

> Is this image real? Argus Lens shows the evidence, not just a guess.

Argus Lens checks images in social media posts for signs of AI generation and for harmful content. Instead of a bare "AI / not AI" label, it gives a careful assessment with the evidence outlined on the image:

- **Labelled as AI-made**: the file itself says so. Certain.
- **Likely AI-generated**: concrete AI mistakes found, each one outlined.
- **No signs of AI found**: and Lens says plainly that this doesn't prove the image is real.
- **Can't tell**: too small, blurry or compressed to inspect.

It also checks whether the image is **harmful to post**: private details (an address, a phone number, an ID card, a number plate), hate symbols, gore. When hiding a part would make the rest fine, SAM 3.1 outlines that part and Lens offers a **blurred version** to post instead.

There is deliberately no "authentic" verdict: no tool can prove an image is real by looking at it, and telling people a fake is real does more harm than saying "we don't know".

Built for the **Meta Global AI Developer Hackathon** (Indie Developer track, *Build for Your World*) on Meta's models.

## Built during the hackathon

**Everything in this repository was built during the hackathon building period (Oct 27 – Nov 4, 2026).** The commit history shows it.

Argus Lens is designed to plug into **Argus**, an earlier project of ours: a comment moderator that checks text before it's posted ([github.com/jsharonsweety28-ai/AI-Moderator](https://github.com/jsharonsweety28-ai/AI-Moderator)). Argus is **prior work, not part of this submission**; none of its code is in this repository.

## How it works

```
image file ──► file labels (code)   AI labels written into the file: IPTC "trained algorithmic media",
                                     generator settings, Content Credentials. Certain when present.
image ───────► Muse Spark           Likely AI / no signs found / can't tell, the AI mistakes and where,
                                     and whether the image is harmful to post.
each sign ───► SAM 3.1              The exact outline of each area the verdict rests on.
code ────────► the result           A label in the file beats a guess. A weak guess becomes "can't tell".
                                     If the model fails, Lens says it couldn't check. Never "authentic".
```

| Meta tool | What Argus Lens uses it for |
|---|---|
| **Muse Spark** (`muse-spark-1.3`, Meta Model API) | Reads the image, judges AI signs and harm, and points at the evidence and the private parts on a 0–1000 grid (perception grounding) |
| **SAM 3.1** (`sam-3.1`, Meta Model API) | Turns each pointed-at area into an exact outline, prompted with Muse Spark's boxes; the private parts are then blurred |
| **Muse Image** (`muse-image-1.0`) | Made the test and sample images. Every Muse Image picture carries an IPTC "trained algorithmic media" label in its file, which Lens reports as certain |
| **`@meta-sam/parser`** | Builds the box prompts and decodes SAM's masks into SVG outlines |

## Run it

Needs Node 20+ and a Meta Model API key.

```bash
npm install
npm test                 # stub models, no network
npm run demo             # http://localhost:8800
```

Put your key in `.env.local` (never committed): `MODEL_API_KEY=your-key`.

The demo has two sample images, both made with Muse Image for this project: a parcel whose shipping label shows a (made-up) name, address and phone number, and a café photo.

## Browser extension

[`extension/`](extension) brings Lens to the feed. On Instagram, Reddit and YouTube, hover over an image and click **Check**; on any site, right-click an image and choose **Check with Argus Lens**. The verdict sits on the image, the evidence is outlined on it, and private details are **blurred on your screen**. The extension holds no API key: it sends the image to your Lens server.

**Automatic checks** (off by default, a switch in the extension's settings): as you scroll your own feed, each image that comes on screen is checked once and gets its verdict label, and private details are blurred, with no clicking. It only reads images your browser has already loaded for you; it never visits pages or collects posts. Automatic checks are capped per minute (10 by default) to protect your API credits, results are remembered so nothing is checked twice, and icons and avatars are skipped.

1. Run the server: `npm run demo`.
2. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and choose the `extension` folder.
3. Open Instagram or Reddit, hover over an image, click **Check**.

To try it without logging in anywhere, open `http://localhost:8800/test` (or `/test?auto=1` for automatic checks): a stand-in feed with the two sample images, running the same content script.

## Status

Work in progress during the hackathon.

## Credits

Based on an idea by Dr. J. Roselin, Professor at Anna University.

## License

[MIT](LICENSE)
