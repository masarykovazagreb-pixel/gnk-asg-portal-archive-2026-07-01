export function extractReadableMailText(raw = '', maximum = 30000) {
  const parsed = parseEntity(String(raw || ''));
  const text = parsed.plain || htmlToText(parsed.html || '') || fallbackBody(raw);
  return normaliseText(text).slice(0, Math.max(1000, maximum));
}

function parseEntity(source) {
  const split = splitHeaders(source);
  const headers = parseHeaders(split.headers);
  const contentType = String(headers['content-type'] || 'text/plain');
  const boundary = contentType.match(/boundary\s*=\s*(?:"([^"]+)"|([^;\s]+))/i)?.slice(1).find(Boolean);

  if (/multipart\//i.test(contentType) && boundary) {
    const result = { plain: '', html: '' };
    for (const part of splitMultipart(split.body, boundary)) {
      const child = parseEntity(part);
      if (!result.plain && child.plain) result.plain = child.plain;
      if (!result.html && child.html) result.html = child.html;
    }
    return result;
  }

  const decoded = decodeBody(split.body, headers['content-transfer-encoding']);
  if (/text\/html/i.test(contentType)) return { plain: '', html: decoded };
  if (/text\/plain/i.test(contentType) || !headers['content-type']) return { plain: decoded, html: '' };
  return { plain: '', html: '' };
}

function splitHeaders(source) {
  const match = source.match(/\r?\n\r?\n/);
  if (!match || match.index == null) return { headers: '', body: source };
  const offset = match.index + match[0].length;
  return { headers: source.slice(0, match.index), body: source.slice(offset) };
}

function parseHeaders(block) {
  const unfolded = String(block || '').replace(/\r?\n[\t ]+/g, ' ');
  const result = {};
  for (const line of unfolded.split(/\r?\n/)) {
    const index = line.indexOf(':');
    if (index <= 0) continue;
    result[line.slice(0, index).trim().toLowerCase()] = line.slice(index + 1).trim();
  }
  return result;
}

function splitMultipart(body, boundary) {
  const marker = `--${boundary}`;
  return String(body || '')
    .split(marker)
    .slice(1)
    .map(part => part.replace(/^\r?\n/, '').replace(/\r?\n--\s*$/, '').trim())
    .filter(Boolean);
}

function decodeBody(body, encoding = '') {
  const mode = String(encoding || '').toLowerCase();
  if (mode.includes('base64')) return decodeBase64(body);
  if (mode.includes('quoted-printable')) return decodeQuotedPrintable(body);
  return String(body || '');
}

function decodeBase64(value) {
  try {
    const binary = atob(String(value || '').replace(/\s+/g, ''));
    const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  } catch {
    return '';
  }
}

function decodeQuotedPrintable(value) {
  const compact = String(value || '').replace(/=\r?\n/g, '');
  const bytes = [];
  for (let index = 0; index < compact.length; index += 1) {
    const hex = compact.slice(index + 1, index + 3);
    if (compact[index] === '=' && /^[0-9A-F]{2}$/i.test(hex)) {
      bytes.push(parseInt(hex, 16));
      index += 2;
    } else {
      bytes.push(compact.charCodeAt(index));
    }
  }
  try {
    return new TextDecoder('utf-8', { fatal: false }).decode(Uint8Array.from(bytes));
  } catch {
    return compact;
  }
}

function htmlToText(value) {
  return String(value || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/tr|h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/gi, "'");
}

function fallbackBody(raw) {
  return splitHeaders(String(raw || '')).body;
}

function normaliseText(value) {
  return String(value || '')
    .replace(/\r/g, '')
    .replace(/[\t ]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[\t ]{2,}/g, ' ')
    .trim();
}
