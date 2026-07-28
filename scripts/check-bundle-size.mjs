#!/usr/bin/env node
// Bundle-size budget gate. Runs AFTER `npm run build`, reads the emitted JS in
// `dist/assets`, gzips each file, and fails (exit 1) if a budget is breached.
// Zero runtime deps — uses node:zlib. Diagnose a breach with `ANALYZE=1 npm run build`
// (emits dist/stats.html treemap via rollup-plugin-visualizer).
//
// Budgets are gzipped KB. The initial chunk is what the browser pays on first paint;
// the heavy verticals (recharts on dashboard/reports, leaflet on locations) are
// `React.lazy`-split, so they get their own, looser per-async-chunk budget.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const ASSETS_DIR = join(process.cwd(), 'dist', 'assets');

// Tune these as the app grows — a breach should be a deliberate decision, not a surprise.
const BUDGETS = {
  // The entry chunk + its synchronous imports (everything before the first lazy boundary).
  initialJs: 260,
  // Any single lazily-loaded route/vendor chunk.
  asyncChunk: 380,
  // Total JS shipped across all chunks.
  totalJs: 1200,
};

const gzipKb = (buf) => Math.round((gzipSync(buf).length / 1024) * 10) / 10;

let files;
try {
  files = readdirSync(ASSETS_DIR).filter((f) => f.endsWith('.js'));
} catch {
  console.error(`✗ bundle-size: ${ASSETS_DIR} not found — run \`npm run build\` first.`);
  process.exit(1);
}

const chunks = files
  .map((name) => {
    const buf = readFileSync(join(ASSETS_DIR, name));
    return { name, raw: statSync(join(ASSETS_DIR, name)).size, gz: gzipKb(buf) };
  })
  .sort((a, b) => b.gz - a.gz);

// Vite names the entry chunk `index-<hash>.js`; treat it as the initial chunk.
const entry = chunks.find((c) => /(^|\/)index-[^/]+\.js$/.test(c.name)) ?? chunks[0];
const totalGz = Math.round(chunks.reduce((s, c) => s + c.gz, 0) * 10) / 10;

const breaches = [];
if (entry && entry.gz > BUDGETS.initialJs)
  breaches.push(`initial chunk ${entry.name} = ${entry.gz}KB gz > ${BUDGETS.initialJs}KB budget`);
for (const c of chunks) {
  if (c === entry) continue;
  if (c.gz > BUDGETS.asyncChunk)
    breaches.push(`async chunk ${c.name} = ${c.gz}KB gz > ${BUDGETS.asyncChunk}KB budget`);
}
if (totalGz > BUDGETS.totalJs)
  breaches.push(`total JS = ${totalGz}KB gz > ${BUDGETS.totalJs}KB budget`);

console.log('Bundle report (gzipped):');
for (const c of chunks.slice(0, 12)) {
  const tag = c === entry ? ' [entry]' : '';
  console.log(`  ${c.gz.toString().padStart(7)}KB  ${c.name}${tag}`);
}
console.log(`  ${'—'.repeat(9)}`);
console.log(`  ${totalGz.toString().padStart(7)}KB  total (${chunks.length} chunks)`);

if (breaches.length) {
  console.error('\n✗ bundle-size budget breached:');
  for (const b of breaches) console.error(`  - ${b}`);
  console.error('\nDiagnose with: ANALYZE=1 npm run build  → open dist/stats.html');
  process.exit(1);
}
console.log('\n✓ bundle-size: all budgets OK.');
