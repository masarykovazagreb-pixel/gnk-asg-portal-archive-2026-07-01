/**
 * GNK ASG — API za mobilnu aplikaciju
 *
 * Zamjena za objave-api.php i messages-api.php. Isporucene PHP datoteke ne mogu
 * raditi na gnk-asg.hr jer portal stoji na Cloudflare Workerima, gdje se PHP ne
 * izvrsava. Ovdje je isti protokol, ali na infrastrukturi koju portal vec ima.
 *
 * Rute
 *   POST   /api/objave/login          { user, password }        -> { ok, token }
 *   POST   /api/objave                { category,title,body,image }  (token)
 *   GET    /api/objave?limit&category                            (javno)
 *   DELETE /api/objave?id                                        (token)
 *   GET    /api/messages?limit | ?since                          (token)
 *   POST   /api/messages              { author, text }           (token)
 *   DELETE /api/messages?id                                      (token)
 *
 * Pohrana: KV prostor GNK_ASG_KV. Poruke i objave drze se u jednom zapisu po
 * vrsti, s granicom od 500 odnosno 300 stavki — isto kao PHP inacica, samo bez
 * datoteke na disku.
 *
 * Tajne (wrangler secret put):
 *   GNK_ADMIN_USER      korisnicko ime
 *   GNK_ADMIN_HASH      SHA-256 lozinke u hex zapisu
 *   GNK_TOKEN_SECRET    dugacak slucajan niz, isti za objave i poruke
 */

const KLJUC_PORUKE = 'app:messages:v1';
const KLJUC_OBJAVE = 'app:objave:v1';
const NAJVISE_PORUKA = 500;
const NAJVISE_OBJAVA = 300;
const TRAJANJE_TOKENA = 30 * 24 * 60 * 60 * 1000;   // 30 dana
const NAJVECA_PORUKA = 2000;
const NAJVECA_SLIKA = 8 * 1024 * 1024;

// ── pomoc ────────────────────────────────────────────────────────────
const enc = new TextEncoder();

function odgovor(tijelo, status = 200, dodatna = {}) {
  return new Response(JSON.stringify(tijelo), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'authorization, content-type',
      'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
      ...dodatna,
    },
  });
}

const greska = (poruka, status = 400) => odgovor({ ok: false, error: poruka }, status);

async function sha256hex(tekst) {
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(tekst));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function b64url(bajtovi) {
  let s = btoa(String.fromCharCode(...new Uint8Array(bajtovi)));
  return s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function potpisi(podatak, tajna) {
  const kljuc = await crypto.subtle.importKey(
    'raw', enc.encode(tajna), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  return b64url(await crypto.subtle.sign('HMAC', kljuc, enc.encode(podatak)));
}

async function napraviToken(korisnik, tajna) {
  const tijelo = b64url(enc.encode(JSON.stringify({ u: korisnik, e: Date.now() + TRAJANJE_TOKENA })));
  return `${tijelo}.${await potpisi(tijelo, tajna)}`;
}

async function provjeriToken(zaglavlje, tajna) {
  if (!zaglavlje || !zaglavlje.startsWith('Bearer ')) return null;
  const [tijelo, potpis] = zaglavlje.slice(7).trim().split('.');
  if (!tijelo || !potpis) return null;
  if (await potpisi(tijelo, tajna) !== potpis) return null;      // krivotvoren
  try {
    const p = JSON.parse(atob(tijelo.replace(/-/g, '+').replace(/_/g, '/')));
    if (!p.e || p.e < Date.now()) return null;                    // istekao
    return p.u || 'admin';
  } catch { return null; }
}

async function citaj(env, kljuc) {
  const s = await env.GNK_ASG_KV.get(kljuc);
  if (!s) return [];
  try { const d = JSON.parse(s); return Array.isArray(d) ? d : []; } catch { return []; }
}

const pisi = (env, kljuc, popis) => env.GNK_ASG_KV.put(kljuc, JSON.stringify(popis));

const id = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function ocisti(t, granica) {
  return String(t == null ? '' : t).replace(/\u0000/g, '').trim().slice(0, granica);
}

function slug(naslov) {
  return naslov.toLowerCase()
    .replace(/[čć]/g, 'c').replace(/[ž]/g, 'z').replace(/[š]/g, 's').replace(/[đ]/g, 'd')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'objava';
}

// ── objave ───────────────────────────────────────────────────────────
async function rutaObjave(request, env, url, korisnik) {
  const metoda = request.method;

  if (metoda === 'GET') {
    // Citanje je javno, kao i u PHP inacici.
    const popis = await citaj(env, KLJUC_OBJAVE);
    const kategorija = url.searchParams.get('category');
    const granica = Math.min(parseInt(url.searchParams.get('limit') || '40', 10) || 40, 200);
    const stavke = popis
      .filter((x) => !kategorija || x.category === kategorija)
      .slice(0, granica);
    return odgovor({ ok: true, items: stavke });
  }

  if (!korisnik) return greska('Prijava je potrebna.', 401);

  if (metoda === 'POST') {
    let t;
    try { t = await request.json(); } catch { return greska('Neispravan JSON.'); }
    const kategorija = t.category === 'komentari' ? 'komentari' : 'objave';
    const naslov = ocisti(t.title, 200);
    const tekst = ocisti(t.body, 40000);
    if (!naslov) return greska('Naslov je obavezan.');
    if (!tekst) return greska('Tekst je obavezan.');
    if (t.image && String(t.image).length > NAJVECA_SLIKA) {
      return greska('Slika je veca od 8 MB.', 413);
    }

    const stavka = {
      id: id(),
      category: kategorija,
      title: naslov,
      body: tekst,
      slug: slug(naslov),
      url: `https://gnk-asg.hr/${kategorija}/${slug(naslov)}/`,
      image: t.image ? String(t.image).slice(0, NAJVECA_SLIKA) : '',
      author: korisnik,
      at: Date.now(),
    };
    const popis = await citaj(env, KLJUC_OBJAVE);
    popis.unshift(stavka);
    await pisi(env, KLJUC_OBJAVE, popis.slice(0, NAJVISE_OBJAVA));
    // Sama stranica na portalu nastaje kroz urednicki proces, ne odavde —
    // aplikacija zapisuje nacrt, objava ostaje urednicka odluka.
    return odgovor({ ok: true, id: stavka.id, url: stavka.url, image: !!stavka.image });
  }

  if (metoda === 'DELETE') {
    const kojiId = url.searchParams.get('id');
    if (!kojiId) return greska('Nedostaje id.');
    const popis = await citaj(env, KLJUC_OBJAVE);
    const preostalo = popis.filter((x) => x.id !== kojiId);
    if (preostalo.length === popis.length) return greska('Zapis nije pronaden.', 404);
    await pisi(env, KLJUC_OBJAVE, preostalo);
    return odgovor({ ok: true });
  }

  return greska('Metoda nije podrzana.', 405);
}

// ── poruke ───────────────────────────────────────────────────────────
async function rutaPoruke(request, env, url, korisnik) {
  if (!korisnik) return greska('Prijava je potrebna.', 401);
  const metoda = request.method;
  const popis = await citaj(env, KLJUC_PORUKE);

  if (metoda === 'GET') {
    const odKada = parseInt(url.searchParams.get('since') || '0', 10) || 0;
    const granica = Math.min(parseInt(url.searchParams.get('limit') || '100', 10) || 100, 500);
    const stavke = (odKada ? popis.filter((x) => x.at > odKada) : popis).slice(0, granica);
    return odgovor({ ok: true, items: stavke, now: Date.now() });
  }

  if (metoda === 'POST') {
    let t;
    try { t = await request.json(); } catch { return greska('Neispravan JSON.'); }
    const autor = ocisti(t.author, 80) || korisnik;
    const tekst = ocisti(t.text, NAJVECA_PORUKA);
    if (!tekst) return greska('Poruka je prazna.');

    // Ista poruka istog autora unutar 10 sekundi ne udvostrucuje se —
    // aplikacija zna poslati dvaput kad mreza zapne.
    const zadnja = popis[0];
    if (zadnja && zadnja.author === autor && zadnja.text === tekst
        && Date.now() - zadnja.at < 10000) {
      return odgovor({ ok: true, item: zadnja, duplicate: true });
    }

    const stavka = { id: id(), author: autor, text: tekst, at: Date.now() };
    popis.unshift(stavka);
    await pisi(env, KLJUC_PORUKE, popis.slice(0, NAJVISE_PORUKA));
    return odgovor({ ok: true, item: stavka });
  }

  if (metoda === 'DELETE') {
    const kojiId = url.searchParams.get('id');
    if (!kojiId) return greska('Nedostaje id.');
    const preostalo = popis.filter((x) => x.id !== kojiId);
    if (preostalo.length === popis.length) return greska('Poruka nije pronadena.', 404);
    await pisi(env, KLJUC_PORUKE, preostalo);
    return odgovor({ ok: true });
  }

  return greska('Metoda nije podrzana.', 405);
}

// ── ulaz ─────────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const put = url.pathname.replace(/\/+$/, '') || '/';

    if (request.method === 'OPTIONS') return odgovor({ ok: true });

    const tajna = env.GNK_TOKEN_SECRET;
    if (!tajna) return greska('Posluzitelj nije postavljen: nedostaje GNK_TOKEN_SECRET.', 500);

    // prijava
    if (put === '/api/objave/login' && request.method === 'POST') {
      let t;
      try { t = await request.json(); } catch { return greska('Neispravan JSON.'); }
      const korisnik = ocisti(t.user, 80);
      const lozinka = String(t.password || '');
      if (!korisnik || !lozinka) return greska('Korisnik i lozinka su obavezni.');
      const ocekivaniKorisnik = env.GNK_ADMIN_USER || 'admin';
      const ocekivaniHash = env.GNK_ADMIN_HASH || '';
      if (!ocekivaniHash) {
        return greska('Posluzitelj nije postavljen: nedostaje GNK_ADMIN_HASH.', 500);
      }
      if (korisnik !== ocekivaniKorisnik || await sha256hex(lozinka) !== ocekivaniHash) {
        return greska('Neispravna prijava.', 401);
      }
      return odgovor({ ok: true, token: await napraviToken(korisnik, tajna) });
    }

    const korisnik = await provjeriToken(request.headers.get('authorization'), tajna);

    if (put === '/api/objave') return rutaObjave(request, env, url, korisnik);
    if (put === '/api/messages') return rutaPoruke(request, env, url, korisnik);

    // provjera zdravlja, bez tokena
    if (put === '/api/app-health') {
      return odgovor({
        ok: true,
        service: 'gnk-asg-app-api',
        routes: ['/api/objave/login', '/api/objave', '/api/messages'],
        configured: { secret: !!tajna, admin: !!env.GNK_ADMIN_HASH, kv: !!env.GNK_ASG_KV },
      });
    }

    return greska('Ruta ne postoji.', 404);
  },
};
