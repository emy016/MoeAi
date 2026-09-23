/**
 * GET /api/subject-icon?q=<subject> — the MoeAI app's course icon predictor, for browsers.
 *
 * The app picks each course's icon from the first Noun Project search result
 * for its name. On a phone it reads that search page directly; a browser is
 * not allowed to (the page sends no CORS headers), so on the web every course
 * fell back to a built-in icon. This reads the page server-side and returns
 * the same three fields the app's own resolver extracts, so the web gets the
 * same icon a phone does.
 *
 * Results are cached at the edge for a week: icon search results barely move,
 * and every student with a "Mathematics" course asks the same question.
 * Anything that goes wrong answers `null` (a 200, so browsers do not log an
 * error per course), and the app keeps its built-in icon.
 */
import { NextRequest } from "next/server";

export const runtime = "nodejs";

const SEARCH = "https://thenounproject.com/browse/icons/term";
const RESULT = /"thumbnailUrl":"([^"]+)"[\s\S]*?"creditText":"([^"]+)"[\s\S]*?"acquireLicensePage":"([^"]+)"/;
const ICON_HOST = /^https:\/\/static\.thenounproject\.com\//;

function decode(value: string) {
  try {
    return JSON.parse(`"${value}"`) as string;
  } catch {
    return value.replace(/\\u0026/g, "&").replace(/\\\//g, "/");
  }
}

const none = () => Response.json(null, { headers: { "cache-control": "public, s-maxage=86400" } });

export async function GET(req: NextRequest) {
  // Same normalisation as the app's SUBJECT_ICON_SEARCH_RULES.normalizeQuery.
  const query = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase().replace(/\s+/g, "-").slice(0, 60);
  if (!query) return none();

  try {
    const response = await fetch(`${SEARCH}/${encodeURIComponent(query)}/`, {
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; EduMoe/1.0; +https://moe-ai-sable.vercel.app)",
        accept: "text/html",
      },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 604800 },
    });
    if (!response.ok) return none();
    const match = RESULT.exec(await response.text());
    if (!match) return none();
    const uri = decode(match[1]);
    // Only ever hand back an image from the Noun Project's own CDN.
    if (!ICON_HOST.test(uri)) return none();
    return Response.json(
      { uri, credit: decode(match[2]), sourceUrl: decode(match[3]), provider: "noun-project" },
      { headers: { "cache-control": "public, s-maxage=604800, stale-while-revalidate=86400" } },
    );
  } catch {
    return none();
  }
}
