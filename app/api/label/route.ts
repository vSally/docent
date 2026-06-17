import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { NextResponse } from "next/server";
import { LabelPackSchema } from "@/lib/labelPack";

export const runtime = "nodejs";

const SUPPORTED_MEDIA = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type SupportedMedia = (typeof SUPPORTED_MEDIA)[number];

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Server is missing ANTHROPIC_API_KEY. Add it to .env.local and restart." },
      { status: 500 },
    );
  }

  let body: {
    imageBase64?: string;
    mediaType?: string;
    imageUrl?: string;
    title?: string;
    maker?: string;
    date?: string;
    medium?: string;
    language?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { imageBase64, mediaType, imageUrl, title, maker, date, medium } = body;
  const language = body.language?.trim() || "Spanish";

  // Accept either an uploaded image (base64) or a public image URL.
  let imageSource: Anthropic.ImageBlockParam["source"];
  if (imageBase64 && mediaType) {
    if (!SUPPORTED_MEDIA.includes(mediaType as SupportedMedia)) {
      return NextResponse.json(
        { error: "Unsupported image type. Use JPEG, PNG, GIF, or WebP." },
        { status: 400 },
      );
    }
    imageSource = { type: "base64", media_type: mediaType as SupportedMedia, data: imageBase64 };
  } else if (imageUrl) {
    let url: URL;
    try {
      url = new URL(imageUrl);
    } catch {
      return NextResponse.json({ error: "That image URL is not valid." }, { status: 400 });
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return NextResponse.json(
        { error: "Image URL must start with http:// or https://." },
        { status: 400 },
      );
    }
    imageSource = { type: "url", url: imageUrl };
  } else {
    return NextResponse.json(
      { error: "An image is required — upload a file or paste an image URL." },
      { status: 400 },
    );
  }

  const knownFacts = [
    title && `Title: ${title}`,
    maker && `Maker/Artist: ${maker}`,
    date && `Date: ${date}`,
    medium && `Medium: ${medium}`,
  ]
    .filter(Boolean)
    .join("\n");

  const client = new Anthropic();

  const instructions = [
    "You are Docent, an assistant that makes museum objects accessible to every visitor.",
    "Look at the image of the museum object and produce an accessible label pack.",
    "Write clearly and warmly. Do not invent specific facts (artist, date, provenance) that you cannot see in the image or that were not provided — if unsure, describe what is visible and note the uncertainty in curatorNote.",
    knownFacts
      ? `The museum provided these facts about the object:\n${knownFacts}`
      : "No metadata was provided; rely on what is visible in the image.",
    `Translate the plain-language label into: ${language}.`,
  ].join("\n\n");

  try {
    const response = await client.messages.parse({
      model: "claude-opus-4-8",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: imageSource },
            { type: "text", text: instructions },
          ],
        },
      ],
      output_config: { format: zodOutputFormat(LabelPackSchema) },
    });

    if (!response.parsed_output) {
      return NextResponse.json(
        { error: "Could not generate a label pack for this image. Try a clearer photo." },
        { status: 502 },
      );
    }

    return NextResponse.json({ labelPack: response.parsed_output });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: "Invalid Anthropic API key." }, { status: 401 });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "Rate limited. Wait a moment and try again." },
        { status: 429 },
      );
    }
    const message = error instanceof Error ? error.message : "Unknown error.";
    return NextResponse.json({ error: `Something went wrong: ${message}` }, { status: 500 });
  }
}
