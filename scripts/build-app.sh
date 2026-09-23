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
rm -rf "$OUT"
echo "Installed $(grep -o 'AppEntry-[a-f0-9]*\.js' public/moeai-app.html) into public/"
