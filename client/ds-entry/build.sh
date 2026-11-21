#!/bin/sh
# Builds ds-dist/ (library bundle + types + css) for design-sync. Run from client/.
set -e
npx vite build -c ds-entry/vite.config.ts
npx tsc -p ds-entry/tsconfig.json
sed -i 's#"~/#"../app/#' ds-dist/types/ds-entry/index.d.ts
echo 'export * from "./types/ds-entry/index";' > ds-dist/index.d.ts
npx tailwindcss -c ds-entry/tailwind.ds.config.ts -i app/tailwind.css -o ds-dist/style.css
echo '{"name":"lokdarpan-ui","version":"1.0.0","module":"index.es.js","types":"index.d.ts"}' > ds-dist/package.json
