/**
 * Pre-commit UI audit — the "agent gate" engine.
 *
 * Drives the REAL running app (or a Storybook story) across the DESIGN_SYSTEM
 * breakpoints and, WITHOUT any baseline, flags the shift/mobile/UI-break class
 * that behaviour + a11y tests miss, then saves a screenshot per breakpoint for a
 * human/agent to eyeball. Meant to run BEFORE commit so problems are caught while
 * the work is fresh, not after.
 *
 * Usage:
 *   node scripts/ui-audit.mjs --route /listings
 *   node scripts/ui-audit.mjs --route / --base http://localhost:5173   # reuse a running dev server
 *   node scripts/ui-audit.mjs --story test-visualharness--default --base http://localhost:6006
 *
 * Exit code is non-zero when a HARD finding (horizontal overflow, off-screen
 * element, console error) is found, so a hook/CI can block on it.
 */
import { createRequire } from 'module';
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import net from 'node:net';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

// --- args -----------------------------------------------------------------
const argv = process.argv.slice(2);
const arg = (name, def = undefined) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
};
const route = arg('route'); // single path, or comma-separated list
const manifest = arg('manifest'); // JSON file: array of paths
const useNav = argv.includes('--nav'); // derive routes dynamically from the nav schema
const navFile = arg('nav-file', 'src/config/nav-schema.ts');
const story = arg('story');
let base = arg('base');
const outDir = arg('out', '.ui-audit');
const email = arg('email', 'moderator@arsam.net');
const password = arg('password', 'arsam1234');

/**
 * DYNAMIC route discovery — the single nav schema (`src/config/nav-schema.ts`)
 * drives the whole app, so every reachable page is a `to: '/...'` literal there.
 * Extracting them means a NEW page added to the nav is audited automatically, with
 * no manifest to maintain. Param routes (`/x/:id`) are skipped — they need data.
 */
function routesFromNav(file) {
  const src = readFileSync(file, 'utf8');
  const set = new Set();
  for (const m of src.matchAll(/to:\s*['"]([^'"]+)['"]/g)) {
    const p = m[1];
    if (p.startsWith('/') && !p.includes(':')) set.add(p);
  }
  return [...set].sort();
}

// Resolve the route list. Precedence: explicit manifest > --nav (dynamic) >
// comma-separated --route.
const routes = manifest
  ? JSON.parse(readFileSync(manifest, 'utf8'))
  : useNav
    ? routesFromNav(navFile)
    : route
      ? route.split(',').map((r) => r.trim()).filter(Boolean)
      : [];

if (!routes.length && !story) {
  console.error('Usage: --nav | --route <path[,path...]> | --manifest <file.json> | --story <id> [--base <url>]');
  process.exit(2);
}
if (useNav) console.log(`Discovered ${routes.length} routes from ${navFile}`);

// DESIGN_SYSTEM viewports (theme.css @theme --breakpoint-*), weighted at the
// xl(1024) shell/table convergence. Keep in sync with src/test/breakpoints.ts.
const VIEWPORTS = [
  { name: 'xs-320', width: 320, height: 900 },
  { name: 'lg-768', width: 768, height: 900 },
  { name: 'xl-minus-1-1023', width: 1023, height: 900 },
  { name: 'xl-1024', width: 1024, height: 900 },
  { name: '2xl-1280', width: 1280, height: 900 },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- optional self-booted dev server --------------------------------------
function waitForPort(port, timeoutMs = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const sock = net.connect(port, 'localhost');
      sock.on('connect', () => {
        sock.destroy();
        resolve();
      });
      sock.on('error', () => {
        sock.destroy();
        if (Date.now() - start > timeoutMs) reject(new Error(`port ${port} not up`));
        else setTimeout(tryOnce, 300);
      });
    };
    tryOnce();
  });
}

let devProc = null;
async function ensureBase() {
  if (base) return;
  console.log('Booting dev server…');
  devProc = spawn('npm', ['run', 'dev'], { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] });
  const port = await new Promise((resolve, reject) => {
    let buf = '';
    const to = setTimeout(() => reject(new Error('dev server did not report a URL')), 30000);
    devProc.stdout.on('data', (d) => {
      buf += d.toString();
      const m = buf.match(/http:\/\/localhost:(\d+)\//);
      if (m) {
        clearTimeout(to);
        resolve(Number(m[1]));
      }
    });
    devProc.on('exit', (c) => reject(new Error(`dev server exited (${c})`)));
  });
  await waitForPort(port);
  base = `http://localhost:${port}`;
  console.log(`Dev server ready at ${base}`);
}

// --- deterministic render (mirror of freezeForSnapshot) -------------------
async function freeze(page) {
  await page.addStyleTag({
    content: `*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;
      transition-duration:0s!important;transition-delay:0s!important;scroll-behavior:auto!important}`,
  });
  await page.evaluate(() => (document.fonts?.ready ? document.fonts.ready.then(() => {}) : null));
}

// --- in-page checks (baseline-free) ---------------------------------------
const CHECKS = () => {
  const vw = window.innerWidth;
  const findings = [];
  const desc = (el) =>
    `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${
      el.className && typeof el.className === 'string'
        ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.')
        : ''
    }`;

  // 1) Horizontal overflow of the page itself (mobile bug #1). This is the
  //    reliable hard signal — a page that doesn't overflow is fine even if some
  //    element sits off-canvas by design (a slide-in drawer/dock, a popover).
  const de = document.documentElement;
  const pageOverflows = de.scrollWidth - de.clientWidth > 1;
  if (pageOverflows) {
    findings.push({ level: 'error', check: 'horizontal-overflow', detail: `page scrollWidth ${de.scrollWidth} > viewport ${de.clientWidth}` });

    // 2) Only when the page actually overflows, list the likely culprits (in-flow
    //    elements bleeding past the right edge) to locate it. Skip positioned/
    //    off-canvas elements and anything inside a legit horizontal scroller.
    const inScroller = (el) => {
      let p = el.parentElement;
      while (p && p !== document.body) {
        const o = getComputedStyle(p).overflowX;
        if ((o === 'auto' || o === 'scroll') && p.scrollWidth > p.clientWidth) return true;
        p = p.parentElement;
      }
      return false;
    };
    const offscreen = [];
    for (const el of document.body.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const pos = getComputedStyle(el).position;
      if (pos === 'fixed' || pos === 'absolute') continue; // off-canvas by design
      if (r.right > vw + 1 && !inScroller(el)) offscreen.push(desc(el));
      if (offscreen.length >= 5) break;
    }
    if (offscreen.length) {
      findings.push({ level: 'error', check: 'overflow-culprit', detail: offscreen.join(' | ') });
    }
  }

  // 3) Touch targets < 44px on phone/tablet widths (a11y convention).
  if (vw < 768) {
    const small = [];
    for (const el of document.querySelectorAll('button,a[href],[role="button"],input:not([type="hidden"]),select,textarea')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.width < 44 || r.height < 44) small.push(`${desc(el)} ${Math.round(r.width)}x${Math.round(r.height)}`);
      if (small.length >= 8) break;
    }
    if (small.length) findings.push({ level: 'warn', check: 'touch-target', detail: small.join(' | ') });
  }
  return findings;
};

// --- login (route mode reaches authed pages) ------------------------------
async function login(page) {
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  const emailInput = page.locator('input[name="email"]');
  if ((await emailInput.count()) === 0) return; // already authed / no login form
  await emailInput.fill(email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  await sleep(600);
}

// --- run ------------------------------------------------------------------
const consoleErrors = [];
const report = { base: null, targets: [] };

await ensureBase();
// Screenshots are throwaway REVIEW artifacts, not a record: wipe the output dir
// each run so it only ever holds the current audit and never accumulates. The
// dir is gitignored, so nothing reaches the repo either way.
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
});
page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));

try {
  report.base = base;
  // Story mode audits one Storybook id; route mode audits one or many app paths.
  const targets = story ? [{ label: story, story }] : routes.map((r) => ({ label: r, route: r }));
  if (!story) await login(page); // one login covers every route (shared session)

  let hardFindings = 0;
  for (const t of targets) {
    console.log(`\n═══ ${t.label} ═══`);
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const url = t.story ? `${base}/iframe.html?viewMode=story&id=${t.story}` : `${base}${t.route}`;
      await page.goto(url, { waitUntil: 'networkidle' });
      await freeze(page);
      await sleep(300);

      const findings = await page.evaluate(CHECKS);
      const shot = `${outDir}/${t.label.replace(/[^\w]+/g, '_') || 'root'}-${vp.name}.png`;
      await page.screenshot({ path: shot, fullPage: true });

      hardFindings += findings.filter((f) => f.level === 'error').length;
      report.targets.push({ target: t.label, viewport: vp.name, screenshot: shot, findings });

      console.log(`▶ ${vp.name} (${vp.width}px)  →  ${shot}`);
      if (!findings.length) console.log('   ✓ no layout findings');
      for (const f of findings) console.log(`   ${f.level === 'error' ? '✗' : '⚠'} ${f.check}: ${f.detail}`);
    }
  }

  if (consoleErrors.length) {
    hardFindings += consoleErrors.length;
    console.log(`\n✗ console errors (${consoleErrors.length}):`);
    for (const e of [...new Set(consoleErrors)].slice(0, 10)) console.log(`   ${e}`);
    report.consoleErrors = [...new Set(consoleErrors)];
  }

  writeFileSync(`${outDir}/report.json`, JSON.stringify(report, null, 2));
  console.log(`\nScreenshots + report.json in ${outDir}/`);
  console.log(hardFindings ? `\n✗ ${hardFindings} hard finding(s) — review before commit.` : '\n✓ no hard findings.');
  process.exitCode = hardFindings ? 1 : 0;
} catch (e) {
  console.error('AUDIT ERROR:', e.message);
  process.exitCode = 2;
} finally {
  await browser.close();
  if (devProc) devProc.kill('SIGTERM');
}
