/**
 * Worker: gnk-asg-image-proxy
 *
 * Svrha: drži Pexels ključ na serveru, nikad u pregledniku ni u repozitoriju.
 * Stranica zove ovu adresu (/api/slike?upit=...), Worker zove Pexels sa
 * secretom koji sam drži, i vraća samo ono što je potrebno: url, autora,
 * poveznicu na izvor i licencu. Isti obrazac kao SMTP i Blogger tajne
 * koje već postoje u ovom repozitoriju.
 *
 * NAPOMENA O OPSEGU: ova datoteka je pripremljena kao staging artefakt.
 * NIJE deployana, ruta NIJE registrirana u Cloudflare zoni, wrangler.toml
 * za ovaj Worker NE POSTOJI još. To su tri odvojena koraka koja netko mora
 * svjesno odobriti i pokrenuti - deploy i promjena infrastrukture su
 * izvan trenutnog odobrenja za ovaj rad.
 *
 * KAKO KLJUČ ULAZI OVDJE, KAD SE ODOBRI DEPLOY:
 *   wrangler secret put PEXELS_API_KEY --name gnk-asg-image-proxy
 * Ključ se nikad ne piše u ovu datoteku niti u wrangler.toml.
 * Ključ koji je prošao kroz razgovor treba poništiti u Pexels panelu
 * (pexels.com/api) i zamijeniti novim prije nego što uopće uđe u secret -
 * ništa što je bilo u čavrljanju ne treba ostati trajno aktivno.
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS - samo s naše domene, ne sa svakog izvora
    const dopusteni = ['https://gnk-asg.hr', 'https://www.gnk-asg.hr'];
    const podrijetlo = request.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': dopusteni.includes(podrijetlo) ? podrijetlo : dopusteni[0],
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'public, max-age=3600',   // sat vremena kesa - Pexels ima limit poziva
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }

    const upit = url.searchParams.get('upit');
    if (!upit) {
      return new Response(JSON.stringify({ greska: 'nedostaje parametar upit' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    if (!env.PEXELS_API_KEY) {
      return new Response(JSON.stringify({ greska: 'PEXELS_API_KEY nije postavljen kao secret' }),
        { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    // keš na razini Workera - isti upit u istom satu ne troši kvotu dvaput
    const kljucKesa = new Request(url.toString(), request);
    const kes = caches.default;
    let odgovor = await kes.match(kljucKesa);
    if (odgovor) return odgovor;

    try {
      const r = await fetch(
        'https://api.pexels.com/v1/search?query=' + encodeURIComponent(upit) + '&per_page=6',
        { headers: { Authorization: env.PEXELS_API_KEY } }
      );

      if (!r.ok) {
        return new Response(JSON.stringify({ greska: 'Pexels vratio status ' + r.status }),
          { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } });
      }

      const podaci = await r.json();
      const rezultat = (podaci.photos || []).map(p => ({
        url: p.src.large,
        licenca: 'Pexels licenca (besplatna, komercijalna upotreba, atribucija preporučena)',
        autor: p.photographer,
        izvor_poveznica: p.url,
      }));

      odgovor = new Response(JSON.stringify({ upit, rezultati: rezultat }),
        { headers: { ...cors, 'Content-Type': 'application/json' } });

      ctx.waitUntil(kes.put(kljucKesa, odgovor.clone()));
      return odgovor;

    } catch (e) {
      return new Response(JSON.stringify({ greska: 'neuspjeh poziva prema Pexelsu' }),
        { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } });
    }
  }
};
