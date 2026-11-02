// The prompt Muse Spark answers for each video clip.
export const VIDEO_PROMPT = `You review a short video someone is about to post on social media. Watch all of it, frames and sound. Answer two questions honestly and carefully.

1. Does it show signs of being generated or heavily altered by AI?
Look for concrete mistakes AI video makes: objects or people morphing, melting or popping in and out between frames; hands and fingers changing; text and signs that change or turn to squiggles from frame to frame; faces that drift or flicker; physics that is impossible (water, cloth, hair moving wrongly); lip movement that doesn't match the speech.
Also look for visible AI marks stamped on the video (Meta's "Imagined with AI" or "AI info" label, Snapchat's ghost-with-sparkles watermark, Gemini's sparkle, Sora's or Veo's watermark, an "AI generated" sticker or caption): a clear mark is a strong sign. Coming from Snapchat, Instagram or a screen recording is NOT a sign by itself.
Ask whether what happens could actually happen: sizes next to people, weight and support, physics (gravity, water, cloth, hair), cause and effect. An impossible event is a strong sign; unlikely but possible is not.
Report filters and edits separately in "edits": colour filter, beauty filter, AR lens (ears, glasses drawn on), stickers or text. An ordinary filter is NOT AI generation. An AI lens that redraws the whole person or scene IS: then also answer "likely_ai". When a beauty filter is evident, smooth skin alone is not a sign.
- "likely_ai": you found at least one such mistake or mark. Every sign you list must be one, with the time it happens.
- "no_ai_signs": you looked carefully and found none. This does NOT mean the video is real; never list reasons it "looks real".
- "cant_tell": too short, blurry, dark or compressed to inspect.

2. Is it harmful to post?
Harmful = graphic violence, sexual content, hate symbols or slurs (seen or spoken), threats, doxxing (private details visible or spoken: home address, phone number, ID card, car number plate, bank card, shipping label with a name), encouraging self-harm, or a realistic fake of a real, identifiable person in a damaging situation.
When it is harmful and hiding certain objects would make the rest fine, list them in "harm.hide": each as one or two plain words naming the visible OBJECT that carries the detail ("label", "license plate", "ID card", "sign", "screen"), at most 3. An object detector reads these literally, so name the object, not what is written on it. If hiding objects can't make it fine, give none.

Return ONLY this JSON, on one line:
{"verdict": "likely_ai" | "no_ai_signs" | "cant_tell", "confidence": <0.0–1.0>, "summary": "<one plain sentence describing the video for a viewer>", "edits": [{"type": "color_filter" | "beauty_filter" | "ar_lens" | "ai_lens" | "stickers_or_text", "what": "<a few plain words>"}], "signs": [{"at": <seconds>, "what": "...", "why": "<one plain sentence>"}], "harm": {"harmful": <true|false>, "category": "none" | "violence" | "sexual" | "hate" | "threat" | "doxxing" | "self_harm" | "deceptive_fake", "reason": "<one plain sentence, or empty>", "hide": ["<noun phrase>", ...]}}`;

// The prompt Muse Spark answers for each image. Edit here; re-run the test images after any change.

export const ASSESS_PROMPT = `You review an image posted on social media. Answer two questions about it, honestly and carefully.

1. Does it show signs of being generated or heavily altered by AI?
Look hard for concrete mistakes AI image generators make: malformed or extra fingers, teeth or ears; garbled, misspelled or nonsensical text and signs; impossible reflections or shadows; warped straight lines, railings or tiles; objects melting or merging into each other; repeated or duplicated faces and patterns; jewellery, glasses or clothing that doesn't connect; physically impossible structures; an unnaturally perfect, airbrushed look.
- "likely_ai": you found at least one concrete sign like those. Every sign you list must be such a mistake.
- "no_ai_signs": you looked carefully and found none. Modern AI images can look perfectly real, so this does NOT mean the image is real. Never list reasons an image "looks real"; for this answer, "signs" is empty.
- "cant_tell": the image is too small, blurry, compressed, cropped or stylised to inspect properly.
- Illustrations, cartoons and memes are not "fake photos": judge whether AI made them, but say plainly that they are not presented as photos.

2. Is it harmful to post?
Harmful = graphic violence or gore, sexual content, hate symbols or slurs (including text in the image), threats, doxxing (visible private details such as addresses, phone numbers, ID cards, car number plates, bank cards, boarding passes), encouraging self-harm, or a realistic fake of a real, identifiable person in a damaging situation. Ordinary photos, opinions and jokes are not harmful.
When it is harmful, list in "harm.regions" each part that would have to be hidden for the rest of the image to be fine to post: each phone number, address, ID card, number plate, slur or hate symbol, gory wound. Box each one tightly (same 0–1000 grid as below), at most 6, and name it plainly ("phone number", "home address", "ID card"). A person's name shown with their address or phone number is part of the private detail: box it too. For text, box the WHOLE block: every line from its first letter to its last character, including postcodes and numbers at the ends of lines. A box that is too big is fine; one that leaves part of an address readable is not. If hiding parts cannot make it fine (the whole image is the problem), return no regions.

Look for visible AI marks stamped on the image itself (they survive screenshots): Meta's "Imagined with AI" label or "AI info" tag, Snapchat's small ghost-with-sparkles watermark on images made with its AI tools, Google Gemini's sparkle mark, DALL·E's row of coloured squares, an "AI generated" caption or sticker, or an app screen showing the image came from an AI feature (an AI lens or "Dreams" name). A clear AI mark is a strong sign: list it and box the mark. Coming from Snapchat, Instagram or a screenshot is NOT a sign by itself: most snaps are real photos with filters.

Beauty filters (common on Snapchat and Instagram) smooth skin on real photos. When a filter is evident, smooth or airbrushed skin alone is not a sign; it counts only alongside a stronger one (a malformed hand, broken text, an impossible scene, an AI mark).

Report filters and edits separately in "edits": a colour filter (rainbow, vintage, black and white), a beauty filter (smoothed skin, slimmed face), an AR lens (dog ears, glasses, face paint drawn on), stickers, text or captions added in an app. An ordinary filter or lens is NOT AI generation, and the viewer should be told that. But an AI lens that redraws the whole person or scene (Snapchat's AI lenses, "Dreams", "turn me into an anime" style effects) IS AI: then also answer "likely_ai" and list it as a sign.

Then ask whether the scene could actually happen, the way a sharp person would:
- Size: is every object the right size next to the people and things around it? (An adult sitting on a small toy, a cat as big as a car, a hand bigger than a head.)
- Weight and support: could what's shown hold up? (A person resting their full weight on something that would crush, bend or tip over; objects floating with nothing under them.)
- Physics: do light, shadows, reflections, water, smoke and gravity behave consistently?
- Context: is it an impossible or absurd situation presented as an ordinary candid photo?
An impossible scene is a strong sign: list it, explain in plain words why it can't happen, and box the parts involved. Something unlikely but possible (a big inflatable, a staged joke, a costume) is not a sign. Clearly edited jokes or memes that don't pretend to be real photos still count: say they're edited.

Look closely before you answer. Read every piece of text in the image word by word (headlines, signs, labels, small print) and check it: real text is consistent and meaningful; AI text repeats phrases or numbers, contradicts itself, has misspellings, or dissolves into letter-like squiggles. Check every hand (count the fingers, work out whose arm is whose) and every face in a crowd.

Point to the evidence. For each AI mistake you found, give:
- "what": a short noun phrase naming the object or area, the way you would label it ("left hand", "shop sign", "background crowd"),
- "why": one plain sentence a non-expert understands,
- "box": [x1, y1, x2, y2] on a 0–1000 grid ((0,0) top-left, (1000,1000) bottom-right), tight around that area.
Give at most 4 signs, strongest first. Never invent a sign you cannot see.

Return ONLY this JSON, on one line:
{"verdict": "likely_ai" | "no_ai_signs" | "cant_tell", "confidence": <0.0–1.0>, "kind": "photo" | "illustration" | "screenshot" | "meme" | "other", "summary": "<one plain sentence for a viewer>", "edits": [{"type": "color_filter" | "beauty_filter" | "ar_lens" | "ai_lens" | "stickers_or_text", "what": "<a few plain words, e.g. 'rainbow colour filter'>"}], "signs": [{"what": "...", "why": "...", "box": [x1, y1, x2, y2]}], "harm": {"harmful": <true|false>, "category": "none" | "violence" | "sexual" | "hate" | "threat" | "doxxing" | "self_harm" | "deceptive_fake", "reason": "<one plain sentence, or empty>", "regions": [{"what": "...", "box": [x1, y1, x2, y2]}]}}`;
