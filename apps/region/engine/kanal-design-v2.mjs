// AKTUAL MEDIA — predložak "Dizajn v2" za vanjska izdanja (kanal) i nove stranice mreže.
// Čisti CSS sloj koji se dodaje iza postojećih stilova (region.css). Ne mijenja HTML,
// ne mijenja sadržaj, ne dira izvore. Pravila su namjerno vezana samo uz postojeće klase
// (card, cardmedia, cardtitle, cardsum, cardmeta, more, tag, band, leadgrid, eds-city),
// pa isti predložak radi na svakom izdanju i na svakoj novoj stranici koja koristi iste klase.
//
// Standard boja: paleta je iz brenda (zlato, crvena, tirkiz, plava, ljubičasta, zelena),
// a kontrast tekst/pozadina ostaje najmanje 4.5:1 za sitni tekst (provjerava test-kanal-standard-v2).

export const KANAL_DESIGN_V2_CSS = `
/* === Dizajn v2 (AKTUAL MEDIA predložak) ========================================== */
:root{--v2-ink:#15191f;--v2-muted:#4a5260;--v2-paper:#f6f4ef;--v2-white:#ffffff;
  --v2-gold:#e9c66c;--v2-red:#b5402c;--v2-teal:#0f6b6b;--v2-blue:#1d4f91;--v2-plum:#6b2d5c;--v2-green:#2f6b3a;
  --v2-line:rgba(21,25,31,.10);--v2-shadow:0 1px 0 rgba(21,25,31,.06),0 8px 24px rgba(21,25,31,.07)}
body{background:var(--v2-paper);color:var(--v2-ink)}
.leadgrid{gap:28px;padding:36px 0;border-bottom:1px solid var(--v2-line)}
@media (min-width:900px){.leadgrid{grid-template-columns:minmax(0,1.5fr) minmax(0,1fr)}}
.band{padding:40px 0 20px;border-bottom:1px solid var(--v2-line)}
.band h2{font-size:clamp(22px,2.6vw,30px);line-height:1.2;letter-spacing:-.01em}
.card{background:var(--v2-white);border:1px solid var(--v2-line);border-top:5px solid var(--v2-gold);
  border-radius:16px;padding:14px 16px 18px;box-shadow:var(--v2-shadow);
  transition:transform .2s ease,box-shadow .2s ease;align-content:start}
.card:hover{transform:translateY(-2px);box-shadow:0 2px 0 rgba(21,25,31,.06),0 16px 34px rgba(21,25,31,.12)}
.card:nth-of-type(5n+1){border-top-color:var(--v2-red)}
.card:nth-of-type(5n+2){border-top-color:var(--v2-teal)}
.card:nth-of-type(5n+3){border-top-color:var(--v2-gold)}
.card:nth-of-type(5n+4){border-top-color:var(--v2-blue)}
.card:nth-of-type(5n){border-top-color:var(--v2-plum)}
.card--lead{border-top-width:7px}
/* Pozadina kartice: ako vanjska slika (proxy) ne stigne, vidi se znak brenda na svijetloj podlozi,
   a ne tamna pločica. Isti CSS za sve gradove (test: jednak dizajn svih izdanja). */
.cardmedia{background:#ece7da url(/assets/brand/aktual-media-mark.svg) center/38% no-repeat;border:0;border-radius:12px}
.cardtitle{font-size:clamp(20px,2.2vw,26px);line-height:1.2;color:var(--v2-ink)}
.card--lead .cardtitle{font-size:clamp(26px,3.2vw,40px);line-height:1.1}
.cardsum{font-size:15px;line-height:1.55;color:var(--v2-muted)}
.cardmeta{font-size:12px;line-height:1.4;color:var(--v2-muted);letter-spacing:.02em}
.more{display:inline-block;font-size:14px;font-weight:700;color:var(--v2-red);letter-spacing:.01em;padding:4px 0}
.more:hover{text-decoration:underline}
.eds-city{font-size:10.5px;letter-spacing:.08em}
.tag{display:inline-block;margin:2px 4px 2px 0;padding:3px 11px;border-radius:999px;background:var(--v2-ink);color:var(--v2-white);
  font:700 12px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;letter-spacing:.02em}
a.tag:hover{background:var(--v2-red);text-decoration:none}
.xf-tile{border-radius:14px;box-shadow:var(--v2-shadow)}
.xf-tile:hover{transform:translateY(-2px);border-color:var(--v2-gold)}
@media (prefers-reduced-motion:reduce){.card,.xf-tile{transition:none}.card:hover,.xf-tile:hover{transform:none}}
`;
