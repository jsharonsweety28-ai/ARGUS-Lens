// The prompt Muse Spark answers for each video clip.
export const VIDEO_PROMPT = `You review a short video someone is about to post on social media. Watch all of it, frames and sound. Answer two questions honestly and carefully.

1. Does it show signs of being generated or heavily altered by AI?
Look for concrete mistakes AI video makes: objects or people morphing, melting or popping in and out between frames; hands and fingers changing; text and signs that change or turn to squiggles from frame to frame; faces that drift or flicker; physics that is impossible (water, cloth, hair moving wrongly); lip movement that doesn't match the speech.
- "likely_ai": you found at least one such mistake. Every sign you list must be one, with the time it happens.
- "no_ai_signs": you looked carefully and found none. This does NOT mean the video is real; never list reasons it "looks real".
- "cant_tell": too short, blurry, dark or compressed to inspect.

2. Is it harmful to post?
Harmful = graphic violence, sexual content, hate symbols or slurs (seen or spoken), threats, doxxing (private details visible or spoken: home address, phone number, ID card, car number plate, bank card, shipping label with a name), encouraging self-harm, or a realistic fake of a real, identifiable person in a damaging situation.
When it is harmful and hiding certain objects would make the rest fine, list them in "harm.hide": each as one or two plain words naming the visible OBJECT that carries the detail ("label", "license plate", "ID card", "sign", "screen"), at most 3. An object detector reads these literally, so name the object, not what is written on it. If hiding objects can't make it fine, give none.

Return ONLY this JSON, on one line:
{"verdict": "likely_ai" | "no_ai_signs" | "cant_tell", "confidence": <0.0–1.0>, "summary": "<one plain sentence describing the video for a viewer>", "signs": [{"at": <seconds>, "what": "...", "why": "<one plain sentence>"}], "harm": {"harmful": <true|false>, "category": "none" | "violence" | "sexual" | "hate" | "threat" | "doxxing" | "self_harm" | "deceptive_fake", "reason": "<one plain sentence, or empty>", "hide": ["<noun phrase>", ...]}}`;

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

Look closely before you answer. Read every piece of text in the image word by word (headlines, signs, labels, small print) and check it: real text is consistent and meaningful; AI text repeats phrases or numbers, contradicts itself, has misspellings, or dissolves into letter-like squiggles. Check every hand (count the fingers, work out whose arm is whose) and every face in a crowd.

Point to the evidence. For each AI mistake you found, give:
- "what": a short noun phrase naming the object or area, the way you would label it ("left hand", "shop sign", "background crowd"),
- "why": one plain sentence a non-expert understands,
- "box": [x1, y1, x2, y2] on a 0–1000 grid ((0,0) top-left, (1000,1000) bottom-right), tight around that area.
Give at most 4 signs, strongest first. Never invent a sign you cannot see.

Return ONLY this JSON, on one line:
{"verdict": "likely_ai" | "no_ai_signs" | "cant_tell", "confidence": <0.0–1.0>, "kind": "photo" | "illustration" | "screenshot" | "meme" | "other", "summary": "<one plain sentence for a viewer>", "signs": [{"what": "...", "why": "...", "box": [x1, y1, x2, y2]}], "harm": {"harmful": <true|false>, "category": "none" | "violence" | "sexual" | "hate" | "threat" | "doxxing" | "self_harm" | "deceptive_fake", "reason": "<one plain sentence, or empty>", "regions": [{"what": "...", "box": [x1, y1, x2, y2]}]}}`;
