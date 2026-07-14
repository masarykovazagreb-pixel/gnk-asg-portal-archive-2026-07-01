const { test, expect } = require('@playwright/test');
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

const routes = [...new Set(walkHtml(PORTAL_ROOT).map(routeForFile))].sort();

test.describe.configure({ mode: 'parallel' });
test.setTimeout(20_000);

test.beforeAll(() => {
  fs.mkdirSync(REPORT_ROOT, { recursive: true });
  expect(routes.length, 'Visual audit must discover portal HTML routes').toBeGreaterThan(800);
});

for (const route of routes) {
  test(`rendered contrast ${route}`, async ({ page }, testInfo) => {
    const response = await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 12_000 });
    expect(response, `${route} did not return a response`).not.toBeNull();
    expect(response.status(), `${route} returned HTTP ${response.status()}`).toBeLessThan(500);

    const runtimeWasPresent = await page.evaluate(() => document.documentElement.dataset.gnkContrast === 'hardened-v4');
    if (!runtimeWasPresent) await page.addScriptTag({ content: CONTRAST_RUNTIME });

    await page.evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready;
    });
    await page.waitForFunction(
      () => document.documentElement.dataset.gnkContrast === 'hardened-v4',
      null,
      { timeout: 3_000 }
    );
    await page.waitForTimeout(450);

    const audit = await page.evaluate(runtimeSource => {
      const selector = [
        'p','li','dd','dt','label','small','strong','span','a','button',
        'h1','h2','h3','h4','h5','h6','td','th','legend','summary','code',
        'pre','blockquote','figcaption','caption','time','address','mark',
        'input','select','textarea','option'
      ].join(',');

      const clamp = value => Math.max(0, Math.min(255, value));
      const parseColor = value => {
        const text = String(value || '').trim();
        if (!text || text === 'transparent') return null;
        const match = text.match(/^rgba?\(([^)]+)\)$/i);
        if (!match) return null;
        const normalized = match[1].replace(/\//g, ',').replace(/\s+/g, ',').replace(/,+/g, ',');
        const parts = normalized.split(',').filter(Boolean).map(part => Number(part.trim().replace('%', '')));
        if (parts.length < 3 || parts.some((part, index) => index < 3 && !Number.isFinite(part))) return null;
        const percent = /%/.test(match[1]);
        return {
          r: clamp(percent ? parts[0] * 2.55 : parts[0]),
          g: clamp(percent ? parts[1] * 2.55 : parts[1]),
          b: clamp(percent ? parts[2] * 2.55 : parts[2]),
          a: parts.length > 3 && Number.isFinite(parts[3]) ? Math.max(0, Math.min(1, parts[3] > 1 ? parts[3] / 100 : parts[3])) : 1
        };
      };
      const blend = (front, back) => {
        const fa = front?.a ?? 1;
        const ba = back?.a ?? 1;
        const alpha = fa + ba * (1 - fa);
        if (!alpha) return { r: 255, g: 255, b: 255, a: 1 };
        return {
          r: (front.r * fa + back.r * ba * (1 - fa)) / alpha,
          g: (front.g * fa + back.g * ba * (1 - fa)) / alpha,
          b: (front.b * fa + back.b * ba * (1 - fa)) / alpha,
          a: alpha
        };
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
      const gradientColors = value => {
        const tokens = String(value || '').match(/rgba?\([^)]+\)/gi) || [];
        return tokens.map(parseColor).filter(Boolean);
      };
      const backgrounds = element => {
        const chain = [];
        let node = element;
        let imageBackground = false;
        while (node && node !== document) {
          chain.unshift(node);
          node = node.parentElement;
        }
        let candidates = [{ r: 255, g: 255, b: 255, a: 1 }];
        for (const item of chain) {
          const style = getComputedStyle(item);
          const solid = parseColor(style.backgroundColor);
          if (solid && solid.a > 0) candidates = candidates.map(base => blend(solid, base));
          const image = style.backgroundImage;
          if (image && image !== 'none') {
            if (/url\(/i.test(image)) imageBackground = true;
            const stops = gradientColors(image);
            if (stops.length) {
              const next = [];
              for (const base of candidates) for (const stop of stops) next.push(blend(stop, base));
              candidates = next.slice(0, 24);
            }
          }
        }
        return { candidates, imageBackground };
      };
      const targetFor = style => {
        const size = Number.parseFloat(style.fontSize) || 16;
        const weight = Number.parseInt(style.fontWeight, 10) || 400;
        return size >= 24 || (size >= 18.66 && weight >= 700) ? 3 : 4.5;
      };
      const ownText = element => {
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)) {
          return element.value || element.getAttribute('placeholder') || element.getAttribute('aria-label') || '';
        }
        return [...element.childNodes]
          .filter(node => node.nodeType === Node.TEXT_NODE)
          .map(node => node.textContent)
          .join(' ')
          .trim();
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
            selector: pathFor(element),
            text: text.slice(0, 140),
            ratio: Number(minimum.toFixed(2)),
            target,
            color: style.color,
            backgroundColor: style.backgroundColor,
            backgroundImage: style.backgroundImage,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            repairedByRuntime: Boolean(element.dataset.gnkContrastFixed)
          });
        }
      }

      return {
        url: location.href,
        title: document.title,
        lang: document.documentElement.lang || '',
        checked,
        runtimeRepairs,
        violations: violations.slice(0, 80),
        totalViolations: violations.length,
        imageBackgroundWarnings: imageBackgroundWarnings.slice(0, 40),
        totalImageBackgroundWarnings: imageBackgroundWarnings.length,
        runtime: {
          state: document.documentElement.dataset.gnkContrast || null,
          version: document.documentElement.dataset.gnkContrastVersion || null,
          source: runtimeSource
        }
      };
    }, runtimeWasPresent ? 'page-source' : 'edge-emulation');

    const projectDir = path.join(REPORT_ROOT, safeName(testInfo.project.name));
    fs.mkdirSync(projectDir, { recursive: true });
    fs.writeFileSync(path.join(projectDir, `${safeName(route)}.json`), JSON.stringify(audit, null, 2));

    if (audit.totalViolations > 0) {
      const screenshotPath = path.join(projectDir, `${safeName(route)}.jpg`);
      await page.screenshot({ path: screenshotPath, type: 'jpeg', quality: 68, fullPage: true });
      await testInfo.attach('contrast-report', { body: Buffer.from(JSON.stringify(audit, null, 2)), contentType: 'application/json' });
      await testInfo.attach('contrast-screenshot', { path: screenshotPath, contentType: 'image/jpeg' });
    }

    expect(audit.runtime.state, `${route}: contrast runtime did not activate`).toBe('hardened-v4');
    expect(audit.totalViolations, `${route}: ${JSON.stringify(audit.violations, null, 2)}`).toBe(0);
  });
}
