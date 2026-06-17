"use client";

import { useEffect, useState } from "react";
import type { LabelPack } from "@/lib/labelPack";

type FormState = {
  title: string;
  maker: string;
  date: string;
  medium: string;
  language: string;
};

const EMPTY: FormState = {
  title: "",
  maker: "",
  date: "",
  medium: "",
  language: "Spanish",
};

// Famous, public-domain works whose images Anthropic's servers can fetch
// (Met Museum open access + vangoghgallery). Clicking one runs a live demo.
type Example = {
  title: string;
  maker: string;
  date: string;
  medium: string;
  img: string;
};

const EXAMPLES: Example[] = [
  {
    title: "The Starry Night",
    maker: "Vincent van Gogh",
    date: "1889",
    medium: "Oil on canvas",
    img: "https://www.vangoghgallery.com/img/starry_night_full.jpg",
  },
  {
    title: "Young Woman with a Water Pitcher",
    maker: "Johannes Vermeer",
    date: "ca. 1662",
    medium: "Oil on canvas",
    img: "https://images.metmuseum.org/CRDImages/ep/web-large/DP353257.jpg",
  },
  {
    title: "The Dance Class",
    maker: "Edgar Degas",
    date: "1874",
    medium: "Oil on canvas",
    img: "https://images.metmuseum.org/CRDImages/ep/web-large/DP-20101-001.jpg",
  },
  {
    title: "The Gulf Stream",
    maker: "Winslow Homer",
    date: "1899",
    medium: "Oil on canvas",
    img: "https://images.metmuseum.org/CRDImages/ad/web-large/DP-20821-001.jpg",
  },
  {
    title: "The Death of Socrates",
    maker: "Jacques Louis David",
    date: "1787",
    medium: "Oil on canvas",
    img: "https://images.metmuseum.org/CRDImages/ep/web-large/DP-13139-001.jpg",
  },
  {
    title: "Washington Crossing the Delaware",
    maker: "Emanuel Leutze",
    date: "1851",
    medium: "Oil on canvas",
    img: "https://images.metmuseum.org/CRDImages/ad/web-large/DP215410.jpg",
  },
];

const RESULT_SECTIONS: { key: keyof LabelPack; label: string }[] = [
  { key: "plainLabel", label: "Plain-language label" },
  { key: "altText", label: "Image alt-text (accessibility)" },
  { key: "audioGuideScript", label: "Audio-guide script (~30s)" },
  { key: "kidsVersion", label: "Kids' version" },
  { key: "translation", label: "Translation" },
  { key: "curatorNote", label: "Curator note" },
];

type HistoryEntry = {
  id: string;
  createdAt: number;
  title: string;
  maker: string;
  language: string;
  thumb: string | null;
  pack: LabelPack;
};

const HISTORY_KEY = "docent:history:v1";
const HISTORY_LIMIT = 12;

// Shrink an uploaded image (data URL) to a small thumbnail so localStorage
// doesn't fill up. Remote URLs are stored as-is (canvas can't read cross-origin).
function makeThumb(src: string): Promise<string | null> {
  if (!src.startsWith("data:")) return Promise.resolve(src);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const maxW = 240;
      const scale = Math.min(1, maxW / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(null);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      try {
        resolve(canvas.toDataURL("image/jpeg", 0.6));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

// Persist, trimming oldest entries if we hit the storage quota.
function saveHistory(entries: HistoryEntry[]) {
  let trimmed = entries.slice(0, HISTORY_LIMIT);
  while (trimmed.length > 0) {
    try {
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
      return;
    } catch {
      trimmed = trimmed.slice(0, -1); // drop the oldest and retry
    }
  }
}

export default function Home() {
  const [tab, setTab] = useState<"generate" | "history">("generate");
  const [form, setForm] = useState<FormState>(EMPTY);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LabelPack | null>(null);

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  function onFile(file: File) {
    setError(null);
    setImageUrl(""); // a file takes over from any pasted URL
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPreview(dataUrl);
      setMediaType(file.type);
      setImageBase64(dataUrl.split(",")[1] ?? null);
    };
    reader.readAsDataURL(file);
  }

  function onUrl(value: string) {
    setError(null);
    setImageUrl(value);
    // a pasted URL takes over from any uploaded file
    setImageBase64(null);
    setMediaType(null);
    setPreview(value.trim() ? value.trim() : null);
  }

  // Core generation runner — used by both the form and the example gallery.
  async function run(
    payload: Record<string, unknown>,
    previewSrc: string | null,
    meta: { title: string; maker: string; language: string },
  ) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/label", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed.");
      const pack = data.labelPack as LabelPack;
      setResult(pack);

      const thumb = previewSrc ? await makeThumb(previewSrc) : null;
      const entry: HistoryEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: Date.now(),
        title: meta.title.trim() || "Untitled object",
        maker: meta.maker.trim(),
        language: meta.language.trim(),
        thumb,
        pack,
      };
      setHistory((prev) => {
        const next = [entry, ...prev].slice(0, HISTORY_LIMIT);
        saveHistory(next);
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function generate() {
    const usingFile = Boolean(imageBase64 && mediaType);
    const usingUrl = imageUrl.trim().length > 0;
    if (!usingFile && !usingUrl) {
      setError("Add an image first — upload a file, paste a URL, or pick a famous artwork below.");
      return;
    }
    const payload = usingFile
      ? { imageBase64, mediaType, ...form }
      : { imageUrl: imageUrl.trim(), ...form };
    await run(payload, preview, { title: form.title, maker: form.maker, language: form.language });
  }

  // Click a gallery piece → fill the form, show it, and generate immediately.
  async function pickExample(ex: Example) {
    if (loading) return;
    setTab("generate");
    setImageBase64(null);
    setMediaType(null);
    setImageUrl(ex.img);
    setPreview(ex.img);
    const nextForm = {
      title: ex.title,
      maker: ex.maker,
      date: ex.date,
      medium: ex.medium,
      language: form.language,
    };
    setForm(nextForm);
    await run(
      { imageUrl: ex.img, ...nextForm },
      ex.img,
      { title: ex.title, maker: ex.maker, language: form.language },
    );
  }

  function clearHistory() {
    setHistory([]);
    setSelectedId(null);
    try {
      window.localStorage.removeItem(HISTORY_KEY);
    } catch {
      /* ignore */
    }
  }

  const selected = history.find((h) => h.id === selectedId) ?? null;

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Docent</h1>
        <p className="mt-2 text-lg text-slate-600">
          Make any museum object accessible to every visitor. Upload a photo and get a
          plain-language label, alt-text, an audio-guide script, a kids&apos; version, and a
          translation.
        </p>
      </header>

      {/* Tabs */}
      <div className="mb-8 flex gap-1 border-b border-slate-200">
        <TabButton active={tab === "generate"} onClick={() => setTab("generate")}>
          Generate
        </TabButton>
        <TabButton active={tab === "history"} onClick={() => setTab("history")}>
          Already generated{history.length > 0 ? ` (${history.length})` : ""}
        </TabButton>
      </div>

      {tab === "generate" ? (
        <>
          {/* Example gallery */}
          <section className="mb-10">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Try a famous artwork
              </h2>
              <span className="text-xs text-slate-400">
                {loading ? "Generating…" : "Click a piece to see a live label pack"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex.title}
                  onClick={() => pickExample(ex)}
                  disabled={loading}
                  className="group relative overflow-hidden rounded-lg border border-slate-200 text-left transition hover:border-slate-400 hover:shadow-md disabled:opacity-60"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ex.img}
                    alt={ex.title}
                    className="h-32 w-full object-cover transition group-hover:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-2">
                    <p className="truncate text-xs font-semibold text-white">{ex.title}</p>
                    <p className="truncate text-[11px] text-white/80">{ex.maker}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Input */}
            <section className="space-y-5">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Photo of the object</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
                  className="mt-2 block w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-700"
                />
              </label>

              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="h-px flex-1 bg-slate-200" />
                or
                <span className="h-px flex-1 bg-slate-200" />
              </div>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Paste an image URL</span>
                <input
                  type="url"
                  inputMode="url"
                  placeholder="https://example.com/object.jpg"
                  value={imageUrl}
                  onChange={(e) => onUrl(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none"
                />
              </label>

              {preview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview}
                  alt="Selected object preview"
                  className="max-h-64 rounded-lg border border-slate-200 object-contain"
                />
              )}

              <div className="grid grid-cols-2 gap-3">
                <Field label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
                <Field label="Maker / artist" value={form.maker} onChange={(v) => setForm({ ...form, maker: v })} />
                <Field label="Date" value={form.date} onChange={(v) => setForm({ ...form, date: v })} />
                <Field label="Medium" value={form.medium} onChange={(v) => setForm({ ...form, medium: v })} />
              </div>
              <Field
                label="Translate into"
                value={form.language}
                onChange={(v) => setForm({ ...form, language: v })}
              />
              <p className="text-xs text-slate-500">
                Metadata is optional — Docent works from the photo alone, but facts you provide make
                the label more accurate.
              </p>

              <button
                onClick={generate}
                disabled={loading}
                className="w-full rounded-md bg-slate-900 px-4 py-3 font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
              >
                {loading ? "Generating…" : "Generate label pack"}
              </button>

              {error && (
                <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
              )}
            </section>

            {/* Output */}
            <section>
              {result ? (
                <PackView pack={result} />
              ) : (
                <div className="flex h-full min-h-64 items-center justify-center rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-400">
                  {loading ? "Reading the artwork…" : "The label pack will appear here."}
                </div>
              )}
            </section>
          </div>
        </>
      ) : (
        /* History tab */
        <div>
          {history.length === 0 ? (
            <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-400">
              Nothing here yet. Generate a label pack and it will be saved to this tab.
            </div>
          ) : selected ? (
            <div className="space-y-4">
              <button
                onClick={() => setSelectedId(null)}
                className="text-sm font-medium text-slate-600 hover:underline"
              >
                ← Back to all
              </button>
              <div className="flex items-center gap-4">
                {selected.thumb && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selected.thumb}
                    alt={selected.title}
                    className="h-20 w-20 rounded-lg border border-slate-200 object-cover"
                  />
                )}
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{selected.title}</h2>
                  {selected.maker && <p className="text-sm text-slate-600">{selected.maker}</p>}
                  <p className="text-xs text-slate-400">
                    {new Date(selected.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <PackView pack={selected.pack} />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  Saved on this device. Click any card to reopen its full pack.
                </p>
                <button
                  onClick={clearHistory}
                  className="text-xs font-medium text-red-600 hover:underline"
                >
                  Clear history
                </button>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2">
                {history.map((h) => (
                  <li key={h.id}>
                    <button
                      onClick={() => setSelectedId(h.id)}
                      className="flex w-full items-center gap-3 rounded-lg border border-slate-200 p-3 text-left transition hover:border-slate-400 hover:bg-slate-50"
                    >
                      {h.thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={h.thumb}
                          alt={h.title}
                          className="h-14 w-14 shrink-0 rounded-md border border-slate-200 object-cover"
                        />
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-xs text-slate-400">
                          no image
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-800">{h.title}</p>
                        {h.maker && <p className="truncate text-sm text-slate-500">{h.maker}</p>}
                        <p className="text-xs text-slate-400">
                          {new Date(h.createdAt).toLocaleDateString()} · {h.language}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

function PackView({ pack }: { pack: LabelPack }) {
  return (
    <div className="space-y-4">
      {RESULT_SECTIONS.map(({ key, label }) => (
        <div key={key} className="rounded-lg border border-slate-200 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{label}</h2>
          <p className="mt-1 whitespace-pre-wrap text-slate-800">{pack[key]}</p>
        </div>
      ))}
      <p className="text-xs text-slate-500">AI-drafted with Claude. Review before public display.</p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
        active
          ? "border-slate-900 text-slate-900"
          : "border-transparent text-slate-500 hover:text-slate-800"
      }`}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none"
      />
    </label>
  );
}
