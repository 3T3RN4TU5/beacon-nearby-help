// Generates dist/_headers (Netlify / Cloudflare Pages format) from vercel.json, so every host
// serves the same security headers from a single source of truth.
import { readFileSync, writeFileSync } from 'node:fs';

const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));

/** Vercel path patterns → _headers globs (only the forms used in vercel.json). */
const toGlobs = (source) => {
  if (source === '/(.*)') return ['/*'];
  if (source === '/assets/(.*)') return ['/assets/*'];
  const alternation = /^\/\((.+)\)$/.exec(source);
  if (alternation)
    return alternation[1].split('|').map((p) => `/${p.replace('\\.', '.').replace('.*', '*')}`);
  return [source];
};

const blocks = vercel.headers.flatMap(({ source, headers }) =>
  toGlobs(source).map((glob) => [glob, ...headers.map((h) => `  ${h.key}: ${h.value}`)].join('\n')),
);

writeFileSync(new URL('../dist/_headers', import.meta.url), `${blocks.join('\n\n')}\n`);
console.log(`wrote dist/_headers (${blocks.length} rules)`);
