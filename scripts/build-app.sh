#!/usr/bin/env bash
# Rebuild Youssef's app for the web and install it as /moeai.
#
# Expo hashes the bundle filename, so the old one must go or public/_expo
# accumulates dead megabytes and — worse — moeai-app.html can end up pointing
# at a bundle that is no longer there, which is a white screen with no error.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=$(mktemp -d)
( cd mobile && npx expo export --platform web --output-dir "$OUT" )
rm -rf public/_expo
cp -r "$OUT/_expo" public/
cp -r "$OUT/assets/." public/assets/
cp "$OUT/index.html" public/moeai-app.html
rm -rf "$OUT"
echo "Installed $(grep -o 'AppEntry-[a-f0-9]*\.js' public/moeai-app.html) into public/"
