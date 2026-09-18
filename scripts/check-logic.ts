import { analyse } from "../lib/moeai/logic.ts";

const cases: [string, string][] = [
  ["A and B", "AB"],
  ["(A and B) or C", "C + AB"],
  ["A xor B", "A'B + AB'"],
  ["A or not A", "1"],
  ["A and not A", "0"],
  ["(A and B) or (C and D)", "AB + CD"],
  ["not (A and B)", "A' + B'"],
  ["A", "A"],
  ["(A and not B) or (not A and B) or (A and B)", "A + B"],
];

let failures = 0;
for (const [source, expected] of cases) {
  const { sop, variables, rows } = analyse(source);
  const ok = sop === expected;
  if (!ok) failures++;
  console.log(`${ok ? "ok  " : "FAIL"}  ${source.padEnd(40)} -> ${sop}${ok ? "" : `  (expected ${expected})`}  [${variables.join("")}, ${rows.length} rows]`);
}

// Every simplified expression must agree with the original on every input.
for (const [source] of cases) {
  const original = analyse(source);
  if (original.sop === "0" || original.sop === "1") continue;
  const rebuilt = original.sop.split(" + ").map(t => {
    const literals = t.match(/[A-D]'?/g) || [];
    return "(" + literals.map(l => l.endsWith("'") ? `not ${l[0]}` : l).join(" and ") + ")";
  }).join(" or ");
  const check = analyse(rebuilt);
  const same = check.variables.join("") === original.variables.join("")
    && check.rows.every((row, i) => row.value === original.rows[i].value);
  if (!same) { failures++; console.log(`FAIL  ${source} simplifies to ${original.sop}, which is a different function`); }
  else console.log(`ok    ${source.padEnd(40)} == ${original.sop}`);
}

console.log(failures ? `\n${failures} failing` : "\nAll logic checks passed.");
process.exit(failures ? 1 : 0);
