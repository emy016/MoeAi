#!/usr/bin/env bash
# Rebuild Youssef's app for the web and install it as /moeai.
#
# Expo hashes the bundle filename, so the old one must go or public/_expo
# accumulates dead megabytes and — worse — moeai-app.html can end up pointing
# at a bundle that is no longer there, which is a white screen with no error.
# The same goes for the app's own assets (fonts under assets/node_modules/,
# images under assets/assets/); public/assets/ also holds the EduMoe pages'
# files, so only those two app folders are cleared, never the whole directory.
set -euo pipefail
cd "$(dirname "$0")/.."
[ -d mobile/node_modules ] || ( cd mobile && npm ci --no-audit --no-fund )
OUT=$(mktemp -d)
( cd mobile && npx expo export --platform web --clear --output-dir "$OUT" )
rm -rf public/_expo public/assets/node_modules public/assets/assets
cp -r "$OUT/_expo" public/
cp -r "$OUT/assets/." public/assets/
cp "$OUT/index.html" public/moeai-app.html
# The app's icon (app.json web.favicon); also the site-wide /favicon.ico.
[ -f "$OUT/favicon.ico" ] && cp "$OUT/favicon.ico" public/favicon.ico
rm -rf "$OUT"
BUNDLE=$(grep -o 'AppEntry-[a-f0-9]*\.js' public/moeai-app.html)
# Open tabs and phones compare this with the bundle they are running and
# reload themselves onto the new build (mobile/App.js, useLatestBuild).
printf '{"bundle":"%s","builtAt":"%s"}\n' "$BUNDLE" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > public/app-version.json
echo "Installed $BUNDLE into public/"
