/**
 * GNK ASG / AKTUAL MEDIA — private read-only GitHub Actions log triage.
 * Never reads secrets, calls network services, writes the repository, merges or deploys.
 * Produces fixed finding labels, not raw log fragments. Green logs are NOT proof of LIVE.
 */
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

export const RULES = Object.freeze([
 ['MISSING_ENTITY','P1',/missing entities|nermin_sefic.*\d+.*gnk_dinamo_ltd/i,'Popravi izvorni SEO entitetski predložak.'],
 ['HASHTAG_DRIFT','P1',/owner hashtags on|nedostaju.*hashtag/i,'Provjeri kontekstualne hashtagove, bez keyword stuffinga.'],
 ['META_LENGTH','P1',/meta descriptions over 160|meta opisi.*(predug|160)/i,'Skrati izvorne meta opise i ponovno generiraj.'],
 ['RADIO_PROMO_DRIFT','P1',/radio promo block drift|radio-promo-v1: odstupanja/i,'Pregledaj promotivni generator i lokalni diff.'],
 ['STALE_REFRESH_LAYER','P1',/podatkovni dan u modulu nije|refresh layer stale/i,'Ne prikazuj novi datum bez novih provjerenih podataka.'],
 ['NETWORK_CITY_MISMATCH','P1',/zapis kaže \d+ gradova, podaci \d+/i,'Uskladi broj gradova s kanonskim registrom.'],
 ['NETWORK_INVENTORY','P1',/##\[error\]Inventar mreže i izvora/i,'Revidiraj stvarne izvore i poslovne entitete.'],
 ['PUBLIC_NETWORK_RIGHTS','P0',/##\[error\]Javni inventar — adrese, izvori i prava/i,'Zaustavi objavu nedokazanih prava i izvora.'],
 ['WEBSITE_JSONLD','P1',/##\[error\]WebSite JSON-LD/i,'Ispravi samo dokaziva strukturirana polja.'],
 ['IMAGE_HOST_COVERAGE','P1',/nije na popisu — dodaj ga u image-hosts|Pokrivenost posrednika slika.*PAD/i,'Provjeri vlasništvo i dopuštene izvore slika.'],
 ['IMAGE_PROXY_TEST','P1',/##\[error\]Posrednik slika/i,'Provjeri proxy i dopuštene medijske hostove.'],
 ['SITES_BUILD_DRIFT','P1',/zastario izlaz — pokreni node apps\/sites\/build\.mjs/i,'Deterministički regeneriraj na izoliranoj grani.'],
 ['FAVICON_BRAND','P1',/nema rel="icon"|##\[error\]Ugovor o brendu/i,'Vrati službeni favicon bez promjene identiteta.'],
 ['SITEMAP_REGISTRY','P1',/sitemap.*(not registered|missing|nedostaje|failed)/i,'Usporedi sitemap indeks s javnim kanonskim URL-ovima.'],
 ['WEEKLY_EDITORIAL_HOLD','HOLD',/weekly.*HOLD|pending weekly.*HOLD/i,'Sačuvaj HOLD do stvarnog uredničkog odobrenja.'],
 ['HREFLANG_PARITY','P1',/hreflang.*(fail|missing|invalid|nedostaje)/i,'Provjeri recipročne HR/EN jezične veze.'],
 ['CANONICAL_CONFLICT','P1',/canonical.*(conflict|mismatch|invalid|nedostaje)/i,'Ostavi samo jednu točnu kanonsku adresu.'],
 ['EDITORIAL_APPROVAL','P0',/editor(ial)?(Approved| approval).*false|missing editorial approval/i,'Bez odobrenja urednika nema objave.'],
 ['IMAGE_RIGHTS','P0',/imageRightsVerified.*false|image rights.*(missing|failed|unverified)/i,'Bez dokaza prava na sliku nema objave.'],
 ['EXACT_SHA_RELEASE','P0',/exact.?SHA.*(mismatch|failed|race)|production SHA mismatch/i,'Zaustavi deploy i potvrdi točan SHA i javni HTTP.']
].map(([id,priority,pattern,next])=>Object.freeze({id,priority,pattern,next})));
const marker=/##\[error\]|(?:→|->).*\bPAD\s*\(|\bFAIL\b|\bAssertionError\b|\bnot ok\s+\d+\b/;
const rank={P0:0,P1:1,HOLD:2};
export function triage(log,{sha=null,runId=null}={}){
 if(typeof log!=='string')throw new TypeError('Log must be text');
 if(log.length>15000000)throw new RangeError('Log exceeds 15 MB');
 const errors=log.split(/\r?\n/).filter(line=>marker.test(line));
 const found=RULES.filter(r=>errors.some(line=>r.pattern.test(line)));
 const covered=errors.filter(line=>found.some(r=>r.pattern.test(line))).length;
 return {
   schema:'GNK_ASG_PRIVATE_CI_TRIAGE_V1',
   verdict:errors.length?'GATE_BLOCKED_OR_REQUIRES_REVIEW':'INSUFFICIENT_EVIDENCE_NOT_LIVE',
   notProductionProof:true,
   sha:sha&&/^[a-f0-9]{40}$/i.test(String(sha))?String(sha).toLowerCase():null,
   runId:runId&&/^\d{1,20}$/.test(String(runId))?String(runId):null,
   rulesConfigured:RULES.length,
   failureLines:errors.length,
   uncategorizedFailureLines:errors.length-covered,
   findings:found.sort((a,b)=>rank[a.priority]-rank[b.priority]||a.id.localeCompare(b.id))
     .map(({id,priority,next})=>({id,priority,next})),
   recommendation:'Bez zelenog required CI, kontroliranog mergea, exact-SHA Cloudflare deploya i neovisne HTTPS potvrde nema LIVE.'
 };
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const args=process.argv.slice(2),fi=args.indexOf('--file'),si=args.indexOf('--sha'),ri=args.indexOf('--run-id');
 if(args.includes('--help'))process.stdout.write('node scripts/triage-portal-gates-v1.mjs [--file local.log] [--sha 40hex] [--run-id number]\n');
 else {
  if(fi>=0&&!args[fi+1])throw Error('Missing --file');
  const log=readFileSync(fi>=0?args[fi+1]:0,'utf8');
  process.stdout.write(JSON.stringify(triage(log,{sha:si>=0?args[si+1]:null,runId:ri>=0?args[ri+1]:null}),null,2)+'\n');
 }
}
