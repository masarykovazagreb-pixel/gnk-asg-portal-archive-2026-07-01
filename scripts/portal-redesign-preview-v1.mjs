import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyPortalVisualRedesign } from '../workers/gnk-asg-direct-operator/src/sitewide-visual-redesign-v1.js';

const portalRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../apps/portal');
const host = '0.0.0.0';
const port = Number(process.env.PORT || 4173);
const MIME = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'],
  ['.ico', 'image/x-icon'],
  ['.xml', 'application/xml; charset=utf-8'],
  ['.webmanifest', 'application/manifest+json; charset=utf-8'],
  ['.pdf', 'application/pdf'],
  ['.woff2', 'font/woff2'],
  ['.mp4', 'video/mp4'],
  ['.mp3', 'audio/mpeg']
]);

function workerScripts(html) {
  let suiteInserted = false;
  html = html.replace(/<script\b[^>]*digital-workforce-suite-v1\.js[^>]*>\s*<\/script>/gi, () => {
    if (suiteInserted) return '';
    suiteInserted = true;
    return '<script defer src="/assets/digital-workforce-suite-v1.js?v=20261012-runtime-health-status-v1"></script>';
  });
  html = html.replace(/<script\b[^>]*public-unified-menu-v6\.js[^>]*>\s*<\/script>/gi, '');
  html = html.replace(/<script\b[^>]*public-digital-workforce-menu-v1\.js[^>]*>\s*<\/script>/gi, '');
  const scripts = [
    ['/assets/public-unified-menu-v6.js?v=20261012-radio-panel-polish-v2-bank-nav-v1', 'public-unified-menu-v6.js'],
    ['/assets/public-contrast-hardening-v1.js?v=20260721-transparency42-v2', 'public-contrast-hardening-v1.js'],
    ['/assets/public-digital-workforce-menu-v1.js?v=20261012-language-routes-v1', 'public-digital-workforce-menu-v1.js']
  ];
  for (const [src, needle] of scripts) {
    if (html.includes(needle)) continue;
    const tag = `<script defer src="${src}"></script>`;
    html = /<\/body\s*>/i.test(html) ? html.replace(/<\/body\s*>/i, `${tag}</body>`) : `${html}${tag}`;
  }
  return html;
}

function notFound(response, message = 'Not found') {
  response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
  response.end(message);
}

const server = http.createServer((request, response) => {
  if (!['GET', 'HEAD'].includes(request.method || 'GET')) {
    response.writeHead(405, { allow: 'GET, HEAD', 'content-type': 'text/plain; charset=utf-8' });
    response.end('Preview server is read-only.');
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url || '/', 'http://preview.local').pathname);
  } catch {
    notFound(response, 'Invalid path');
    return;
  }

  if (pathname.split('/').includes('..')) {
    notFound(response, 'Invalid path');
    return;
  }

  if (pathname.startsWith('/api/')) {
    response.writeHead(503, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    response.end(JSON.stringify({ ok: false, error: 'Preview mode does not connect to the production backend.' }));
    return;
  }

  const base = path.resolve(portalRoot, `.${pathname}`);
  if (base !== portalRoot && !base.startsWith(`${portalRoot}${path.sep}`)) {
    notFound(response, 'Invalid path');
    return;
  }

  const candidates = [];
  if (path.extname(base)) candidates.push(base);
  else candidates.push(path.join(base, 'index.html'), `${base}.html`);
  let file = candidates.find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  if (!file && pathname === '/') file = path.join(portalRoot, 'index.html');
  if (!file) {
    notFound(response);
    return;
  }

  const contentType = MIME.get(path.extname(file).toLowerCase()) || 'application/octet-stream';
  const headers = {
    'content-type': contentType,
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'x-gnk-visual-preview': 'sitewide-visual-redesign-v1'
  };

  if (contentType.startsWith('text/html')) {
    try {
      let html = fs.readFileSync(file, 'utf8');
      html = applyPortalVisualRedesign(html, pathname);
      html = workerScripts(html);
      const body = request.method === 'HEAD' ? null : html;
      response.writeHead(200, { ...headers, 'content-length': Buffer.byteLength(html) });
      response.end(body);
    } catch {
      response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
      response.end('Unable to render the local visual preview.');
    }
    return;
  }

  try {
    const stat = fs.statSync(file);
    response.writeHead(200, { ...headers, 'content-length': stat.size });
    if (request.method === 'HEAD') response.end();
    else fs.createReadStream(file).pipe(response);
  } catch {
    notFound(response);
  }
});

server.listen(port, host, () => {
  console.log(`GNK ASG visual preview ready on http://${host}:${port}`);
  console.log('Static content only: no live APIs, mail, publishing, or production state are connected.');
});
