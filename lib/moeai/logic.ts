import { expression } from "./math.ts";

export const LOGIC_VARIABLES = ["A", "B", "C", "D"] as const;
export type Row = { values: boolean[]; value: boolean };
export type Analysis = { variables: string[]; rows: Row[]; minterms: number[]; sop: string; kmap: KMap | null };
/** Gray-code ordering is what makes a K-map readable: neighbours differ in one bit. */
const GRAY = [0, 1, 3, 2];

export type KMap = { rowVars: string[]; colVars: string[]; rowCodes: number[]; colCodes: number[]; cells: { index: number; value: boolean }[][] };

/** Which of A..D the expression actually mentions, in canonical order. */
export function variablesUsed(source: string) {
  const used = LOGIC_VARIABLES.filter(v => new RegExp(`\\b${v}\\b`).test(source));
  return used.length ? used : ["A"];
}

export function analyse(source: string): Analysis {
  const variables = variablesUsed(source);
  if (variables.length > 4) throw new Error("Use up to four variables: A, B, C, D.");
  const compiled = expression(source, [...LOGIC_VARIABLES]).compile();
  const width = variables.length;
  const rows: Row[] = [];
  const minterms: number[] = [];
  for (let i = 0; i < 2 ** width; i++) {
    // Most significant bit is the first variable, so the table reads like a textbook.
    const values = variables.map((_, bit) => Boolean(i & (1 << (width - 1 - bit))));
    const scope: Record<string, boolean> = { A: false, B: false, C: false, D: false };
    variables.forEach((name, index) => { scope[name] = values[index]; });
    const value = Boolean(compiled.evaluate(scope));
    rows.push({ values, value });
    if (value) minterms.push(i);
  }
  return { variables, rows, minterms, sop: minimalSop(minterms, variables), kmap: kmap(variables, rows) };
}

function kmap(variables: string[], rows: Row[]): KMap | null {
  if (variables.length < 2) return null;
  const rowCount = variables.length === 2 ? 1 : 2;
  const rowVars = variables.slice(0, rowCount), colVars = variables.slice(rowCount);
  const rowCodes = GRAY.slice(0, 2 ** rowVars.length), colCodes = GRAY.slice(0, 2 ** colVars.length);
  const cells = rowCodes.map(r => colCodes.map(c => {
    const index = (r << colVars.length) | c;
    return { index, value: rows[index].value };
  }));
  return { rowVars, colVars, rowCodes, colCodes, cells };
}

/** Quine–McCluskey: combine implicants until nothing else merges, then cover
 *  every minterm greedily. Four variables is sixteen rows, so plain loops are fine. */
function minimalSop(minterms: number[], variables: string[]) {
  const width = variables.length;
  if (!minterms.length) return "0";
  if (minterms.length === 2 ** width) return "1";

  type Implicant = { bits: string; covers: number[] };
  const toBits = (n: number) => n.toString(2).padStart(width, "0");
  let current: Implicant[] = minterms.map(m => ({ bits: toBits(m), covers: [m] }));
  const primes: Implicant[] = [];

  while (current.length) {
    const merged = new Set<number>();
    const next = new Map<string, Implicant>();
    for (let i = 0; i < current.length; i++) for (let j = i + 1; j < current.length; j++) {
      const a = current[i].bits, b = current[j].bits;
      let difference = -1, count = 0;
      for (let k = 0; k < width; k++) if (a[k] !== b[k]) { difference = k; count++; }
      if (count !== 1) continue;
      merged.add(i); merged.add(j);
      const bits = a.slice(0, difference) + "-" + a.slice(difference + 1);
      const covers = [...new Set([...current[i].covers, ...current[j].covers])].sort((x, y) => x - y);
      next.set(bits, { bits, covers });
    }
    current.forEach((implicant, index) => { if (!merged.has(index)) primes.push(implicant); });
    current = [...next.values()];
  }

  const uncovered = new Set(minterms);
  const chosen: Implicant[] = [];
  // Essential primes first: a minterm covered by exactly one prime forces that prime.
  for (const minterm of minterms) {
    const covering = primes.filter(p => p.covers.includes(minterm));
    if (covering.length === 1 && !chosen.includes(covering[0])) {
      chosen.push(covering[0]);
      covering[0].covers.forEach(m => uncovered.delete(m));
    }
  }
  while (uncovered.size) {
    const best = primes.filter(p => !chosen.includes(p))
      .sort((a, b) => b.covers.filter(m => uncovered.has(m)).length - a.covers.filter(m => uncovered.has(m)).length)[0];
    if (!best || !best.covers.some(m => uncovered.has(m))) break;
    chosen.push(best); best.covers.forEach(m => uncovered.delete(m));
  }

  return chosen.map(p => term(p.bits, variables)).sort((a, b) => a.length - b.length || a.localeCompare(b)).join(" + ") || "0";
}

function term(bits: string, variables: string[]) {
  const parts = [...bits].map((bit, index) => bit === "-" ? "" : bit === "1" ? variables[index] : `${variables[index]}'`).filter(Boolean);
  return parts.length ? parts.join("") : "1";
}
