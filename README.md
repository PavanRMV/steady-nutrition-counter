# Steady Nutrition Counter

An installable, offline-first nutrition and body-weight tracker built with plain HTML, CSS, and JavaScript. Defaults: **2650 kcal, 110 g protein, 35 g fibre**.

## Live app

<https://pavanrmv.github.io/steady-nutrition-counter/>

## Run

```bash
python -m http.server 8000
```

Open <http://localhost:8000>. Use the **Install app** button when the browser exposes installation, or the browser's Add to Home Screen command. Service workers require HTTP(S), not `file://`. All URLs are relative, so deployment under a GitHub Pages subpath is supported.

## Test

```bash
npm test
npm run verify
node --check app.js
node --check catalog.js
node --check service-worker.js
```

No dependencies are required. `npm test` uses Node's built-in test runner. The static verifier checks the manifest, icon files, service-worker references/cache version, relative install metadata, and required UI hooks.

## Food data and accuracy

The built-in offline catalog contains common whole foods and explicit fish species/preparations. Its values are **estimates based on typical USDA FoodData Central reference values**, not exact measurements or clinical guidance. Preparation, brand, and portion variation can change nutrients. Manual entry remains available.

Optional packaged-food search uses the public, keyless [Open Food Facts](https://world.openfoodfacts.org/) read API. Results are attributed in the app and normalized from the product's per-serving values where available, otherwise per 100 g. Open Food Facts is community-contributed and may be missing or inaccurate; check the package label.

## Privacy and storage

- Entries, targets, and weight stay in this browser's `localStorage` (`steady-gain-nutrition-v1`). There is no account, backend, analytics, or sync.
- Optional online packaged-food search sends the search query to Open Food Facts. Like any web request, it also exposes normal request metadata to that service, such as your IP address, browser/User-Agent, and Origin or Referer headers where sent. Built-in search, logging, calculations, and manual entry stay local and work offline.
- JSON export/import supports backups. Existing version-1 entries remain compatible; newer catalog entries add optional `foodId`, `source`, `unit`, and `quantity` fields.
- Clearing browser storage deletes local data. Export a backup periodically.

This tracker is informational and not medical advice. Consult a qualified clinician or dietitian for medical needs.
