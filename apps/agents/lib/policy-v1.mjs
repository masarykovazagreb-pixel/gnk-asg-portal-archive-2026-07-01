import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// AGENTI — zajednička pravila za agenta pisca i AI kontrolnog agenta.
// Ista pravila provjerava i pisac (prije predaje) i kontrolor (prije odobrenja),
// pa se ništa ne odobri što pisac nije smio napisati.

export const SCHEMA = 'gnk-asg-agent-editorial-queue/v1';
export const WRITER_ID = 'AGENT-PISAC-001';
export const APPROVER_ID = 'AGENT-KONTROLA-001';

export const POLICY = {
  // Aktualnost: izvor ne smije biti stariji od ovoliko dana u odnosu na run.
  freshDays: 3,
  // Opis (meta description) — isti raspon kao za izdanja u SEO standardu.
  descriptionMin: 80,
  descriptionMax: 200,
  // Minimalni tekst po jeziku (broj riječi u tijelu). Ispod toga je tanak sadržaj.
  bodyMinWords: 150,
  // Najmanji udio latiničnih slova u izvatku/naslovu (inače nema prijevoda i odbija se).
  latinMinShare: 0.9,
  // Teme koje nisu aktualne vijesti (horoskopi, recepti, zabavni sadržaj bez vijesti).
  offTopicPatterns: [/horoskop/i, /\brecept/i, /\bkuhanj/i, /\bkviz\b/i, /\bhoroscope\b/i, /\brecipe/i],
  // Najdulji doslovni citat iz izvora (riječi).
  quoteMaxWords: 25,
  // SEO standard: najmanje šest internih linkova.
  linksMin: 6,
  // Obavezni hashtagovi kuće.
  requiredHashtags: ['#AKTUALMEDIA', '#GNKASG'],
  // Zabranjeni obrasci: PBN, link mreže, cloaking, spam, obavještajni kontekst, nepotvrđena partnerstva.
  bannedPatterns: [
    /\bpbn\b/i,
    /backlink/i,
    /link\s*farm/i,
    /cloak/i,
    /doorway/i,
    /spam/i,
    /auto-?komentar/i,
    /obavještajn/i,
    /intelligence\s+agenc/i,
    /\bcibona\b/i,
    /nk\s+sesvete/i,
  ],
};

export const AI_DISCLOSURE = {
  hr: 'Tekst je pripremio AI agent GNK ASG iz javnih izvora navedenih u tekstu. Objavu je odobrio AI kontrolni agent ' + APPROVER_ID + '. Izvorni naslovi, izvaci i sadržaj ostaju vlasništvo izdavača, a poveznice vode na izvornike.',
  en: 'This text was prepared by a GNK ASG AI agent from the public sources named in the text. The publication was approved by the AI control agent ' + APPROVER_ID + '. Original headlines, excerpts and content remain the property of their publishers; links point to the originals.',
};

export function words(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length;
}

export function zagrebDate(iso) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Zagreb' }).format(new Date(iso));
}

// Kill switch: ops/agent-editorial-kill-switch.json. Nedostaje ili nije "enabled": true → agenti stanu.
const KILL_SWITCH = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'ops', 'agent-editorial-kill-switch.json');
export function killSwitchState(file = KILL_SWITCH) {
  if (!existsSync(file)) return { enabled: false, reason: 'nema ops/agent-editorial-kill-switch.json' };
  try {
    const data = JSON.parse(readFileSync(file, 'utf8'));
    return data.enabled === true ? { enabled: true } : { enabled: false, reason: 'kill switch je isključen' };
  } catch (error) {
    return { enabled: false, reason: `kill switch se ne čita: ${error.message}` };
  }
}
