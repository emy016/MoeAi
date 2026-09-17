/**
 * Regenerate supabase/seed-lessons.sql from the courses page's own data.
 *
 * The lecture list lives in public/legacy/courses.js because that is the file
 * the page renders from. Rather than maintaining a second copy by hand, this
 * reads that array and emits the SQL that mirrors it into the `lessons` table,
 * which is what MoeAI retrieves from.
 *
 * Run after editing the course list:  node scripts/extract-lessons.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

// The page's course ids are short slugs; the database uses faculty course codes.
const CODE = { sp: "CS102", ld: "CS103", de: "MA103", pr: "MA104",
               ca: "MA101", ph: "PH101", dm: "MA102", cf: "CS101" };

function readCourses() {
  const src = fs.readFileSync(path.join(ROOT, "public/legacy/courses.js"), "utf8");
  const start = src.indexOf("const COURSES = [");
  if (start === -1) throw new Error("COURSES array not found in courses.js");

  const body = src.slice(start);
  let depth = 0, end = -1;
  for (let i = body.indexOf("["); i < body.length; i++) {
    if (body[i] === "[") depth++;
    else if (body[i] === "]" && --depth === 0) { end = i + 1; break; }
  }
  if (end === -1) throw new Error("COURSES array is unterminated");

  // A data literal from a file in this repository, not user input.
  return eval(body.slice(body.indexOf("["), end));
}

const esc = (s) => String(s ?? "").replace(/'/g, "''");

const rows = [];
let unmapped = [];
for (const course of readCourses()) {
  const code = CODE[course.id];
  if (!code) { unmapped.push(course.id); continue; }
  let idx = 0;
  for (const unit of course.units ?? []) {
    for (const lecture of unit.lectures ?? []) {
      rows.push(`('${esc(code)}','${esc(lecture.title)}','${esc(unit.title)}','${esc(lecture.dur)}',${idx++})`);
    }
  }
}
if (unmapped.length) {
  console.error("No course code mapped for:", unmapped.join(", "));
  process.exit(1);
}

const sql = [
  "-- Lesson seed, generated from the courses page's own COURSES array.",
  "-- Regenerate with: node scripts/extract-lessons.js",
  "-- Idempotent: re-running adds only lectures that are not already there.",
  "",
  "insert into public.lessons (course_id, title, summary, content, duration, order_index)",
  "select c.id, v.title, v.unit, v.unit || chr(46) || chr(32) || v.title, v.dur, v.idx",
  "from (values",
  rows.join(",\n"),
  ") as v(code,title,unit,dur,idx)",
  "join public.courses c on c.code = v.code",
  "where not exists (select 1 from public.lessons l where l.course_id = c.id and l.title = v.title);",
  "",
].join("\n");

fs.writeFileSync(path.join(ROOT, "supabase/seed-lessons.sql"), sql);
console.log(`wrote supabase/seed-lessons.sql — ${rows.length} lectures`);
