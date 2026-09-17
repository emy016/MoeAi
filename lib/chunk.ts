/**
 * Splitting uploaded material into retrievable chunks.
 *
 * Chunks are paragraph-aligned rather than fixed-width, because a lecture
 * paragraph cut in half retrieves badly: the half with the keyword loses the
 * half with the explanation. Overlap carries a little context across the seam.
 */

const TARGET = 1200;   // characters — roughly a slide or two of lecture text
const MAX = 1800;
const OVERLAP = 150;

/** Normalise whitespace without destroying paragraph boundaries. */
function tidy(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function chunkText(raw: string): string[] {
  const text = tidy(raw);
  if (!text) return [];
  if (text.length <= MAX) return [text];

  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let current = "";

  const push = () => {
    const trimmed = current.trim();
    if (trimmed) chunks.push(trimmed);
    current = "";
  };

  for (const para of paragraphs) {
    // A single paragraph longer than MAX is split on sentence boundaries.
    if (para.length > MAX) {
      push();
      const sentences = para.split(/(?<=[.!?؟।])\s+/);
      let buf = "";
      for (const s of sentences) {
        if (buf.length + s.length > TARGET && buf) {
          chunks.push(buf.trim());
          buf = buf.slice(-OVERLAP) + " ";
        }
        buf += s + " ";
      }
      if (buf.trim()) chunks.push(buf.trim());
      continue;
    }

    if (current.length + para.length > TARGET && current) push();
    current += (current ? "\n\n" : "") + para;
  }
  push();

  return chunks.filter((c) => c.length > 40);
}

/** Pull text out of an uploaded file. Returns null for unsupported types. */
export async function extractText(file: File): Promise<string | null> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    const { extractText: pdfText, getDocumentProxy } = await import("unpdf");
    const buf = new Uint8Array(await file.arrayBuffer());
    const doc = await getDocumentProxy(buf);
    // mergePages returns one string; the union in the signature is for the
    // per-page form we do not use here.
    const { text } = await pdfText(doc, { mergePages: true });
    return Array.isArray(text) ? text.join("\n\n") : String(text);
  }

  if (/\.(txt|md|markdown|csv|srt|vtt)$/.test(name) || file.type.startsWith("text/")) {
    const text = await file.text();
    // Subtitle files are mostly timestamps; strip them so retrieval sees prose.
    if (/\.(srt|vtt)$/.test(name)) {
      return text
        .replace(/^WEBVTT.*$/gm, "")
        .replace(/^\d+$/gm, "")
        .replace(/^[\d:.,]+\s*-->\s*[\d:.,]+.*$/gm, "")
        .replace(/\n{3,}/g, "\n\n");
    }
    return text;
  }

  return null;
}
