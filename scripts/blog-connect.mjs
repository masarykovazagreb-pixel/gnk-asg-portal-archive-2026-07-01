#!/usr/bin/env node
/**
 * Spajanje bloga — jednokratno.
 *
 * Pretvara Google OAuth podatke u trajni token i provjeri da blog odgovara.
 * Pokreće se jednom, lokalno. Ništa se ne sprema u repozitorij.
 *
 *   node scripts/blog-connect.mjs
 *
 * Treba ti prije pokretanja:
 *   1. blog na blogger.com
 *   2. OAuth klijent tipa "Desktop app" iz Google Cloud Console,
 *      uz uključen Blogger API v3
 */
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const SCOPE = 'https://www.googleapis.com/auth/blogger';
const REDIRECT = 'urn:ietf:wg:oauth:2.0:oob';
const rl = createInterface({ input, output });

const ask = async (q) => (await rl.question(q)).trim();

console.log('\n=== Spajanje bloga na GNK ASG ===\n');

const clientId = await ask('OAuth Client ID: ');
const clientSecret = await ask('OAuth Client Secret: ');

if (!clientId || !clientSecret) {
  console.error('\nOba podatka su obavezna. Prekidam.');
  rl.close();
  process.exit(1);
}

const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
  client_id: clientId,
  redirect_uri: REDIRECT,
  response_type: 'code',
  scope: SCOPE,
  access_type: 'offline',
  prompt: 'consent',
});

console.log('\nOtvori ovu adresu u pregledniku, odobri pristup i prepiši kod koji dobiješ:\n');
console.log(authUrl + '\n');

const code = await ask('Kod s ekrana: ');

const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    code, client_id: clientId, client_secret: clientSecret,
    redirect_uri: REDIRECT, grant_type: 'authorization_code',
  }),
});

if (!tokenRes.ok) {
  console.error('\nNeuspjelo:', tokenRes.status, (await tokenRes.text()).slice(0, 300));
  rl.close();
  process.exit(1);
}

const { access_token, refresh_token } = await tokenRes.json();

if (!refresh_token) {
  console.error('\nGoogle nije vratio trajni token. Ponovi postupak — na ekranu odobrenja mora');
  console.error('pisati da je pristup nov. Ako si već odobrio ranije, opozovi pristup pa ponovi.');
  rl.close();
  process.exit(1);
}

/* provjera: koji blogovi postoje na ovom računu */
const blogsRes = await fetch('https://www.googleapis.com/blogger/v3/users/self/blogs', {
  headers: { authorization: `Bearer ${access_token}` },
});

console.log('\n--- BLOGOVI NA RAČUNU ---');
let blogId = '';
if (blogsRes.ok) {
  const { items = [] } = await blogsRes.json();
  if (!items.length) console.log('  Nema nijednog bloga. Otvori ga na blogger.com pa ponovi.');
  items.forEach((b, i) => {
    console.log(`  ${i + 1}. ${b.name}`);
    console.log(`     adresa: ${b.url}`);
    console.log(`     ID:     ${b.id}`);
    if (i === 0) blogId = b.id;
  });
} else {
  console.log('  Popis nije dohvaćen:', blogsRes.status);
}

console.log('\n=== UPIŠI OVO KAO TAJNE ===');
console.log('U GitHub: Settings > Secrets and variables > Actions > New repository secret.');
console.log('Isto upiši u OBA repozitorija — postojeći i onaj na koji prelazimo.\n');
console.log('  BLOGGER_BLOG_ID        ', blogId || '<ID s popisa gore>');
console.log('  BLOGGER_CLIENT_ID      ', clientId);
console.log('  BLOGGER_CLIENT_SECRET  ', clientSecret);
console.log('  BLOGGER_REFRESH_TOKEN  ', refresh_token);
console.log('\nTrajni token ne istječe. Ne šalji ga porukom i ne spremaj u repozitorij.\n');

rl.close();
