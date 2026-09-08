import { cp, mkdir, writeFile, readFile, access, readdir, rm, rename } from 'node:fs/promises';
import path from 'node:path';
const source = path.resolve('dist/client');
await access(path.join(source, 'index.html'));
const target = path.resolve('docs');
await mkdir(target, { recursive: true });
// This directory contains only generated GitHub Pages output.
for (const entry of await readdir(target)) await rm(path.join(target, entry), { recursive: true, force: true });
await cp(source, target, { recursive: true, filter: p => !['.vite','.assetsignore','_headers','vinext-client-entry-manifest.json'].includes(path.basename(p)) });
// vinext places assetPrefix into the output tree; Pages already serves docs at
// /futari-othello/, so remove that extra on-disk level.
await rename(path.join(target, 'futari-othello', '_next'), path.join(target, '_next'));
await rm(path.join(target, 'futari-othello'), {recursive: true});
await writeFile(path.join(target, '.nojekyll'), '');
const html = await readFile(path.join(target, 'index.html'), 'utf8');
if (!html.includes('黒の番です') || (html.match(/class="square/g) ?? []).length !== 64) {
  throw new Error('The exported page is missing the initial Othello board.');
}
for (const match of html.matchAll(/(?:src|href)="(\/futari-othello\/[^"]+)"/g)) {
  await access(path.join(target, match[1].replace('/futari-othello/', '')));
}
console.log('GitHub Pages files prepared in docs/');
