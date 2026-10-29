#!/usr/bin/env node
// GNK ASG — jedan ulaz za sve provjere portala.
//
// Cilj: svaki PR i svaki dnevni self-heal imaju isti, ponovljiv prag.
// Umjesto da se u sjećanju drži "koji se skript još treba pokrenuti",
// ovdje je popis; pokreće se redom, mjeri vrijeme i na kraju ispiše
// sažetak. Ako obavezna provjera padne, izlazni kod je 1.
//
// Pokretanje:
//   node scripts/test-all-v1.mjs          sve provjere
//   node scripts/test-all-v1.mjs --fast   bez sporih (portal + aktual)
//   node scripts/test-all-v1.mjs --json   strojni sažetak na stdout
//
// Provjere označene kao "savjet" (advisory) prikazuju se, ali ne ruše
// izlazni kod — dok se ne poprave, moraju ostati vidljive, ne skrivene.

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const FAST = args.has('--fast');
const JSON_OUT = args.has('--json');

const GATES = [
  { name: 'Vlasništvo automatizacija', cmd: ['node', 'scripts/audit-bot-ownership-v1.mjs'], required: true },
  { name: 'Rasporedi u allowlisti', cmd: ['python3', 'scripts/validate-workflow-schedule-allowlist-v2.py'], required: true },
  { name: 'HR/EN index parity', cmd: ['node', 'scripts/build-index-parity.mjs', '--check'], required: true },
  { name: 'Ploča zdravlja', cmd: ['node', 'scripts/build-health-dashboard-v1.mjs', '--check'], required: true },
  { name: 'AKTUAL MEDIA — svijet', cmd: ['node', 'scripts/test-aktual-media-world-v1.mjs'], required: true },
  { name: 'Top teme dana', cmd: ['node', 'scripts/audit-top-teme-v1.mjs'], required: true },
  { name: 'Javni portal', cmd: ['node', 'scripts/audit-public-portal-v1.mjs'], required: true, slow: true },
  { name: 'AKTUAL MEDIA — sve stranice', cmd: ['node', 'scripts/audit-aktual-all-pages-v2.mjs'], required: true, slow: true },
  { name: 'AKTUAL MEDIA — izdavač, 22 medijske cjeline i sitemapovi', cmd: ['node', 'tests/test-aktual-media-discovery-v1.mjs'], required: true },
  { name: 'AKTUAL MEDIA — besplatni međunarodni kanali i zaštita objave', cmd: ['node', 'tests/test-global-free-distribution-v1.mjs'], required: true },
  { name: 'Distribucija — evidencija, obrada slika i oporavak', cmd: ['node', 'tests/test-distribution-reliability-v1.mjs'], required: true },
  { name: 'WebSite JSON-LD', cmd: ['node', 'scripts/test-website-jsonld-v1.mjs'], required: true },
  { name: 'Prijenos mreže — popis i veze na kopije', cmd: ['node', 'scripts/build-prenos-hub-v1.mjs', '--check'], required: true },
  { name: 'Prijenos mreže — veza na svakom tekstu', cmd: ['node', 'scripts/apply-prenos-crosslinks-v1.mjs', '--check'], required: true },
  { name: 'AKTUAL urednički desk', cmd: ['node', 'scripts/build-aktual-entity-desks-v1.mjs', '--check'], required: true },
  { name: 'S+Chat agent', cmd: ['node', 'tests/test-s-chat-static-v1.mjs'], required: true },
  { name: 'S+Chat evaluacija', cmd: ['node', 'tests/test-s-chat-eval-v1.mjs'], required: true },
  { name: 'HR Knowledge Center', cmd: ['node', 'scripts/knowledge-center-hr-sync-v1.mjs', '--check'], required: true },
  { name: 'Kadenca baze znanja', cmd: ['node', 'tests/test-knowledge-cadence-v1.mjs'], required: true },
  { name: 'Fotografije bez zastora', cmd: ['node', 'tests/test-editorial-photo-clarity-v1.mjs'], required: true },
  { name: 'Posrednik slika', cmd: ['node', 'tests/test-image-proxy-v1.mjs'], required: true },
  { name: 'Sigurnosna zaglavlja', cmd: ['node', 'tests/test-security-headers-v1.mjs'], required: true },
  { name: 'AKTUAL bez JavaScripta', cmd: ['node', 'tests/test-aktual-noscript-v1.mjs'], required: true },
  { name: 'Autonomija 365', cmd: ['node', 'tests/test-autonomy-v1.mjs'], required: true },
  { name: 'Status centar — javni snimak i integritet', cmd: ['node', 'apps/portal/tests/public-status-center.test.mjs'], required: true },
  { name: 'Status centar — snimak je svjež', cmd: ['node', 'scripts/public-status-snapshot-v1.mjs', '--check'], required: true },
  { name: 'Pristupačnost — preskok', cmd: ['node', 'tests/test-a11y-skip-v1.mjs'], required: true },
  { name: 'S+Chat — pitanja s ove stranice', cmd: ['node', 'tests/test-s-chat-context-suggest-v1.mjs'], required: true },
  { name: 'Podatkovni desk', cmd: ['node', 'tests/test-data-desk-v1.mjs'], required: true },
  { name: 'Tehnologija budućnosti', cmd: ['node', 'tests/test-future-tech-v1.mjs'], required: true },
  { name: 'Mreža neovisnih izdanja', cmd: ['node', 'tests/test-sites-network-v1.mjs'], required: true },
  { name: 'Paukova mreža — 20 ulaza', cmd: ['node', 'tests/test-network-mesh-v1.mjs'], required: true },
  { name: 'Svjetska izdanja — devet portala', cmd: ['node', 'tests/test-world-portals-v1.mjs'], required: true },
  { name: 'Razmjena vijesti — svaki web nosi tuđe naslove', cmd: ['node', 'tests/test-exchange-block-v1.mjs'], required: true },
  { name: 'Razmjena — svi webovi daju i primaju vezu', cmd: ['node', 'tests/test-network-reciprocity-v1.mjs'], required: true },
  { name: 'Razmjena — isti strojni zapis na svakom webu', cmd: ['node', 'tests/test-exchange-schema-v1.mjs'], required: true },
  { name: 'Feedovi — RSS, Atom i JSON nose isti sadržaj', cmd: ['node', 'tests/test-feeds-valid-v1.mjs'], required: true },
  { name: 'Atribucija — svaka kopija nosi izvor i autora', cmd: ['node', 'tests/test-attribution-v1.mjs'], required: true },
  { name: 'Bez dvostrukog sadržaja — jedan tekst, jedan kanonik', cmd: ['node', 'tests/test-no-duplicate-content-v1.mjs'], required: true },
  { name: 'Dizajn sustav — isti tokeni na svakom webu', cmd: ['node', 'tests/test-design-system-v1.mjs'], required: true },
  { name: 'Slike izdanja — nema crnih krugova', cmd: ['node', 'tests/test-edition-images-v1.mjs'], required: true },
  { name: 'Ugovor o brendu — jedno ime, jedan znak, jedan izdavač', cmd: ['node', 'scripts/audit-brand-contract-v1.mjs'], required: true },
  { name: 'Tvornica — nazivi, hashtagovi, duljina meta opisa', cmd: ['python3', 'scripts/factory/test_factory_v1.py'], required: true },
  { name: 'Sinkronizacija — jedan popis koraka i redoslijed', cmd: ['node', 'tests/test-sync-pipeline-v1.mjs'], required: true },
  { name: 'Determinizam — isti ulaz, isti bajtovi', cmd: ['node', 'tests/test-build-determinism-v1.mjs'], required: true },
  { name: 'Slojevi — drugo pokretanje ne mijenja ništa', cmd: ['node', 'tests/test-layer-idempotency-v1.mjs'], required: true },
  { name: 'Workflow higijena — dopuštenja, rokovi, skripte', cmd: ['node', 'tests/test-workflow-hygiene-v1.mjs'], required: true },
  { name: 'Cron bez kolizija — dva pisca, ista minuta', cmd: ['node', 'tests/test-cron-collisions-v1.mjs'], required: true },
  { name: 'Nadzorna ploča sinkronizacije govori istinu', cmd: ['node', 'tests/test-sync-status-v1.mjs'], required: true },
  { name: 'Osvježavanje — modul na svakoj stranici', cmd: ['node', 'tests/test-refresh-layer-v1.mjs'], required: true },
  { name: 'Brojke se ne razilaze — jedan zbroj mreže', cmd: ['node', 'tests/test-counts-consistency-v1.mjs'], required: true },
  { name: 'Kodiranje izvora — bez U+FFFD', cmd: ['node', 'tests/test-region-encoding-v1.mjs'], required: true },
  { name: 'Standard izdanja svjetske mreže — hashtagovi, urednik, brend, slike na karticama', cmd: ['node', 'scripts/test-kanal-standard-v2.mjs'], required: true },
  { name: 'Jednak standard izdanja i portala', cmd: ['node', 'tests/test-editions-parity-v1.mjs'], required: true },
  { name: 'Unutrašnjost izdanja — isti okvir kao naslovnica', cmd: ['node', 'tests/test-edition-inner-parity-v1.mjs'], required: true },
  { name: 'Atlas, paukova mreža i glavni gradovi', cmd: ['node', 'tests/test-network-atlas-v1.mjs'], required: true },
  { name: 'Desk grafike — devet ilustracija', cmd: ['node', 'tests/test-desk-art-v1.mjs'], required: true },
  { name: 'Slike — alt, dimenzije i postojeće datoteke', cmd: ['node', 'tests/test-image-alt-v1.mjs'], required: true },
  { name: 'Društvene kartice — OG i Twitter slika', cmd: ['node', 'tests/test-social-cards-v1.mjs'], required: true },
  { name: 'Sindikacija — kolumne na svakoj domeni', cmd: ['node', 'tests/test-sindikacija-v1.mjs'], required: true },
  { name: 'Prenos — svi naši tekstovi na svakoj domeni', cmd: ['node', 'tests/test-prenos-v1.mjs'], required: true },
  { name: 'Pokrivenost — plan i stanje mreže', cmd: ['node', 'scripts/plan-world-expansion-v1.mjs', '--check'], required: true },
  { name: 'Pokrivenost — javne stranice', cmd: ['node', 'scripts/build-coverage-page-v1.mjs', '--check'], required: true },
  { name: 'Glavni gradovi — ugovor i sitemap', cmd: ['node', 'tests/test-capitals-completeness-v1.mjs'], required: true },
  { name: 'Sitemap integritet — svaka adresa postoji', cmd: ['node', 'tests/test-sitemap-integrity-v1.mjs'], required: true },
  { name: 'Hreflang — obostrani prijevodi', cmd: ['node', 'tests/test-hreflang-reciprocity-v1.mjs'], required: true },
  { name: 'Interni linkovi — nijedna veza u prazno', cmd: ['node', 'tests/test-internal-links-v1.mjs'], required: true },
  { name: 'SEO matrica mreže', cmd: ['node', 'tests/test-seo-matrix-v1.mjs'], required: true },
  { name: 'Meta higijena — oznake, autor, entitet', cmd: ['node', 'tests/test-meta-hygiene-v1.mjs'], required: true },
  { name: 'Pokrivenost posrednika slika', cmd: ['node', 'tests/test-image-proxy-coverage-v1.mjs'], required: true },
  { name: 'Znakovi kuće AKTUAL MEDIA', cmd: ['node', 'tests/test-brand-logos-v1.mjs'], required: true },
  { name: 'Stabilnost i ažurnost izdanja', cmd: ['node', 'tests/test-stability-contracts-v1.mjs'], required: true },
  { name: 'AKTUAL MEDIA — najava proizvoda', cmd: ['node', 'tests/test-aktual-promo-v1.mjs'], required: true },
  { name: 'AKTUAL MEDIA — popis svih proizvoda', cmd: ['node', 'tests/test-aktual-products-v1.mjs'], required: true },
  { name: 'Samostalni portali — ARHIVA i DNEVNIK', cmd: ['node', 'tests/test-satellites-v1.mjs'], required: true },
  { name: 'Znak u čvoru izdavača', cmd: ['node', 'scripts/backfill-brand-entity-logo-v1.mjs', '--check'], required: true },
  { name: 'Standard svakog weba — osvježavanje, impressum, ikona, traka', cmd: ['node', 'tests/test-web-standard-v1.mjs'], required: true },
  { name: 'Agenti — pisac i AI kontrola pregleda', cmd: ['node', 'tests/test-agent-editorial-pipeline-v1.mjs'], required: true },
  { name: 'Agenti — red objava i odobrenja kontrolnog agenta', cmd: ['node', 'scripts/validate-agent-editorial-queue-v1.mjs'], required: true },
  { name: 'Agenti — objava odobrenih pregleda (HR/EN, JSON-LD, hreflang)', cmd: ['node', 'tests/test-agent-publish-v1.mjs'], required: true },
  { name: 'Nermin Sefić — oznake, glavni urednik i grupa na svim stranicama', cmd: ['node', 'tests/test-nermin-tags-v1.mjs'], required: true },
  { name: 'Meta opisi članaka AKTUAL MEDIA KANAL-a (80–200 znakova, bez duplikata prefiksa)', cmd: ['node', 'tests/test-article-meta-v1.mjs'], required: true },
];

function run(gate) {
  const started = Date.now();
  const result = spawnSync(gate.cmd[0], gate.cmd.slice(1), {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, NO_COLOR: '1' },
  });
  const ms = Date.now() - started;
  const ok = result.status === 0;
  const output = `${result.stdout || ''}${result.stderr || ''}`.trim();
  return { ...gate, ok, ms, status: result.status, output };
}

const selected = GATES.filter((g) => !(FAST && g.slow));
const results = [];
for (const gate of selected) {
  process.stdout.write(`→ ${gate.name} … `);
  const r = run(gate);
  results.push(r);
  process.stdout.write(`${r.ok ? 'OK' : 'PAD'} (${(r.ms / 1000).toFixed(1)} s)\n`);
  if (!r.ok) {
    const tail = r.output.split('\n').slice(-6).join('\n');
    process.stdout.write(tail.replace(/^/gm, '    ') + '\n');
  }
}

const required = results.filter((r) => r.required);
const failedRequired = required.filter((r) => !r.ok);
const advisoryFailed = results.filter((r) => !r.required && !r.ok);
const passed = results.filter((r) => r.ok).length;

// U GitHub Actionsu svaki pali obavezni gate dobiva anotaciju s imenom i
// zadnjim redovima izlaza, da se uzrok vidi i bez pristupa dnevniku koraka.
if (process.env.GITHUB_ACTIONS === 'true') {
  for (const r of failedRequired) {
    const detail = r.output.split('\n').filter(Boolean).slice(-3).join(' | ')
      .replace(/[\r\n]/g, ' ').replace(/%/g, '%25').slice(0, 900);
    console.log(`::error title=Obavezna provjera pala::${r.name} (${r.cmd.join(' ')}) — ${detail}`);
  }
}

if (JSON_OUT) {
  console.log(JSON.stringify({
    ok: failedRequired.length === 0,
    fast: FAST,
    passed,
    total: results.length,
    failed: failedRequired.map((r) => ({ name: r.name, cmd: r.cmd.join(' ') })),
    advisory: advisoryFailed.map((r) => ({ name: r.name, cmd: r.cmd.join(' ') })),
    gates: results.map((r) => ({ name: r.name, ok: r.ok, required: r.required, ms: r.ms })),
  }, null, 2));
} else {
  console.log('');
  console.log('─'.repeat(62));
  console.log(`Provjere: ${passed}/${results.length} prošlo${FAST ? ' (brzi način)' : ''}`);
  if (failedRequired.length) {
    console.log('Obavezno pada:');
    for (const r of failedRequired) console.log(`  • ${r.name} → ${r.cmd.join(' ')}`);
  }
  if (advisoryFailed.length) {
    console.log('Savjet (ne ruši izlaz):');
    for (const r of advisoryFailed) console.log(`  • ${r.name} → ${r.cmd.join(' ')}`);
  }
  if (!failedRequired.length) console.log('Sve obavezne provjere su zelene.');
  console.log('─'.repeat(62));
}

process.exit(failedRequired.length ? 1 : 0);
