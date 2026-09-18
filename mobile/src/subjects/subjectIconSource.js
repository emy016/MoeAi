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
  normalizeQuery: (name) => String(name || '').trim().toLowerCase().replace(/\s+/g, '-'),
};

let activeSource = SUBJECT_ICON_SEARCH_RULES;

export function configureSubjectIconSource(overrides = {}) {
  activeSource = { ...SUBJECT_ICON_SEARCH_RULES, ...overrides };
  cache.clear();
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
