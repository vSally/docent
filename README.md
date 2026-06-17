# Docent

**Make any museum object accessible to every visitor.** Upload a photo of an object and Docent uses Claude's vision to generate an accessible "label pack": a plain-language wall label, image **alt-text** for blind and low-vision visitors, a short audio-guide script, a kids' version, and a translation — all in seconds, as a draft for curator review.

![status](https://img.shields.io/badge/stage-MVP-blue)

## Why

Small museums and historical societies hold thousands of objects, but most lack the staff to write accessible labels, alt-text, and translations for all of them. That leaves out visitors who are blind or low-vision, who read below a college level, or who don't speak English. Docent closes that gap with AI — the kind of tool a nonprofit could put to use immediately.

## What it generates

From one photo (plus optional title/maker/date/medium), Docent returns:

1. **Plain-language label** — ~6th–8th grade reading level
2. **Image alt-text** — accessibility-first, generated from the image
3. **Audio-guide script** — ~30 seconds, conversational
4. **Kids' version** — for ~10-year-olds
5. **Translation** — the label in a language you choose
6. **Curator note** — flags anything the AI is unsure about; every pack is labeled "AI-drafted, review before display"

## Tech

- **Next.js (App Router) + TypeScript + Tailwind CSS**
- **Anthropic API** — `claude-opus-4-8` with vision and structured (schema-validated) output
- Designed to deploy to **Vercel**

## Run it locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Add your Anthropic API key (get one at [console.anthropic.com](https://console.anthropic.com); new accounts get free trial credits):
   ```bash
   cp .env.local.example .env.local
   # then edit .env.local and paste your key
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Open <http://localhost:3000>, upload a photo of an object, and click **Generate label pack**.

## Roadmap

- [ ] Generate translations in several languages at once
- [ ] Audio playback of the guide script (text-to-speech)
- [ ] Pull real objects from the [Met Museum Open Access API](https://metmuseum.github.io/)
- [ ] Printable / PDF label export
- [ ] Deploy to Vercel with a public demo URL

---

Built as a portfolio project exploring AI for mission-driven organizations. See [SPEC.md](SPEC.md) for the full design.
