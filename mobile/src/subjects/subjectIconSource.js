/**
 * Replaceable subject-icon search provider.
 *
 * The default rule reads the first ImageObject from the Noun Project search
 * page for the subject name. A production backend can replace `resolve` with
 * an authenticated Noun Project API v2 proxy without changing subject cards.
 */
const cache = new Map();

export const SUBJECT_ICON_SEARCH_RULES = {
  provider: 'noun-project',
  resultIndex: 0,
  baseUrl: 'https://thenounproject.com/browse/icons/term',
  supportsWeb: false,
  normalizeQuery: (name) => String(name || '').trim().toLowerCase().replace(/\s+/g, '-'),
};

/**
 * Served from the EduMoe site, the browser cannot read Noun Project pages
 * itself (no CORS), but the site's /api/subject-icon reads the same first
 * result server-side and answers from this origin. So on the web the default
 * rule goes through that proxy and the predictor works the same as on native.
 */
const webOrigin = typeof window !== 'undefined' && /^https?:/.test(window.location?.origin || '') ? window.location.origin : '';
if (webOrigin) {
  SUBJECT_ICON_SEARCH_RULES.resolve = async ({ query }) => {
    try {
      const response = await fetch(`${webOrigin}/api/subject-icon?q=${encodeURIComponent(query)}`);
      if (!response.ok) return null;
      const result = await response.json();
      return result?.uri ? result : null;
    } catch (_) {
      return null; // Offline or no result: SubjectIcon keeps its built-in icon.
    }
  };
}

let activeSource = SUBJECT_ICON_SEARCH_RULES;

export function configureSubjectIconSource(overrides = {}) {
  activeSource = { ...SUBJECT_ICON_SEARCH_RULES, ...overrides };
  cache.clear();
}

export function subjectIconSourceSupportsPlatform(platform) {
  return platform !== 'web' || activeSource.supportsWeb === true || typeof activeSource.resolve === 'function';
}

function decodeJsonString(value) {
  try { return JSON.parse(`"${value}"`); } catch (_) { return value.replace(/\\u0026/g, '&').replace(/\\\//g, '/'); }
}

export async function resolveSubjectIcon(name) {
  const query = activeSource.normalizeQuery(name);
  if (!query) return null;
  const cacheKey = `${activeSource.provider}:${query}:${activeSource.resultIndex}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  const pending = activeSource.resolve ? activeSource.resolve({ name, query, rules: activeSource }) : (async () => {
    const response = await fetch(`${activeSource.baseUrl}/${encodeURIComponent(query)}/`);
    if (!response.ok) throw new Error(`Icon search failed: ${response.status}`);
    const html = await response.text();
    const matches = [...html.matchAll(/"thumbnailUrl":"([^"]+)"[\s\S]*?"creditText":"([^"]+)"[\s\S]*?"acquireLicensePage":"([^"]+)"/g)];
    const match = matches[activeSource.resultIndex];
    if (!match) return null;
    return { uri: decodeJsonString(match[1]), credit: decodeJsonString(match[2]), sourceUrl: decodeJsonString(match[3]), provider: activeSource.provider };
  })().catch(() => null);
  cache.set(cacheKey, pending);
  const result = await pending;
  cache.set(cacheKey, result);
  return result;
}
