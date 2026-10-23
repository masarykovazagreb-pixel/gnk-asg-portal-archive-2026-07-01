/**
 * KUĆNI STIL — jedan sloj koji sve stranice mreže čini istom kućom.
 *
 * Zašto ovako, a ne prepisivanje svakog generatora: mreža ima tri stila
 * (šest samostalnih stranica, devet svjetskih portala, sedamnaest gradskih
 * izdanja) i svaki je nastao u drugom trenutku. Umjesto da se svaki razmontira
 * i sastavi iznova — i pritom pokvari testove koji provjeravaju strukturu —
 * ovaj sloj se dodaje na kraj svakog od njih. On ne mijenja raspored elemenata
 * (to rade generatori), nego njihovu težinu: tipografiju, ritam, kartice,
 * slike, gumbe, zaglavlje i podnožje.
 *
 * Pravila:
 *  - boje se čitaju iz postojećih varijabli (--bg, --ink, --accent), pa svjetla
 *    izdanja ostaju svjetla, a tamna tamna; ovaj sloj ne nameće temu;
 *  - sve je izraženo u relativnim jedinicama (clamp/rem), pa se isto ponaša na
 *    telefonu, tabletu i širokom zaslonu;
 *  - nijedno pravilo ne dira `display` strukture koja nosi značenje (navigacija,
 *    tablice, mreže članaka) — samo njezin izgled;
 *  - oznake (`.am-house` na <html>) služe kao sigurnosna brana: ako neka
 *    stranica ne želi sloj, ne dobiva ga.
 */

export const HOUSE_VERSION = 'HOUSE_STYLE_V1_20261023';

/** Znak kuće: jedan naziv, jedan omjer, ista datoteka na svakoj domeni. */
export const BRAND = {
  name: 'AKTUAL MEDIA',
  hr: 'AKTUAL MEDIA — mreža izdanja',
  en: 'AKTUAL MEDIA — network of editions',
  logo: {
    hr: '/assets/brand/aktual-media-hr-1200.webp',
    en: '/assets/brand/aktual-media-en-1200.webp',
    mark: '/assets/brand/aktual-media-mark.svg'
  },
  tagline: {
    hr: 'Jedan izvor provjere. Sedamnaest izdanja. Šest kontinenata.',
    en: 'One source of verification. Seventeen editions. Six continents.'
  }
};

export const HOUSE_CSS = `
/* ---------- KUĆNI STIL v1 ---------- */
:root{
  --am-gold:#c9a227;--am-gold-soft:#e4c877;
  --am-line:color-mix(in srgb,currentColor 14%,transparent);
  --am-line-soft:color-mix(in srgb,currentColor 8%,transparent);
  --am-muted:color-mix(in srgb,currentColor 62%,transparent);
  --am-radius:16px;--am-radius-sm:10px;
  --am-shadow:0 18px 44px -28px rgba(0,0,0,.55);
  --am-gutter:clamp(18px,4vw,40px);
  --am-measure:1180px;
  --am-ease:cubic-bezier(.22,.61,.36,1);
}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{
  font-size:clamp(16.5px,.55vw + 15px,17.5px);
  line-height:1.68;
  letter-spacing:.002em;
  text-rendering:optimizeLegibility;
}
::selection{background:color-mix(in srgb,var(--accent2,var(--am-gold)) 38%,transparent);color:inherit}
:focus-visible{outline:2px solid var(--accent2,var(--am-gold));outline-offset:3px;border-radius:4px}

/* naslovi: jedan ritam kroz cijelu mrežu */
h1,h2,h3,h4{font-family:Georgia,"Iowan Old Style","Times New Roman",serif;font-weight:700;letter-spacing:-.014em;text-wrap:balance}
h1{font-size:clamp(2rem,1.2rem + 2.6vw,3.35rem);line-height:1.08;margin:0 0 .5em}
h2{font-size:clamp(1.35rem,1rem + 1.1vw,1.95rem);line-height:1.18;margin:2.4em 0 .7em;padding-top:.15em;border-top:1px solid var(--am-line-soft)}
h3{font-size:clamp(1.08rem,.95rem + .5vw,1.3rem);line-height:1.28;margin:0 0 .45em}
h2:first-child,h1+h2{border-top:0;margin-top:0;padding-top:0}
p{margin:0 0 1.05em;text-wrap:pretty}
p:last-child{margin-bottom:0}
.lead,main>p:first-of-type{font-size:clamp(1.05rem,.98rem + .4vw,1.2rem);line-height:1.6;color:var(--am-muted)}
small,.cap,.meta,.dateline,.kicker,.k{letter-spacing:.06em}
.kicker,.k,.dateline{text-transform:uppercase;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;font-weight:700;font-size:.72rem;letter-spacing:.14em;color:var(--am-muted)}

/* poveznice: zlatna nit, bez podcrtavanja cijelog teksta */
a{color:inherit;text-decoration-color:color-mix(in srgb,var(--accent2,var(--am-gold)) 70%,transparent);text-underline-offset:.22em;text-decoration-thickness:1px;transition:color .18s var(--am-ease),opacity .18s var(--am-ease)}
a:hover{color:var(--accent2,var(--am-gold))}
a:has(img){text-decoration:none}

/* sadržaj: ista mjera, isti razmak */
main,.wrap,.page{padding-left:var(--am-gutter);padding-right:var(--am-gutter)}
main,.wrap{max-width:var(--am-measure);margin-inline:auto}
section{margin-block:clamp(2rem,3vw,3.4rem)}
hr{border:0;border-top:1px solid var(--am-line-soft);margin:2.2rem 0}

/* slike: uvijek uokvirene, nikad rastegnute */
img{max-width:100%;height:auto}
figure{margin:1.6rem 0}
figure img,main>img,article>img,.hero,.heroimg{border-radius:var(--am-radius);box-shadow:var(--am-shadow);display:block}
figure figcaption,.cap{font-size:.8rem;color:var(--am-muted);margin-top:.6rem;line-height:1.5}

/* kartice: jedna visina tona, jedan obrub, jedan pokret */
.card,.iz-card,.amw-card,.amm-card,.ed-card,.entry,.post{
  border:1px solid var(--am-line);border-radius:var(--am-radius);
  background:color-mix(in srgb,currentColor 3%,transparent);
  transition:transform .22s var(--am-ease),border-color .22s var(--am-ease),box-shadow .22s var(--am-ease);
  overflow:hidden;
}
.card:hover,.iz-card:hover,.amw-card:hover,.ed-card:hover,.entry:hover{
  transform:translateY(-3px);border-color:color-mix(in srgb,var(--accent2,var(--am-gold)) 55%,transparent);
  box-shadow:var(--am-shadow);
}
.card img,.iz-card img,.ed-card img{aspect-ratio:16/9;object-fit:cover;width:100%}

/* gumbi i oznake */
.btn,.more,.amm-card-go,button,a.btn{
  display:inline-flex;align-items:center;gap:.5em;
  font-family:system-ui,-apple-system,"Segoe UI",sans-serif;font-weight:700;
  font-size:.76rem;letter-spacing:.1em;text-transform:uppercase;
  border:1px solid color-mix(in srgb,var(--accent2,var(--am-gold)) 55%,transparent);
  border-radius:999px;padding:.72em 1.15em;text-decoration:none;
  transition:background .2s var(--am-ease),color .2s var(--am-ease),transform .2s var(--am-ease);
}
.btn:hover,.more:hover{background:color-mix(in srgb,var(--accent2,var(--am-gold)) 18%,transparent);transform:translateY(-1px)}
.tag,.chip,.hashtag,.iz-tags a,.ne-hash a{
  display:inline-block;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;
  font-size:.72rem;font-weight:600;letter-spacing:.04em;padding:.32em .68em;margin:0 .35em .35em 0;
  border:1px solid var(--am-line);border-radius:999px;text-decoration:none;opacity:.9;
}

/* zaglavlje: znak kuće stoji uvijek na istom mjestu i iste visine */
.top,.topbar,.masthead,.brand,header.site-header{font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
.top{border-bottom:1px solid var(--am-line)}
.masthead,.brand{gap:.9rem}
.brand img,.ed-logo img,header img.logo,a.logo img{height:clamp(34px,3.2vw,46px);width:auto;max-width:none;border-radius:0;box-shadow:none}
.brand,.logo{letter-spacing:.16em;text-transform:uppercase;font-weight:800}
nav a{text-decoration:none}
nav a[aria-current="page"]{color:var(--accent2,var(--am-gold))}

/* podnožje: mirno, pregledno, s istim redom */
footer{border-top:1px solid var(--am-line);margin-top:clamp(2.4rem,4vw,4rem);padding-block:clamp(1.6rem,3vw,2.6rem);font-size:.86rem;color:var(--am-muted)}
footer h3,footer .k{color:inherit;font-size:.74rem;letter-spacing:.12em;text-transform:uppercase;margin:0 0 .55em}
footer ul{list-style:none;margin:0;padding:0;display:grid;gap:.35em}
footer a{text-decoration:none}
footer a:hover{color:var(--accent2,var(--am-gold))}

/* preskok sadržaja: vidljiv samo na fokus */
.skip{position:absolute;left:-9999px;top:0;z-index:99;background:var(--bg,#08111c);color:inherit;padding:.8em 1.2em;border-radius:0 0 12px 0;font-family:system-ui,sans-serif;font-weight:700}
.skip:focus{left:0}

/* sitnice koje dizajn čine mirnijim */
table{border-collapse:collapse;width:100%}
th,td{padding:.6em .7em;border-bottom:1px solid var(--am-line-soft);text-align:left}
blockquote{margin:1.8rem 0;padding:.2rem 0 .2rem 1.2rem;border-left:3px solid var(--accent2,var(--am-gold));font-size:1.08rem;color:var(--am-muted)}
code,kbd{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.9em;padding:.1em .35em;border-radius:6px;background:color-mix(in srgb,currentColor 8%,transparent)}

/* traka kuće: ista na svakoj domeni — znak, ime, izdanje i veza na maticu */
.am-ribbon{display:flex;align-items:center;gap:clamp(.6rem,1.4vw,1.1rem);flex-wrap:wrap;
  max-width:var(--am-measure);margin:0 auto;padding:.55rem clamp(1rem,3vw,2rem);
  border-bottom:1px solid var(--am-line);font-family:system-ui,-apple-system,"Segoe UI",sans-serif;
  font-size:.74rem;letter-spacing:.14em;text-transform:uppercase}
.am-ribbon-brand{display:inline-flex;align-items:center;gap:.6rem;text-decoration:none;color:inherit;font-weight:800}
.am-ribbon-brand img{height:clamp(22px,2.1vw,30px);width:auto;max-width:none;border-radius:0;box-shadow:none}
.am-ribbon-ed{margin-left:auto;color:var(--am-muted);letter-spacing:.1em}
.am-ribbon-ed b{color:inherit;font-weight:700}
.am-ribbon a:hover{color:var(--accent2,var(--am-gold))}
@media (max-width:520px){.am-ribbon-ed{width:100%;margin-left:0}}
@media print{.am-ribbon{display:none!important}}

@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important;scroll-behavior:auto!important}}
@media print{.top,footer,.skip,nav{display:none!important}body{background:#fff;color:#000}}
`;

/* Traka kuće — jedan HTML za sve domene. Slika je uvijek ista datoteka
   (ista veličina, isti opis), pa se znak ne može „razlikovati po stranici“. */
const escapeAttr = (value) =>
  String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export function houseRibbon({ lang = 'hr', edition = '', mark = BRAND.logo.mark } = {}) {
  const l = lang === 'en' ? 'en' : 'hr';
  const home = 'https://gnk-asg.hr/';
  const label = l === 'en' ? 'AKTUAL MEDIA — network home' : 'AKTUAL MEDIA — matična mreža';
  const alt = l === 'en' ? 'AKTUAL MEDIA — network mark' : 'AKTUAL MEDIA — znak mreže';
  const editionHtml = edition
    ? `<span class="am-ribbon-ed"><b>${escapeAttr(edition)}</b>${l === 'en' ? ' · an AKTUAL MEDIA edition' : ' · izdanje AKTUAL MEDIA'}</span>`
    : `<span class="am-ribbon-ed">${l === 'en' ? 'AKTUAL MEDIA network' : 'mreža AKTUAL MEDIA'}</span>`;
  return `<div class="am-ribbon"><a class="am-ribbon-brand" href="${home}" rel="external noopener" aria-label="${escapeAttr(label)}"><img src="${escapeAttr(mark)}" alt="${escapeAttr(alt)}" width="72" height="72" loading="lazy" decoding="async"><span>AKTUAL MEDIA</span></a>${editionHtml}</div>`;
}
