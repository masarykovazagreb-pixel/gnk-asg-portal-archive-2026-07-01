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

/* EDITORIAL V4 — unified international image grid / 17 editions */


/* Editorial V3: unified brand and 17 city/world editions. Progressive CSS only. */
:root{--v2-ink:#151c29;--v2-muted:#525d6c;--v2-paper:#f4f3ef;--v2-white:#fff;--v2-gold:#d5ac59;--v2-red:#ad3433;--v2-teal:#0f6665;--v2-line:#dce0e6;--v2-shadow:0 12px 32px rgba(18,28,42,.075)}
body{background:var(--v2-paper);color:var(--v2-ink);-webkit-font-smoothing:antialiased}
main{max-width:1480px;min-width:0}
main a:focus-visible,.card a:focus-visible{outline:3px solid #a86a08;outline-offset:4px}
.top{background:linear-gradient(150deg,#101a28,#202d41 65%,#111c29)}
.topbar{letter-spacing:.12em}
.masthead{gap:18px;align-items:center;padding-top:24px;padding-bottom:24px}
.ed-logo{border-radius:0;max-width:min(100%,420px);overflow:visible}
.ed-logo img{width:auto;height:clamp(45px,5.4vw,74px);max-width:min(100%,410px);object-fit:contain}
.logo{font:700 clamp(34px,4.8vw,64px)/1.02 Georgia,"Times New Roman",serif;letter-spacing:-.035em}
.strap{font-size:clamp(14px,1.2vw,17px);max-width:58ch}
.mainnav{gap:8px 25px;padding-top:15px;padding-bottom:15px}
.mainnav a{text-underline-offset:5px}
.eds{background:rgba(0,0,0,.24);gap:18px}
.eds-row{gap:14px}
.eds-img{width:52px;height:52px;border-radius:15px;border:1px solid rgba(255,255,255,.27)}
.eds-img img{object-fit:cover;object-position:center}
.eds-city{font-size:10px;line-height:1.2;letter-spacing:.045em}
.eds-i.is-current .eds-img{box-shadow:0 0 0 2px var(--v2-gold);border-color:var(--v2-gold)}
.intro--hero{min-height:clamp(390px,43vw,580px);grid-template-columns:minmax(0,1.8fr) minmax(230px,.7fr);align-items:end;border-radius:0 0 24px 24px;gap:36px}
.intro--hero .heroimg{object-fit:cover;object-position:center 42%}
.intro--hero::after{background:linear-gradient(90deg,rgba(7,15,25,.93),rgba(7,15,25,.67) 49%,rgba(7,15,25,.22)),linear-gradient(0deg,rgba(7,15,25,.77),transparent 75%)}
.intro--hero h1{font-size:clamp(38px,5.5vw,76px);letter-spacing:-.044em;line-height:1.01;max-width:18ch;text-wrap:balance}
.intro--hero .intro-text{font-size:clamp(15px,1.35vw,19px);line-height:1.55;max-width:59ch}
.intro--hero .intro-side{border:1px solid rgba(255,255,255,.24);border-radius:16px;background:rgba(12,23,34,.8);padding:22px;box-shadow:0 15px 38px rgba(0,0,0,.12)}
.intro--hero .dateline{font-size:11px;letter-spacing:.17em}
.intro--hero .hero-tags{font-size:11px;line-height:1.5;opacity:.83}
.live{align-items:center;gap:9px}
.live-n{background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.22);padding:8px 12px;border-radius:8px}
.leadgrid{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(0,1fr);gap:20px;padding:34px 0;border-bottom:1px solid var(--v2-line)}
.leadside{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px;align-content:start;min-width:0}
.card{min-width:0;display:flex;flex-direction:column;align-content:start;background:var(--v2-white);border:1px solid var(--v2-line);border-radius:15px;overflow:hidden;padding:0 0 19px;box-shadow:var(--v2-shadow);transition:transform .2s ease,box-shadow .2s ease}
.card:hover{transform:translateY(-3px);box-shadow:0 18px 40px rgba(18,28,42,.13)}
.card--lead{border:1px solid #d5c6a9;box-shadow:0 16px 34px rgba(18,28,42,.11)}
.cardmedia{display:block;position:relative;overflow:hidden;width:100%;aspect-ratio:16/10;background:#e4e7ea url(/assets/brand/aktual-media-mark.svg) center/28% no-repeat;border-radius:0;border:0}
.cardmedia img{display:block;width:100%;height:100%;object-fit:cover;object-position:center;transition:transform .4s ease}
.card:hover .cardmedia img{transform:scale(1.035)}
.card--lead .cardmedia{aspect-ratio:16/9}
.leadside .card:nth-child(3n) .cardmedia{aspect-ratio:4/3}
.leadside .card:nth-child(4n) .cardmedia{aspect-ratio:3/2}
.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:19px}
.grid .card:nth-child(7n+2) .cardmedia{aspect-ratio:4/3}
.grid .card:nth-child(7n+4) .cardmedia{aspect-ratio:3/2}
.grid .card:nth-child(7n+6) .cardmedia{aspect-ratio:1/1}
.grid .card:nth-child(9n+1){grid-column:span 2}
.grid .card:nth-child(9n+1) .cardmedia{aspect-ratio:2/1}
.cardmeta{display:flex;align-items:center;flex-wrap:wrap;gap:4px;font:700 11px/1.5 system-ui,sans-serif;letter-spacing:.035em;text-transform:uppercase;color:#616c7a;margin:17px 18px 8px}
.cardmeta .src{color:#8f352c}
.cardtitle{font:700 clamp(19px,1.55vw,25px)/1.22 Georgia,"Times New Roman",serif;letter-spacing:-.02em;color:var(--v2-ink);margin:0 18px 10px;text-wrap:pretty;overflow-wrap:anywhere}
.card--lead .cardtitle{font-size:clamp(29px,3.1vw,47px);line-height:1.1;letter-spacing:-.035em}
.leadside .cardtitle{font-size:clamp(17px,1.35vw,21px)}
.cardsum{font:400 15px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--v2-muted);margin:0 18px 15px;max-width:70ch}
.leadside .cardsum{font-size:13px;line-height:1.5}
.more{display:inline-block;align-self:flex-start;font:750 12px/1.3 system-ui,sans-serif;text-transform:uppercase;letter-spacing:.065em;color:#8a3027;margin:auto 18px 0;border-bottom:2px solid currentColor;padding:7px 0 3px}
.more:hover{text-decoration:none;color:#61211d}
.band{padding:35px 0 27px;border-bottom:1px solid var(--v2-line)}
.bandhead{display:flex;justify-content:space-between;align-items:end;gap:12px;border-bottom:2px solid #202b39;padding-bottom:12px;margin-bottom:21px}
.bandhead h2{font:700 clamp(25px,2.3vw,37px)/1.1 Georgia,serif;letter-spacing:-.025em;margin:0}
.bandhead .count{font:700 12px/1.4 system-ui,sans-serif;background:#1b2938;color:white;border-radius:7px;padding:5px 10px}
.list li{border-color:var(--v2-line)}
.tag,.chip{border-radius:7px}
.tag{font:750 10px/1.4 system-ui,sans-serif;letter-spacing:.06em}
.eds-i a:focus-visible,.card a:focus-visible{outline-offset:3px}
@media(max-width:1040px){.leadgrid{grid-template-columns:minmax(0,1.2fr) minmax(0,1fr)}.leadside{grid-template-columns:1fr}.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.grid .card:nth-child(9n+1){grid-column:auto}.grid .card:nth-child(9n+1) .cardmedia{aspect-ratio:16/10}}
@media(max-width:760px){main{padding-left:16px;padding-right:16px}.intro--hero{min-height:500px;border-radius:0 0 15px 15px;padding:28px 19px;grid-template-columns:1fr;gap:15px}.intro--hero .intro-side{padding:14px}.intro--hero h1{font-size:clamp(36px,9vw,58px)}.intro--hero .hero-tags{display:none}.leadgrid{grid-template-columns:1fr;gap:15px;padding:20px 0}.leadside{grid-template-columns:repeat(2,minmax(0,1fr))}.grid{gap:12px}.cardtitle{font-size:19px}.card--lead .cardtitle{font-size:clamp(27px,6vw,38px)}.leadside .cardtitle{font-size:16px}.cardmeta{font-size:10px;margin:12px 13px 8px}.cardtitle{margin-left:13px;margin-right:13px}.cardsum{margin-left:13px;margin-right:13px;font-size:13px}.more{margin-left:13px;margin-right:13px}.leadside .cardsum{display:none}.eds-img{width:44px;height:44px}}
@media(max-width:520px){.grid{grid-template-columns:1fr}.grid .card{display:grid;grid-template-columns:126px minmax(0,1fr);grid-template-rows:auto auto 1fr;gap:0 12px;padding:0 12px 0 0;min-height:132px}.grid .card .cardmedia{grid-row:1/5;grid-column:1;aspect-ratio:auto!important;width:126px;height:100%;min-height:132px;border-radius:0}.grid .card .cardmeta{grid-column:2;margin:10px 0 4px;font-size:9px}.grid .card .cardtitle{grid-column:2;margin:0;font-size:16px;line-height:1.23}.grid .card .cardsum{display:none}.grid .card .more{grid-column:2;margin:7px 0 10px;font-size:10px}.leadside{grid-template-columns:1fr}.leadside .card{display:grid;grid-template-columns:120px minmax(0,1fr);grid-template-rows:auto auto 1fr;gap:0 10px;min-height:125px;padding:0 10px 0 0}.leadside .card .cardmedia{grid-row:1/5;grid-column:1;width:120px;height:100%;min-height:125px;aspect-ratio:auto!important}.leadside .card .cardmeta{grid-column:2;margin:10px 0 4px;font-size:9px}.leadside .card .cardtitle{grid-column:2;margin:0;font-size:16px}.leadside .card .more{grid-column:2;margin:6px 0 10px;font-size:10px}.band{padding:25px 0 20px}.bandhead h2{font-size:26px}}
@media(prefers-reduced-motion:reduce){.card,.cardmedia img,.eds-img{transition:none}.card:hover,.card:hover img{transform:none}}
@media print{.card{box-shadow:none;break-inside:avoid}.intro--hero{min-height:250px}.eds{display:none}}


`;
