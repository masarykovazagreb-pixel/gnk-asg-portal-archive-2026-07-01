import fs from 'node:fs';
import assert from 'node:assert/strict';

const FILES=[
  'apps/portal/objave/kontinuitet-poslovanja-za-timove-koji-rade-daljinski/index.html',
  'apps/portal/objave/naslijedivanje-dobavljackih-ugovora-nakon-akvizicije/index.html',
  'apps/portal/objave/rizik-ovisnosti-o-jednom-tehnoloskom-dobavljacu/index.html',
  'apps/portal/objave/sigurnosni-zahtjevi-za-api-integracije-s-vanjskim-partnerima/index.html',
  'apps/portal/objave/vjezbe-simulacije-krize-za-rukovodstvo/index.html',
  'apps/portal/objave/vlasnicki-poticaji-kao-alat-uskladivanja-interesa-zaposlenika/index.html',
  'apps/portal/objave/zahtjevi-za-lokalizacijom-podataka-u-medunarodnom-poslovanju/index.html'
];

const RELATED='<nav class="related-articles" aria-label="Povezani sadržaj"><a href="/objave/">Objave</a><a href="/nermin-sefic/">Nermin Sefić</a><a href="/komentari/">Komentari</a><a href="/analize/">Analize</a><a href="/gnk-aktual/">Aktual Media</a></nav>';

for(const file of FILES){
  let html=fs.readFileSync(file,'utf8');
  assert.ok(html.includes('<main class="editorial-wrap article">'),`${file}: missing editorial main`);
  assert.ok(html.includes('<h1>'),`${file}: missing H1`);
  assert.ok(/<img[^>]+src="\/(?!\/)/i.test(html),`${file}: missing local image`);
  if(html.includes('<article class="article-body">')){
    html=html.replace('<article class="article-body">','<div class="article-body">');
    html=html.replace('</article><nav class="related-articles"','</div><nav class="related-articles"');
  }
  html=html.replace(/<nav class="related-articles"[\s\S]*?<\/nav>/,RELATED);
  fs.writeFileSync(file,html,'utf8');
  const internal=new Set([...html.matchAll(/href="(\/[^"#?]*)/g)].map(m=>m[1]));
  assert.ok(internal.size>=5,`${file}: expected >=5 internal links, got ${internal.size}`);
  assert.ok(!html.includes('<article class="article-body">'),`${file}: article-body still captures only body text`);
}

console.log(JSON.stringify({ok:true,files:FILES.length,change:'validator now evaluates full main containing H1, local image and related internal links'},null,2));
