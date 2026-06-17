import { z } from "zod";

// The structured "label pack" Docent generates for a museum object.
export const LabelPackSchema = z.object({
  plainLabel: z
    .string()
    .describe("A wall label at roughly a 6th-8th grade reading level, about 75 words."),
  altText: z
    .string()
    .describe(
      "Concise image alt-text describing the object for blind/low-vision visitors, following accessibility best practices. One or two sentences.",
    ),
  audioGuideScript: z
    .string()
    .describe("A warm, conversational audio-guide script of about 30 seconds when read aloud."),
  kidsVersion: z
    .string()
    .describe("A friendly explanation aimed at a 10-year-old, 2-3 short sentences."),
  translation: z
    .string()
    .describe("The plain-language label translated into the requested target language."),
  curatorNote: z
    .string()
    .describe(
      "A short note for the curator: flag any visual details you are unsure about, and remind them this is an AI draft for review before display.",
    ),
});

export type LabelPack = z.infer<typeof LabelPackSchema>;

// Metadata the user may optionally supply about the object.
export type ObjectMeta = {
  title?: string;
  maker?: string;
  date?: string;
  medium?: string;
  language: string; // target translation language, e.g. "Spanish"
};
