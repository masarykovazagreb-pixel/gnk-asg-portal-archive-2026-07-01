#!/usr/bin/env node
/**
 * Accessibility and hierarchy upgrade for AKTUAL MEDIA (HR + EN).
 * - raises text/accent contrast on the paper background
 * - makes the Radio Aktual deck the first content module after the hero
 * - adds explicit accessible form/control colours for the radio panel
 */
import fs from 'node:fs';

const FILES = [
  'apps/portal/gnk-aktual/index.html',
  'apps/portal/en/gnk-aktual/index.html',
];

const OLD_TOKENS = '--ak-bg:#F0E6C4;--ak-panel:#E7DAAE;--ak-line:#241C0E;--ak-red:#C81E1E;--ak-red-dim:#9A1616;--ak-text:#241C0E;--ak-sub:#6B6455;--ak-zlato:#B8860B';
const NEW_TOKENS = '--ak-bg:#F0E6C4;--ak-panel:#E7DAAE;--ak-line:#241C0E;--ak-red:#B91C1C;--ak-red-dim:#881313;--ak-text:#1A1308;--ak-sub:#4D473B;--ak-zlato:#7A5200';
const PATCH_MARKER = '/* aktual-contrast-v1 */';
const RADIO_STYLE = `${PATCH_MARKER}
.radio-status{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;background:#1e293b;color:#f8fafc;border:1px solid #64748b;font:800 .72rem/1 Arial,sans-serif;letter-spacing:.05em}
.radio-select{background:#ffffff;color:#111827;border:1px solid #cbd5e1;font:700 .92rem/1.2 Arial,sans-serif}
.btn-radio-play,.btn-radio-next,.btn-vol-adj{background:#f8fafc;color:#111827;border:1px solid #cbd5e1;font:800 .82rem/1 Arial,sans-serif;cursor:pointer}
.btn-radio-play{background:#d4af37;color:#191307;border-color:#f0cf67}
.btn-radio-play:hover,.btn-radio-next:hover,.btn-vol-adj:hover{outline:3px solid rgba(255,255,255,.45);outline-offset:1px}
#radioTrackArtist,#radioStationTag{color:#dbe7f3}
#radioAnnounceBanner{color:#fde68a;font:700 .82rem/1.45 Arial,sans-serif}
`;

function getRadioSection(html) {
  const match = html.match(/<section class="ak-v1" id="aktualRadioDeck">[\s\S]*?<\/section>/);
  if (!match) throw new Error('missing #aktualRadioDeck section');
  return match[0];
}

function update(file) {
  const before = fs.readFileSync(file, 'utf8');
  let html = before;
  if (html.includes(OLD_TOKENS)) html = html.replace(OLD_TOKENS, NEW_TOKENS);
  if (!html.includes(NEW_TOKENS)) throw new Error(`${file}: expected colour token set not found`);

  if (!html.includes(PATCH_MARKER)) {
    const marker = '</style><section class="ak-v1">';
    const index = html.indexOf(marker);
    if (index < 0) throw new Error(`${file}: unable to locate Aktual module style boundary`);
    html = `${html.slice(0, index)}${RADIO_STYLE}${html.slice(index)}`;
  }

  const radio = getRadioSection(html);
  const narrative = '<section class="ak-narrative">';
  const radioIndex = html.indexOf(radio);
  const narrativeIndex = html.indexOf(narrative);
  if (narrativeIndex < 0) throw new Error(`${file}: narrative marker not found`);
  if (radioIndex > narrativeIndex) {
    html = html.slice(0, radioIndex) + html.slice(radioIndex + radio.length);
    const insertionIndex = html.indexOf(narrative);
    html = `${html.slice(0, insertionIndex)}${radio}\n  ${html.slice(insertionIndex)}`;
  }

  const checks = {
    radio: (html.match(/id="aktualRadioDeck"/g) || []).length,
    incident: (html.match(/id="akRegionalIncidentMonitor"/g) || []).length,
    evolution: (html.match(/id="akWorkforceEvolutionDesk"/g) || []).length,
    patched: html.includes(PATCH_MARKER),
    radioBeforeNarrative: html.indexOf('id="aktualRadioDeck"') < html.indexOf(narrative),
  };
  if (checks.radio !== 1 || checks.incident !== 1 || checks.evolution !== 1 || !checks.patched || !checks.radioBeforeNarrative) {
    throw new Error(`${file}: structural verification failed: ${JSON.stringify(checks)}`);
  }
  if (html !== before) fs.writeFileSync(file, html, 'utf8');
  return { file, changed: html !== before, checks };
}

console.log(JSON.stringify(FILES.map(update), null, 2));
