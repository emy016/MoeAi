import "server-only";
import { PDFDocument } from "pdf-lib";
import { streamGemini } from "../ai/gemini";
import type { Page } from "./extract";

/**
 * Reading PDFs that have no text layer: scanned handouts, phone photos of a
 * whiteboard, handwritten revision sheets. unpdf finds nothing on those pages,
 * so they are cut out of the file in small batches and Gemini transcribes each
 * batch from the images, in parallel so a whole revision fits in one request.
 *
 * Each batch is its own little PDF rather than "pages 13-18 of this file":
 * models miscount pages in long documents, and a citation that points at the
 * wrong page is worse than none.
 */

/** A page with less text than this is treated as an image. */
export const SPARSE_CHARS = 40;
const BATCH = 5;
const PARALLEL = 5;
const MAX_PAGES = 60;
/** Gemini takes about 20 MB per request, and base64 adds a third. */
const MAX_BATCH_BYTES = 14 * 1024 * 1024;
const BUDGET_MS = 42_000; // leaves time to embed and save inside the 60 s function

const SYSTEM = `You transcribe university course pages (lecture slides, handouts, handwritten revision notes) into plain text for a study assistant.
- Write every page out in full, in reading order, in the language it is written in (Arabic stays Arabic, English stays English).
- Math in LaTeX: $...$ inline, $$...$$ on its own line. Tables as Markdown tables. Code in fenced blocks.
- A diagram, graph or circuit becomes one line: [Figure: what it shows, with its labels and values].
- Crossed-out text is left out. A word you cannot read is written [?].
- Do not summarise, explain, correct or add anything.
- Start each page with a line "=== Page N ===", N counting from 1 in this file. A blank page is just its marker.`;

export type OcrResult = { pages: Page[]; failed: number[] };

async function slice(src: PDFDocument, indices: number[]): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, indices);
  for (const p of copied) out.addPage(p);
  return out.save();
}

async function transcribe(bytes: Uint8Array, count: number, signal: AbortSignal): Promise<string[]> {
  let text = "";
  const stream = streamGemini({
    system: SYSTEM,
    contents: [{
      role: "user",
      parts: [
        { inlineData: { mimeType: "application/pdf", data: Buffer.from(bytes).toString("base64") } },
        { text: `Transcribe all ${count} page${count === 1 ? "" : "s"} of this file.` },
      ],
    }],
    temperature: 0.1,
    maxOutputTokens: 8192,
    signal,
  });
  for await (const delta of stream) text += delta;
  const pages: string[] = Array(count).fill("");
  const parts = text.split(/^[ \t]*=+\s*Page\s+(\d+)\s*=+[ \t]*$/gim);
  if (parts.length < 3) {
    // No markers: a one-page batch is still usable, a longer one cannot be split honestly.
    if (count === 1 && text.trim()) return [text.trim()];
    throw new Error("unmarked transcription");
  }
  for (let i = 1; i < parts.length; i += 2) {
    const n = Number(parts[i]) - 1;
    if (n >= 0 && n < count) pages[n] = (pages[n] ? `${pages[n]}\n` : "") + parts[i + 1].trim();
  }
  return pages;
}

/**
 * Transcribes the given 1-based page numbers of a PDF. Pages that could not be
 * read in time come back in `failed`, so the caller can say which ones.
 */
export async function ocrPages(pdf: Uint8Array, pageNumbers: number[]): Promise<OcrResult> {
  const wanted = pageNumbers.slice(0, MAX_PAGES);
  let src: PDFDocument;
  try {
    src = await PDFDocument.load(pdf, { ignoreEncryption: true });
  } catch {
    return { pages: [], failed: pageNumbers };
  }
  const batches: number[][] = [];
  for (let i = 0; i < wanted.length; i += BATCH) batches.push(wanted.slice(i, i + BATCH));

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), BUDGET_MS);
  const pages: Page[] = [];
  const failed: number[] = [...pageNumbers.slice(MAX_PAGES)];
  let next = 0;
  const worker = async () => {
    while (next < batches.length && !ctrl.signal.aborted) {
      const batch = batches[next++];
      try {
        let bytes = await slice(src, batch.map((n) => n - 1));
        if (bytes.length > MAX_BATCH_BYTES && batch.length > 1) {
          // Very heavy scans: one page at a time instead.
          for (const n of batch) {
            bytes = await slice(src, [n - 1]);
            if (bytes.length > MAX_BATCH_BYTES) { failed.push(n); continue; }
            const [text] = await transcribe(bytes, 1, ctrl.signal);
            pages.push({ page: n, text });
          }
          continue;
        }
        if (bytes.length > MAX_BATCH_BYTES) { failed.push(...batch); continue; }
        const texts = await transcribe(bytes, batch.length, ctrl.signal);
        batch.forEach((n, i) => pages.push({ page: n, text: texts[i] }));
      } catch {
        failed.push(...batch.filter((n) => !pages.some((p) => p.page === n)));
      }
    }
  };
  try {
    await Promise.all(Array.from({ length: Math.min(PARALLEL, batches.length) }, worker));
  } finally {
    clearTimeout(timer);
  }
  // Batches never started because time ran out.
  for (const batch of batches.slice(next)) failed.push(...batch);
  return { pages: pages.sort((a, b) => a.page - b.page), failed: [...new Set(failed)].sort((a, b) => a - b) };
}

/** "3, 7-9, 12" for an error message. */
export function pageRanges(pages: number[]): string {
  const out: string[] = [];
  for (let i = 0; i < pages.length; i++) {
    let j = i;
    while (j + 1 < pages.length && pages[j + 1] === pages[j] + 1) j++;
    out.push(i === j ? `${pages[i]}` : `${pages[i]}-${pages[j]}`);
    i = j;
  }
  return out.join(", ");
}
