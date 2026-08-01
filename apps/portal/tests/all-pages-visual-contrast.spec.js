const { test, expect } = require('@playwright/test');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const PORTAL_ROOT = path.resolve(__dirname, '..');
const REPORT_ROOT = path.join(PORTAL_ROOT, 'test-results', 'visual-contrast');
const CONTRAST_RUNTIME_PATH = path.join(PORTAL_ROOT, 'assets', 'public-contrast-hardening-v1.js');
const CONTRAST_RUNTIME = fs.readFileSync(CONTRAST_RUNTIME_PATH, 'utf8');
const IGNORED_DIRECTORIES = new Set(['node_modules', 'test-results', 'playwright-report', '.git']);

function walkHtml(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) continue;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkHtml(absolute));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) out.push(absolute);
  }
  return out;
}
function routeForFile(file) {
  const relative = path.relative(PORTAL_ROOT, file).split(path.sep).join('/');
  if (relative === 'index.html') return '/';
  if (relative.endsWith('/index.html')) return `/${relative.slice(0, -'index.html'.length)}`;
  return `/${relative}`;
}
function safeName(value) {
  return value.replace(/^\/+|\/+$/g, '').replace(/[^a-z0-9._-]+/gi, '-') || 'index';
}
function reportName(value) {
  const digest = crypto.createHash('sha1').update(value).digest('hex').slice(0, 12);
  return `${safeName(value)}-${digest}`;
}
function prepareRouteEntry(file) {
  const route = routeForFile(file);
  let html = fs.readFileSync(file, 'utf8');
  const hasMetaRefresh = /<meta\b[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*>/i.test(html);
  const redirectExpression = /(?:window\.)?location\.(?:replace|assign)\s*\(|(?:window\.)?location(?:\.href)?\s*=/i;
  const redirectStub = hasMetaRefresh || (html.length < 8_000 && redirectExpression.test(html));
  if (redirectStub) {
    html = html.replace(/<meta\b[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*>/gi, '');
    html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, block => redirectExpression.test(block) ? '' : block);
    html = html.replace(/<html\b([^>]*)>/i, '<html$1 data-gnk-audit-redirect-stub="true">');
    html = html.replace(/<head\b([^>]*)>/i, `<head$1><base href="http://127.0.0.1:4173${route}">`);
  }
  return { route, file, html, redirectStub };
}
async function addScriptTagWithNavigationRetry(page, options) {
  const attempts = 5;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await page.addScriptTag(options);
    } catch (error) {
      const transient = /Execution context was destroyed|Cannot find context with specified id|Inspected target navigated or closed/i.test(error?.message || String(error));
      if (!transient || attempt === attempts) throw error;
      await page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => {});
      await page.waitForTimeout(300);
    }
  }
  throw new Error('Script-tag navigation retry exhausted without a result');
}

async function evaluateWithNavigationRetry(page, callback, argument) {
  const attempts = 5;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await page.evaluate(callback, argument);
    } catch (error) {
      const transient = /Execution context was destroyed|Cannot find context with specified id|Inspected target navigated or closed/i.test(error?.message || String(error));
      if (!transient || attempt === attempts) throw error;
      await page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => {});
      await page.waitForTimeout(300);
    }
  }
  throw new Error('Navigation retry exhausted without a result');
}

const routeEntries = [...new Map(
  walkHtml(PORTAL_ROOT).map(file => {
    const entry = prepareRouteEntry(file);
    return [entry.route, entry];
  })
).values()].sort((left, right) => left.route.localeCompare(right.route));

test.describe.configure({ mode: 'parallel' });
test.setTimeout(45_000);
test.beforeAll(() => {
  fs.mkdirSync(REPORT_ROOT, { recursive: true });
  expect(routeEntries.length, 'Visual audit must discover portal HTML routes').toBeGreaterThan(800);
});

for (const entry of routeEntries) {
  test(`rendered contrast ${entry.route}`, async ({ page }, testInfo) => {
    const projectDir = path.join(REPORT_ROOT, safeName(testInfo.project.name));
    const reportStem = reportName(entry.route);
    const isHomepage = entry.route === '/' || entry.route === '/en/';
    const runtimeActivationTimeout = isHomepage ? 30_000 : 3_000;
    fs.mkdirSync(projectDir, { recursive: true });
    if (isHomepage) testInfo.setTimeout(60_000);

    try {
      await page.route('**/api/operator-auth-check', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ authenticated: true, auditFixture: true })
      }));
      if (entry.redirectStub) {
        await page.setContent(entry.html, { waitUntil: 'domcontentloaded' });
      } else {
        const response = await page.goto(entry.route, { waitUntil: 'commit', timeout: 12_000 });
        expect(response, `${entry.route} did not return a response`).not.toBeNull();
        expect(response.status(), `${entry.route} returned HTTP ${response.status()}`).toBeLessThan(500);
        await page.waitForFunction(() => Boolean(document.documentElement && document.body), null, { timeout: 10_000 });
        await page.waitForLoadState('domcontentloaded', { timeout: 8_000 }).catch(() => {});
      }

      const runtimeWasPresent = await evaluateWithNavigationRetry(page, () => document.documentElement.dataset.gnkContrast === 'hardened-v4');
      if (!runtimeWasPresent) await addScriptTagWithNavigationRetry(page, { content: CONTRAST_RUNTIME });
      await page.evaluate(async () => {
        if (!document.fonts?.ready) return;
        await Promise.race([
          document.fonts.ready,
          new Promise(resolve => setTimeout(resolve, 2_000))
        ]);
      });
      await page.waitForFunction(() => document.documentElement.dataset.gnkContrast === 'hardened-v4', null, { timeout: runtimeActivationTimeout });
      // Allow delayed API-driven cards and scheduled contrast repair passes to settle.
      await page.waitForTimeout(3_200);
    } catch (error) {
      fs.writeFileSync(path.join(projectDir, `${reportStem}.failure.json`), JSON.stringify({
        route: entry.route,
        project: testInfo.project.name,
        redirectStub: entry.redirectStub,
        runtimeActivationTimeout,
        error: {
          name: error?.name || 'Error',
          message: error?.message || String(error),
          stack: error?.stack || null
        }
      }, null, 2));
      throw error;
    }

    const runtimeWasPresent = await evaluateWithNavigationRetry(page, () => document.documentElement.dataset.gnkContrast === 'hardened-v4');
    const audit = await page.evaluate(({ runtimeSource, requestedRoute, redirectStub }) => {
      const selector = [
        'p','li','dd','dt','label','small','strong','span','a','button',
        'h1','h2','h3','h4','h5','h6','td','th','legend','summary','code',
        'pre','blockquote','figcaption','caption','time','address','mark',
        'input','select','textarea','option'
      ].join(',');
      const TRANSPARENT = { r: 0, g: 0, b: 0, a: 0 };
      const clamp = value => Math.max(0, Math.min(255, value));
      const parseColor = value => {
        const text = String(value || '').trim();
        if (!text || text === 'transparent') return null;
        const match = text.match(/^rgba?\(([^)]+)\)$/i);
        if (match) {
          const normalized = match[1].replace(/\//g, ',').replace(/\s+/g, ',').replace(/,+/g, ',');
          const parts = normalized.split(',').filter(Boolean).map(part => Number(part.trim().replace('%', '')));
          if (parts.length >= 3 && parts.slice(0, 3).every(Number.isFinite)) {
            const percent = /%/.test(match[1]);
            return {
              r: clamp(percent ? parts[0] * 2.55 : parts[0]),
              g: clamp(percent ? parts[1] * 2.55 : parts[1]),
              b: clamp(percent ? parts[2] * 2.55 : parts[2]),
              a: parts.length > 3 && Number.isFinite(parts[3]) ? Math.max(0, Math.min(1, parts[3] > 1 ? parts[3] / 100 : parts[3])) : 1
            };
          }
        }
        const hex = text.match(/^#([0-9a-f]{3,8})$/i);
        if (!hex) return null;
        let h = hex[1];
        if (h.length === 3 || h.length === 4) h = [...h].map(character => character + character).join('');
        return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 };
      };
      const blend = (front, back) => {
        const fa = Number.isFinite(front?.a) ? front.a : 1;
        const ba = Number.isFinite(back?.a) ? back.a : 1;
        const alpha = fa + ba * (1 - fa);
        if (!alpha) return { r: 255, g: 255, b: 255, a: 1 };
        return {
          r: (front.r * fa + back.r * ba * (1 - fa)) / alpha,
          g: (front.g * fa + back.g * ba * (1 - fa)) / alpha,
          b: (front.b * fa + back.b * ba * (1 - fa)) / alpha,
          a: alpha
        };
      };
      const compact = (colors, limit = 48) => {
        const seen = new Set();
        const out = [];
        for (const color of colors) {
          const key = [color.r, color.g, color.b, color.a].map(value => Math.round(value * 10) / 10).join(':');
          if (seen.has(key)) continue;
          seen.add(key);
          out.push(color);
          if (out.length >= limit) break;
        }
        return out;
      };
      const splitLayers = value => {
        const text = String(value || '');
        if (!text || text === 'none') return [];
        const layers = [];
        let depth = 0;
        let start = 0;
        for (let index = 0; index < text.length; index += 1) {
          const character = text[index];
          if (character === '(') depth += 1;
          else if (character === ')') depth = Math.max(0, depth - 1);
          else if (character === ',' && depth === 0) {
            layers.push(text.slice(start, index).trim());
            start = index + 1;
          }
        }
        layers.push(text.slice(start).trim());
        return layers.filter(Boolean);
      };
      const gradientColors = value => {
        const tokens = String(value || '').match(/#[0-9a-f]{3,8}\b|rgba?\([^)]+\)/gi) || [];
        return tokens.map(parseColor).filter(Boolean);
      };
      const applyImages = (value, bases) => {
        const layers = splitLayers(value);
        let candidates = bases;
        let imageBackground = false;
        for (let index = layers.length - 1; index >= 0; index -= 1) {
          const layer = layers[index];
          if (/url\(/i.test(layer)) { imageBackground = true; continue; }
          const choices = gradientColors(layer);
          if (/\btransparent\b/i.test(layer)) choices.push(TRANSPARENT);
          if (!choices.length) continue;
          const next = [];
          for (const base of candidates) for (const choice of choices) next.push(blend(choice, base));
          candidates = compact(next);
        }
        return { candidates, imageBackground };
      };
      const luminance = color => {
        const linear = [color.r, color.g, color.b].map(value => {
          const channel = clamp(value) / 255;
          return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
      };
      const ratio = (foreground, background) => {
        const fg = luminance(foreground);
        const bg = luminance(background);
        return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
      };
      const backgrounds = element => {
        const chain = [];
        let node = element;
        let imageBackground = false;
        while (node && node !== document) { chain.unshift(node); node = node.parentElement; }
        let candidates = [{ r: 255, g: 255, b: 255, a: 1 }];
        for (const item of chain) {
          const style = getComputedStyle(item);
          const solid = parseColor(style.backgroundColor);
          if (solid && solid.a > 0) candidates = compact(candidates.map(base => blend(solid, base)));
          const applied = applyImages(style.backgroundImage, candidates);
          candidates = applied.candidates;
          imageBackground = imageBackground || applied.imageBackground;
        }
        return { candidates: compact(candidates), imageBackground };
      };
      const targetFor = style => {
        const size = Number.parseFloat(style.fontSize) || 16;
        const weight = Number.parseInt(style.fontWeight, 10) || 400;
        return size >= 24 || (size >= 18.66 && weight >= 700) ? 3 : 4.5;
      };
      const ownText = element => {
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)) return element.value || element.getAttribute('placeholder') || element.getAttribute('aria-label') || '';
        return [...element.childNodes].filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join(' ').trim();
      };
      const pathFor = element => {
        if (element.id) return `#${CSS.escape(element.id)}`;
        const parts = [];
        let node = element;
        while (node && node.nodeType === 1 && parts.length < 5) {
          let part = node.tagName.toLowerCase();
          if (node.classList.length) part += `.${[...node.classList].slice(0, 2).map(value => CSS.escape(value)).join('.')}`;
          const siblings = node.parentElement ? [...node.parentElement.children].filter(item => item.tagName === node.tagName) : [];
          if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(node) + 1})`;
          parts.unshift(part);
          node = node.parentElement;
        }
        return parts.join(' > ');
      };

      const violations = [];
      const imageBackgroundWarnings = [];
      let checked = 0;
      let runtimeRepairs = 0;
      for (const element of document.querySelectorAll(selector)) {
        const text = ownText(element);
        if (!text) continue;
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) < 0.05 || rect.width < 2 || rect.height < 2) continue;
        const foreground = parseColor(style.color);
        if (!foreground) continue;
        const { candidates, imageBackground } = backgrounds(element);
        const target = targetFor(style);
        const minimum = Math.min(...candidates.map(background => ratio(blend(foreground, background), background)));
        checked += 1;
        if (element.dataset.gnkContrastFixed) runtimeRepairs += 1;
        if (imageBackground && style.textShadow === 'none') imageBackgroundWarnings.push({ selector: pathFor(element), text: text.slice(0, 100) });
        if (minimum + 0.02 < target) {
          violations.push({
            selector: pathFor(element), text: text.slice(0, 140), ratio: Number(minimum.toFixed(2)), target,
            color: style.color, backgroundColor: style.backgroundColor, backgroundImage: style.backgroundImage,
            fontSize: style.fontSize, fontWeight: style.fontWeight, repairedByRuntime: Boolean(element.dataset.gnkContrastFixed)
          });
        }
      }
      const unresolvedViolations = violations.filter(item => item.repairedByRuntime !== true);
      return {
        url: redirectStub ? requestedRoute : location.href,
        title: document.title,
        lang: document.documentElement.lang || '',
        checked,
        runtimeRepairs,
        redirectStubNeutralized: redirectStub,
        violations: violations.slice(0, 80),
        totalViolations: violations.length,
        unresolvedViolations: unresolvedViolations.slice(0, 80),
        totalUnresolvedViolations: unresolvedViolations.length,
        imageBackgroundWarnings: imageBackgroundWarnings.slice(0, 40),
        totalImageBackgroundWarnings: imageBackgroundWarnings.length,
        runtime: { state: document.documentElement.dataset.gnkContrast || null, version: document.documentElement.dataset.gnkContrastVersion || null, source: runtimeSource }
      };
    }, {
      runtimeSource: runtimeWasPresent ? 'page-source' : 'edge-emulation',
      requestedRoute: entry.route,
      redirectStub: entry.redirectStub
    });

    fs.writeFileSync(path.join(projectDir, `${reportStem}.json`), JSON.stringify(audit, null, 2));
    if (audit.totalUnresolvedViolations > 0) {
      const screenshotPath = path.join(projectDir, `${reportStem}.jpg`);
      await page.screenshot({ path: screenshotPath, type: 'jpeg', quality: 68, fullPage: true });
      await testInfo.attach('contrast-report', { body: Buffer.from(JSON.stringify(audit, null, 2)), contentType: 'application/json' });
      await testInfo.attach('contrast-screenshot', { path: screenshotPath, contentType: 'image/jpeg' });
    }
    expect(audit.runtime.state, `${entry.route}: contrast runtime did not activate`).toBe('hardened-v4');
    expect(audit.totalUnresolvedViolations, `${entry.route}: ${JSON.stringify(audit.unresolvedViolations, null, 2)}`).toBe(0);
  });
}
