import { cp, mkdir, writeFile, access, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
const source = path.resolve('dist/client');
await access(path.join(source, 'index.html'));
const target = path.resolve('docs');
await mkdir(target, { recursive: true });
// This directory contains only generated GitHub Pages output.
for (const entry of await readdir(target)) await rm(path.join(target, entry), { recursive: true, force: true });
await cp(source, target, { recursive: true, filter: p => !['.vite','.assetsignore','_headers','vinext-client-entry-manifest.json'].includes(path.basename(p)) });
await writeFile(path.join(target, '.nojekyll'), '');
console.log('GitHub Pages files prepared in docs/');
