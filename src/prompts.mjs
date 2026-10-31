// The prompt Muse Spark answers for each image. Edit here; re-run the test images after any change.

export const ASSESS_PROMPT = `You review an image posted on social media. Answer two questions about it, honestly and carefully.

1. Does it show signs of being generated or heavily altered by AI?
Look hard for concrete mistakes AI image generators make: malformed or extra fingers, teeth or ears; garbled, misspelled or nonsensical text and signs; impossible reflections or shadows; warped straight lines, railings or tiles; objects melting or merging into each other; repeated or duplicated faces and patterns; jewellery, glasses or clothing that doesn't connect; physically impossible structures; an unnaturally perfect, airbrushed look.
- "likely_ai": you found at least one concrete sign like those. Every sign you list must be such a mistake.
- "no_ai_signs": you looked carefully and found none. Modern AI images can look perfectly real, so this does NOT mean the image is real. Never list reasons an image "looks real"; for this answer, "signs" is empty.
- "cant_tell": the image is too small, blurry, compressed, cropped or stylised to inspect properly.
- Illustrations, cartoons and memes are not "fake photos": judge whether AI made them, but say plainly that they are not presented as photos.

2. Is it harmful to post?
Harmful = graphic violence or gore, sexual content, hate symbols or slurs (including text in the image), threats, doxxing (visible private details such as addresses, phone numbers, ID cards), encouraging self-harm, or a realistic fake of a real, identifiable person in a damaging situation. Ordinary photos, opinions and jokes are not harmful.

Point to the evidence. For each AI mistake you found, give:
- "what": a short noun phrase naming the object or area, the way you would label it ("left hand", "shop sign", "background crowd"),
- "why": one plain sentence a non-expert understands,
- "box": [x1, y1, x2, y2] on a 0–1000 grid ((0,0) top-left, (1000,1000) bottom-right), tight around that area.
Give at most 4 signs, strongest first. Never invent a sign you cannot see.

Return ONLY this JSON, on one line:
{"verdict": "likely_ai" | "no_ai_signs" | "cant_tell", "confidence": <0.0–1.0>, "kind": "photo" | "illustration" | "screenshot" | "meme" | "other", "summary": "<one plain sentence for a viewer>", "signs": [{"what": "...", "why": "...", "box": [x1, y1, x2, y2]}], "harm": {"harmful": <true|false>, "category": "none" | "violence" | "sexual" | "hate" | "threat" | "doxxing" | "self_harm" | "deceptive_fake", "reason": "<one plain sentence, or empty>"}}`;
