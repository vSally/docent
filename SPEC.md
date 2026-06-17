# Docent — Spec

**One line:** An AI tool that makes any museum object accessible to every visitor — generating a plain-language label, image alt-text, an audio-guide script, a kids' version, and a translation from a single photo.

## Why this exists (the problem)

Museums hold thousands of objects, but:
- Wall labels are often written at a college reading level, excluding many visitors.
- Almost no images have **alt-text**, so blind and low-vision visitors can't access them (an accessibility and ADA concern).
- Translations into other languages are rare, excluding non-English speakers.

Museums don't have the staff to fix this object-by-object. Docent does it in seconds from a photo, producing a draft a curator can review and publish.

## Who it's for
- **Small museums, historical societies, and conservation nonprofits** that want to be accessible but lack staff.
- Built in the spirit of the kind of AI tooling a forward-deployed engineer would build *for* such an organization.

## What it does (MVP)

Input:
- An **image** of the object (upload), and
- Optional metadata: title, maker/artist, date, medium.
- A **target language** for translation.

Output — a "label pack":
1. **Plain-language label** (~6th–8th grade, ~75 words)
2. **Image alt-text** (concise, accessibility best-practice, generated from the image via Claude vision)
3. **Audio-guide script** (~30 seconds, conversational)
4. **Kids' version** (friendly, for ~10-year-olds)
5. **Translation** of the plain-language label into the chosen language
6. **Curator note** — flags visual details the model is unsure about, plus an "AI-drafted, review before display" reminder

## How it maps to Claude Corps criteria
- **AI experience** — Claude vision (multimodal) + structured JSON output + prompt engineering for reading level and tone.
- **Communication** — the product is *about* accessible communication; the repo has a clear README + demo.
- **Societal motivation** — cultural access for disabled, young, and non-English-speaking visitors.
- **Mirrors the fellowship work** — an AI tool for a real nonprofit workflow.

## Tech
- **Next.js (App Router) + TypeScript + Tailwind**
- **Anthropic API** (`claude-opus-4-8`, vision) in a server route (`/api/label`)
- **Structured output** via zod schema
- Deployed to **Vercel** → public URL

## Responsible AI
Every label pack is explicitly labeled AI-drafted and "for curator review." The model is instructed to flag uncertainty rather than invent visual facts it can't verify from the image.

## Build stages
1. **MVP (this build):** image + metadata → label pack, shown in a clean UI. Run locally.
2. Deploy to Vercel for a live URL.
3. **Stretch:** multiple languages at once; audio playback (text-to-speech); pull real objects from the Met Museum Open Access API; PDF/printable label export.
