import { chromium } from 'playwright-core'; import { CHROME, CHROME_ARGS } from './chrome.mjs'; import { startServer } from './server.mjs';
export function args(argv = process.argv.slice(3)) { const o = {}; for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith('--')) { const k = argv[i].slice(2); const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true; o[k] = v; } } return o; }
export async function openPage({ only, sheet, dpr = 1, nograin = false, stamp = false, browser, server } = {}) {
  const ownBrowser = !browser; browser = browser || (await chromium.launch({ executablePath: CHROME, args: CHROME_ARGS, headless: true }));
  const ownServer = !server; server = server || (await startServer());
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors = []; page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); }); page.on('requestfailed', (r) => errors.push('REQFAIL ' + r.url())); page.on('response', (r) => { if (r.status() >= 400) errors.push('HTTP ' + r.status() + ' ' + r.url()); });
  const q = new URLSearchParams({ capture: '1', dpr: String(dpr) }); if (only) q.set('only', only); if (sheet) q.set('sheet', sheet); if (nograin) q.set('nograin', '1'); if (stamp) q.set('stamp', '1');
  await page.goto(`${server.url}/index.html?${q}`);
  try { await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 60000 }); } catch (e) { throw new Error('page not ready: ' + errors.join(' | ')); }
  const err = await page.evaluate(() => window.__error); if (err) throw new Error(err);
  const close = async () => { await page.close(); if (ownBrowser) await browser.close(); if (ownServer) server.srv.close(); };
  return { page, browser, server, errors, close };
}
export async function launch() { return chromium.launch({ executablePath: CHROME, args: CHROME_ARGS, headless: true }); }
