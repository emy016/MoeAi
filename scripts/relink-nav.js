/**
 * Point dead navigation links at the pages that exist.
 *
 * The EduMoe pages were written as standalone files, so every nav item fires a
 * "coming soon" toast — including links to pages that have since been built.
 * This rewrites only those, and only when the anchor is a placeholder
 * (href="#"). Toasts for features that genuinely do not exist yet — the
 * compiler, flashcards, captions, individual subjects — are left alone.
 *
 * Run: node scripts/relink-nav.js        (add --dry to preview)
 */
const fs = require("fs");
const path = require("path");

const PUBLIC = path.join(__dirname, "..", "public");
const DRY = process.argv.includes("--dry");

// Only pages that actually exist in public/ or as a Next route.
const TARGETS = [
  [/Courses\s+(?:page\s+)?coming soon/i, "/courses"],
  [/Simulators\s+(?:page\s+)?coming soon/i, "/simulators"],
  [/(?:Quizzes|Practice)\s+(?:page\s+)?coming soon/i, "/quizzes"],
  [/Ranked\s+(?:page\s+)?coming soon/i, "/ranked"],
  [/MoeAI\s+(?:page\s+)?(?:is\s+)?coming soon/i, "/moeai"],
  [/About\s+coming soon/i, "/about"],
  [/Admin panel coming soon/i, "/admin"],
];

// An <a> that is a placeholder AND whose click handler is only a toast.
const ANCHOR = /<a\b[^>]*href="#"[^>]*onclick="showToast\('([^']*)'\)"[^>]*>/gi;

let totalChanged = 0;

for (const file of fs.readdirSync(PUBLIC).filter((f) => f.endsWith(".html"))) {
  const full = path.join(PUBLIC, file);
  const before = fs.readFileSync(full, "utf8");
  const changes = [];

  const after = before.replace(ANCHOR, (tag, toast) => {
    for (const [pattern, href] of TARGETS) {
      if (pattern.test(toast)) {
        changes.push(`${toast} -> ${href}`);
        return tag
          .replace('href="#"', `href="${href}"`)
          .replace(/\sonclick="showToast\('[^']*'\)"/, "");
      }
    }
    return tag;
  });

  if (changes.length) {
    totalChanged += changes.length;
    console.log(`${file}:`);
    for (const change of changes) console.log(`  ${change}`);
    if (!DRY) fs.writeFileSync(full, after);
  }
}

console.log(`\n${totalChanged} link${totalChanged === 1 ? "" : "s"} ${DRY ? "would be " : ""}rewired.`);
