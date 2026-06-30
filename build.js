import { cpSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dist = resolve(__dirname, 'dist');

mkdirSync(dist, { recursive: true });

const toCopy = [
  'index.html',
  'case-study.html',
  'contact-us.html',
  'o.html',
  'our-partners.html',
  'our-partners-list.html',
  'our-team.html',
  'our-works.html',
  'case-study',
  'es',
];

for (const item of toCopy) {
  cpSync(resolve(__dirname, item), resolve(dist, item), { recursive: true });
}
