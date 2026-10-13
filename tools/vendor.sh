#!/bin/sh
# Copies the browser builds of GSAP and Lenis into site/ so nothing loads from a CDN.
set -e
cd "$(dirname "$0")/.."
mkdir -p site/js/vendor site/css
cp node_modules/gsap/dist/gsap.min.js site/js/vendor/gsap.min.js
cp node_modules/gsap/dist/ScrollTrigger.min.js site/js/vendor/ScrollTrigger.min.js
cp node_modules/lenis/dist/lenis.min.js site/js/vendor/lenis.min.js
cp node_modules/lenis/dist/lenis.css site/css/lenis.css
echo "vendored gsap $(node -p "require('./node_modules/gsap/package.json').version"), lenis $(node -p "require('./node_modules/lenis/package.json').version")"
