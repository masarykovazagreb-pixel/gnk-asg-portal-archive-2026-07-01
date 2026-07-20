import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const widgetPath = path.resolve(here, '../assets/whatsapp-widget-v1.js');
const source = fs.readFileSync(widgetPath, 'utf8');

assert.match(source, /385915358365/, 'widget must use the approved bot number');
assert.match(source, /https:\/\/wa\.me\//, 'widget must use the official wa.me deep link');
assert.match(source, /noopener noreferrer/, 'external link must prevent opener access');
assert.match(source, /aria-label/, 'widget must expose an accessible label');
assert.match(source, /prefers-reduced-motion/, 'widget must respect reduced-motion preferences');
assert.match(source, /document\.documentElement\.lang === 'en'/, 'widget must localize EN and HR text');
assert.match(source, /bottom: max\((?:84px|76px)/, 'widget must reserve space above the existing floating home control');
assert.match(source, /env\(safe-area-inset-bottom\)/, 'widget must respect mobile safe-area spacing');
assert.doesNotMatch(source, /WHATSAPP_TOKEN|OPENAI_API_KEY|SMTP_PASS/, 'widget must not contain secrets');

console.log('WhatsApp widget contract: PASS');