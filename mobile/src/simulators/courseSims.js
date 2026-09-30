/**
 * The simulators MoeAI built for a university course (tutor mode plans them
 * from the course map; see lib/sims.ts on the site), turned into what the
 * simulator view opens. A row either reuses one of the built-in engines or
 * carries a page MoeAI wrote for this course, which runs in the same sandbox
 * with the same kit (theme colours, KaTeX, math.js, plotting helpers).
 */
import { LIBRARY } from './catalog';
import { KIT, MATHJS } from './library/kit';

const HEAD = `${MATHJS}${KIT}`;

export function simFromRow(row) {
  if (row.builtin_id) {
    const base = LIBRARY.find((sim) => sim.id === row.builtin_id);
    return base ? { ...base, id: `${row.id}:${base.id}`, rowId: row.id, title: row.title || base.title, topic: row.topic, source: row.source } : null;
  }
  if (!row.code) return null;
  return { id: row.id, rowId: row.id, title: row.title, topic: row.topic, status: 'moeai', kind: 'visualizer', code: `${HEAD}${row.code}`, source: row.source, custom: true };
}

/** Rows grouped by course id, in the order staff arranged them, only the ones that open. */
export function groupRows(rows) {
  const map = new Map();
  for (const row of rows || []) {
    const sim = simFromRow(row);
    if (!sim) continue;
    if (!map.has(row.course_id)) map.set(row.course_id, []);
    map.get(row.course_id).push(sim);
  }
  return map;
}
