import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
for (const asset of ['styles.css','app.js','catalog.js','manifest.webmanifest','service-worker.js','icons/icon-192.png','icons/icon-512.png']) {
  if (!existsSync(resolve(root, asset))) throw new Error(`Missing asset: ${asset}`);
}
for (const ref of ['styles.css','app.js','manifest.webmanifest','apple-touch-icon','theme-color']) if (!html.includes(ref)) throw new Error(`index.html missing ${ref}`);
for (const id of ['log-date','entry-form','entries','history','target-form','weight','export-data','import-data','clear-day','food-search','quantity','quantity-minus','quantity-plus','nutrient-preview','online-search','online-status','install-app','storage-warning','storage-warning-text','download-raw-data','discard-raw-data']) if (!html.includes(`id="${id}"`)) throw new Error(`Missing required element #${id}`);
const manifest = JSON.parse(readFileSync(resolve(root, 'manifest.webmanifest'), 'utf8'));
if (manifest.display !== 'standalone' || !String(manifest.start_url).startsWith('./')) throw new Error('Manifest must be standalone and subpath-safe.');
for (const size of ['192x192','512x512']) if (!manifest.icons?.some(icon => icon.sizes === size && !icon.src.startsWith('/'))) throw new Error(`Manifest missing ${size} relative icon.`);
for (const icon of ['icons/icon-192.png','icons/icon-512.png']) if (statSync(resolve(root, icon)).size < 100) throw new Error(`Icon invalid: ${icon}`);
const sw = readFileSync(resolve(root, 'service-worker.js'), 'utf8');
const styles = readFileSync(resolve(root, 'styles.css'), 'utf8');
if (/https?:\/\//i.test(styles)) throw new Error('Stylesheet must not load undeclared third-party assets.');
for (const asset of ['./','./index.html','./styles.css','./app.js','./catalog.js','./manifest.webmanifest']) if (!sw.includes(asset)) throw new Error(`Service worker cache missing ${asset}`);
if (!/CACHE_NAME\s*=\s*['"][^'"]+-v\d+/.test(sw)) throw new Error('Service worker needs a versioned cache.');
if (!html.startsWith('<!doctype html>')) throw new Error('Missing HTML doctype');
console.log('Static verification passed: installable PWA references, icons, versioned service worker cache, and UI hooks are present.');
