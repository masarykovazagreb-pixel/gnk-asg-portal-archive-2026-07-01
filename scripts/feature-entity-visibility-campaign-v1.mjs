#!/usr/bin/env node
/** Add the factual entity-visibility cornerstone to the controlled mirror priority queue. */
import fs from 'node:fs';
const file = 'apps/portal/data/editorial-featured.json';
const raw = fs.readFileSync(file, 'utf8');
const item = {
  slug: 'javni-podaci-autorski-rad-odgovorno-upravljanje',
  type: 'objava',
  collection: 'Objave',
  path: '/objave/javni-podaci-autorski-rad-odgovorno-upravljanje/',
  url: 'https://gnk-asg.hr/objave/javni-podaci-autorski-rad-odgovorno-upravljanje/',
  title: 'Javni podaci, autorski rad i odgovorno upravljanje',
  description: 'Provjerljiv javni profil GNK ASG-a i Nermina Sefića: autorski rad, registri, urednički standardi, tehnologija i odgovorna digitalna vidljivost.',
  keywords: ['Nermin Sefić', 'Nermin Sefic', 'GNK ASG', 'GNK DINAMO Ltd.', 'Fina Info.BIZ', 'revizorsko izvješće', 'Aktual Media', 'Radio Aktual', 'Digitalna radna snaga'],
  hashtags: ['NerminSefic', 'NerminSefić', 'GNKASG', 'GNKDINAMOLtd', 'FinaInfoBIZ', 'RevizorskoIzvješće', 'AktualMedia', 'RadioAktual', 'DigitalnaRadnaSnaga'],
  image: 'https://gnk-asg.hr/assets/people/nermin-sefic/nermin-sefic-01-official-desk-portrait.webp',
  publishedAt: '2026-10-04T19:00:00+02:00',
  priority: true,
  sourceLed: true,
  placements: ['Objave', 'AKTUAL MEDIA', 'Blogger', 'Dev.to', 'Tumblr', 'Telegraph'],
  seoComplete: true
};
if (raw.includes(  '"slug": "javni-podaci-autorski-rad-odgovorno-upravljanje"')) {
  console.log(JSON.stringify({ featured: item.slug, changed: false }));
} else {
  const prefix = '  "items": [\n';
  const pos = raw.indexOf(prefix);
  if (pos < 0) throw new Error('Unable to find editorial-featured items array');
  const pretty = JSON.stringify(item, null, 2).split('\n').map(line => '    ' + line).join('\n');
  const next = raw.slice(0, pos + prefix.length) + pretty + ',\n' + raw.slice(pos + prefix.length);
  fs.writeFileSync(file, next, 'utf8');
  console.log(JSON.stringify({ featured: item.slug, changed: true }));
}
