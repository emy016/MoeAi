/**
 * /moeai points at a bundle that exists.
 *
 * Expo hashes the bundle filename on every export. If the page is copied
 * without the bundle — or the bundle without the page — the result is a white
 * screen and a 404 in the console, with nothing in the build to warn you.
 *
 * The bundle then loads its own files — fonts, flag images — by absolute
 * /assets/... path. Those went missing once without anyone noticing (the fonts
 * sat under assets/node_modules/, which .gitignore excluded) and the app quietly
 * rendered in a fallback font, so every one of them is checked too.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const page = "public/moeai-app.html";
if (!existsSync(page)) { console.log(`MISSING  ${page} — /moeai has nothing to serve`); process.exit(1); }

const html = readFileSync(page, "utf8");
const refs = [...html.matchAll(/(?:src|href)="(\/[^"]+)"/g)].map(m => m[1]);
for (const bundle of refs.filter(ref => ref.endsWith(".js") && existsSync(join("public", ref)))) {
  const code = readFileSync(join("public", bundle), "utf8");
  refs.push(...new Set([...code.matchAll(/"(\/assets\/[^"?#]+\.[a-z0-9]+)"/gi)].map(m => m[1])));
}
const broken = refs.filter(ref => !existsSync(join("public", ref)));

for (const ref of broken) console.log(`BROKEN   ${ref} — referenced by ${page}, not in public/`);
console.log(broken.length
  ? `${broken.length} asset${broken.length > 1 ? "s" : ""} the app page needs are missing`
  : `The app page and all ${refs.length} of its assets are present.`);
process.exit(broken.length ? 1 : 0);
