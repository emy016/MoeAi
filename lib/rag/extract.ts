import "server-only";
import JSZip from "jszip";

/**
 * Text out of the files staff upload, kept in pages (PDF pages, slides) so a
 * citation can say where a passage came from.
 */
export type Page = { page: number; text: string };

const decodeXml = (s: string) => s
  .replace(/<a:br\/>|<w:br\/>|<\/a:p>|<\/w:p>/g, "\n")
  .replace(/<w:tab\/>/g, "\t")
  .replace(/<[^>]+>/g, "")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

export async function extractPages(bytes: Uint8Array, name: string, mime = ""): Promise<Page[]> {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf") || mime === "application/pdf") {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const doc = await getDocumentProxy(bytes);
    const { text } = await extractText(doc, { mergePages: false });
    return (Array.isArray(text) ? text : [String(text)]).map((t, i) => ({ page: i + 1, text: t }));
  }
  if (lower.endsWith(".pptx")) {
    const zip = await JSZip.loadAsync(bytes);
    const slides = Object.keys(zip.files)
      .filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
      .sort((a, b) => Number(/(\d+)\.xml$/.exec(a)![1]) - Number(/(\d+)\.xml$/.exec(b)![1]));
    const pages: Page[] = [];
    for (const [i, f] of slides.entries()) {
      const xml = await zip.file(f)!.async("string");
      const notesFile = zip.file(f.replace("slides/slide", "notesSlides/notesSlide"));
      const notes = notesFile ? decodeXml(await notesFile.async("string")) : "";
      pages.push({ page: i + 1, text: [decodeXml(xml), notes && `Speaker notes: ${notes}`].filter(Boolean).join("\n\n") });
    }
    return pages;
  }
  if (lower.endsWith(".docx")) {
    const zip = await JSZip.loadAsync(bytes);
    const xml = await zip.file("word/document.xml")?.async("string");
    return [{ page: 1, text: xml ? decodeXml(xml) : "" }];
  }
  // Plain text, Markdown, subtitles.
  const text = new TextDecoder().decode(bytes);
  return [{ page: 1, text }];
}
