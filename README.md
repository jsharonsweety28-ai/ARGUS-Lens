# Argus Lens

> Is this image real? Argus Lens shows the evidence, not just a guess.

Argus Lens checks images in social media posts for signs of AI generation and for harmful content. Instead of a bare "AI / not AI" label, it gives a careful assessment with the evidence outlined on the image:

- **Labelled as AI-made**: the file itself says so. Certain.
- **Likely AI-generated**: concrete AI mistakes found, each one outlined.
- **No signs of AI found**: and Lens says plainly that this doesn't prove the image is real.
- **Can't tell**: too small, blurry or compressed to inspect.

It also checks whether the image is **harmful to post**: private details (an address, a phone number, an ID card, a number plate), hate symbols, gore. When hiding a part would make the rest fine, SAM 3.1 outlines that part and Lens offers a **blurred version** to post instead.

**Any photo or video from your computer**: the Lens page (and the **Check a file** button in the extension's toolbar panel) takes JPEG, PNG, WebP and GIF photos, and MP4, iPhone MOV, WebM and other videos the browser can play; videos that aren't MP4 or MOV are converted to MP4 in the browser first. (iPhone HEIC photos can't be opened in a browser: export them as JPEG.)

**Video** (up to 60 seconds): Muse Spark watches the clip, frames and sound, and reports AI signs with the moment they happen, and whether it's harmful to post. When a private detail is visible, **SAM 3.1 tracks that object through every frame**, and the demo plays the video with it **blurred as it moves**, and records a blurred copy you can post instead.

There is deliberately no "authentic" verdict: no tool can prove an image is real by looking at it, and telling people a fake is real does more harm than saying "we don't know".

Built for the **Meta Global AI Developer Hackathon** (Indie Developer track, *Build for Your World*) on Meta's models.

## Built during the hackathon

**Everything in this repository was built during the hackathon building period (Oct 27 – Nov 4, 2026).** The commit history shows it.

Argus Lens is designed to plug into **Argus**, an earlier project of ours: a comment moderator that checks text before it's posted ([github.com/jsharonsweety28-ai/AI-Moderator](https://github.com/jsharonsweety28-ai/AI-Moderator)). Argus is **prior work, not part of this submission**; none of its code is in this repository.

## What Lens checks

1. **The file** (code, certain): an AI label written into the file (IPTC "trained algorithmic media", which Meta and Muse Image add), Content Credentials (C2PA), image-generator settings. Screenshots and app uploads usually strip these.
2. **Visible AI marks** (Muse Spark): Meta's "Imagined with AI" label, Snapchat's AI watermark, Gemini's sparkle, DALL·E's coloured squares, "AI generated" stickers. These survive screenshots. Coming from Snapchat or Instagram is not a sign by itself.
3. **Visual mistakes** (Muse Spark): text read word by word (repeats, nonsense, squiggles), hands and faces, objects merging, warped lines. Smooth skin alone doesn't count when a beauty filter is evident.
4. **Scene logic** (Muse Spark): could this actually happen? Size next to people, weight and support, physics, context. (An adult sitting on a small toy dinosaur can't.)
5. **Harm** (Muse Spark + SAM 3.1): private details, hate, violence, threats, outlined and blurred.

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
| **Muse Wonder** (`muse-wonder-1.0`, Meta Model API) | Watches videos (frames and sound) and judges images: reads the image, judges AI signs, filters, scene logic and harm, and points at the evidence and the private parts on a 0–1000 grid (perception grounding) |
| **Muse Spark** (`muse-spark-1.3`, Meta Model API) | Was the image and video judge until the comparisons below |
| **SAM 3.1** (`sam-3.1`, Meta Model API) | Turns each pointed-at area into an exact outline, prompted with Muse Spark's boxes; the private parts are then blurred. In video, tracks each private object through every frame from a concept prompt Muse Spark names |
| **Muse Spark video understanding** | Watches a clip (frames and sound) for AI signs, with times, and decides which objects to hide |
| **Muse Image** (`muse-image-1.0`) | Made the test and sample images. Every Muse Image picture carries an IPTC "trained algorithmic media" label in its file, which Lens reports as certain |
| **`@meta-sam/parser`** | Builds the box prompts and decodes SAM's masks into SVG outlines |

### Muse Wonder vs Muse Spark

11 AI images with their file labels removed (as a screenshot would), and 9 real photos (Wikimedia Commons), each checked twice by each model:

| | Muse Spark | Muse Wonder |
|---|---|---|
| AI images caught in both runs | 2 of 11 | **7 of 11** |
| AI images caught in only one run | 2 | 0 |
| Real photos wrongly called AI | 0 of 9 | **0 of 9** |
| Seconds per check | 11.2 | 12.5 |

Wonder costs about 4× more per check, and it's worth it: it caught the impossible scenes (an adult on a small toy, even with a filter and caption over it), garbled shop signs, and a Snapchat AI image with its watermark removed, and it was consistent between runs. Very clean AI photos with no visible mistake are still missed by both, and Lens says "no signs of AI found" for them, never "real".

### Harm check

Test images made for this project (Muse Image photos, some with text drawn on), each checked twice:

| Image | Expected | Lens (both runs) |
|---|---|---|
| Shipping label with a name, address and phone number | private info | ✅ private info; label outlined and blurred |
| *"I know where you live. You're next."* over a house | threat | ✅ threat; the text **and the house number** outlined |
| *"nobody would miss you, just end it"* | self-harm | ✅ self-harm encouragement; text outlined |
| *"people from that state are animals, get them out"* | hate | ✅ hate (dehumanising); text outlined |
| *"I'm going to kill this exam 💪"* | fine (hyperbole) | ✅ not flagged |
| Cooking with a kitchen knife | fine | ✅ not flagged |
| A parked car with a readable number plate | debatable | not flagged |

## Run it

Needs Node 20+ and a Meta Model API key.

```bash
npm install
npm test                 # stub models, no network
npm run demo             # http://localhost:8800
```

Put your key in `.env.local` (never committed): `MODEL_API_KEY=your-key`.

The demo page has two sections, both running the same single check:
- **Is this real?** (for viewers): the AI verdict first, with the evidence outlined on the picture; harm is described ("shows someone's private information, blurred on your screen").
- **Check before posting** (for your own photo or video): "Not safe to post" with the reason, or "OK to post"; the harmful parts and privacy details outlined and blurred, and a safe copy to download; the AI result as a short note. Open it directly with `#post`.

The demo has three samples, all made for this project: a parcel whose shipping label shows a (made-up) name, address and phone number and a café photo (both by Muse Image), and a 6-second video panning across the parcel (recorded in the browser from that image).

## Browser extension

[`extension/`](extension) brings Lens to the feed. On Instagram, Reddit and YouTube, hover over an image and click **Check**; on any site, right-click an image and choose **Check with Argus Lens**. The verdict sits on the image, the evidence is outlined on it, and private details are **blurred on your screen**. The extension holds no API key: it sends the image to your Lens server.

**Videos in the feed**: hover over a video and click **Check frame**. Lens pauses it, takes a screenshot of just the video's box (only what's on your screen; nothing is downloaded from the site), and checks that frame: the verdict, outlines and private-detail blur appear on the paused video, and clear when you press play.

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
