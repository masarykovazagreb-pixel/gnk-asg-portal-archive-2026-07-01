// GNK ASG — Laboratorij: 20 malih, provjerljivih alata. Čiste funkcije, bez mreže, bez pohrane, bez eval.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GNKLab = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';

  const DAY = 86400000;

  function num(v, name) {
    const s = String(v === undefined || v === null ? '' : v).trim().replace(/\s/g, '').replace(',', '.');
    if (!/^-?\d+(\.\d+)?$/.test(s)) throw new RangeError('Polje „' + name + '” mora biti broj.');
    return Number(s);
  }
  function int(v, name, min, max) {
    const n = num(v, name);
    if (!Number.isInteger(n) || n < min || n > max) throw new RangeError('Polje „' + name + '” mora biti cijeli broj od ' + min + ' do ' + max + '.');
    return n;
  }
  function round(n, dec) {
    const f = Math.pow(10, dec === undefined ? 2 : dec);
    return Math.round((n + Number.EPSILON) * f) / f;
  }
  function fmt(n, dec) {
    return round(n, dec).toFixed(dec === undefined ? 2 : dec).replace('.', ',');
  }
  function isoDate(v, name) {
    const s = String(v || '').trim();
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) throw new RangeError('Datum „' + name + '” mora biti u obliku GGGG-MM-DD.');
    const t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    const d = new Date(t);
    if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) {
      throw new RangeError('Datum „' + name + '” ne postoji.');
    }
    return t;
  }
  function ok(value, text) { return { ok: true, value: value, text: text }; }

  // Fiksni državni blagdani RH (bez pomičnih: Uskrs, Uskrsni ponedjeljak, Tijelovo).
  const HR_FIXED_HOLIDAYS = ['01-01', '01-06', '05-01', '05-30', '06-22', '08-05', '08-15', '11-01', '11-18', '12-25', '12-26'];

  const TOOLS = [
    {
      id: 'pdv-dodaj', group: 'Financije', name: 'Dodaj PDV',
      description: 'Bruto iznos iz neto iznosa. Zadana stopa je 25 %, opća stopa PDV-a u Hrvatskoj.',
      fields: [{ name: 'neto', label: 'Neto iznos (EUR)', default: '100' }, { name: 'stopa', label: 'Stopa PDV-a (%)', default: '25' }],
      run: (v) => {
        const n = num(v.neto, 'neto'); const s = num(v.stopa, 'stopa');
        if (s < 0) throw new RangeError('Stopa ne smije biti negativna.');
        const r = round(n * (1 + s / 100));
        return ok(r, 'Bruto: ' + fmt(r) + ' EUR');
      },
      example: { values: { neto: '100', stopa: '25' }, expect: 125 }
    },
    {
      id: 'pdv-skini', group: 'Financije', name: 'Skini PDV',
      description: 'Neto iznos iz bruto iznosa koji već uključuje PDV.',
      fields: [{ name: 'bruto', label: 'Bruto iznos (EUR)', default: '125' }, { name: 'stopa', label: 'Stopa PDV-a (%)', default: '25' }],
      run: (v) => {
        const b = num(v.bruto, 'bruto'); const s = num(v.stopa, 'stopa');
        if (s < 0) throw new RangeError('Stopa ne smije biti negativna.');
        const r = round(b / (1 + s / 100));
        return ok(r, 'Neto: ' + fmt(r) + ' EUR');
      },
      example: { values: { bruto: '125', stopa: '25' }, expect: 100 }
    },
    {
      id: 'promjena-postotka', group: 'Financije', name: 'Promjena u postotcima',
      description: 'Postotna promjena između dvije vrijednosti. Početna vrijednost ne smije biti nula.',
      fields: [{ name: 'pocetna', label: 'Početna vrijednost', default: '80' }, { name: 'nova', label: 'Nova vrijednost', default: '100' }],
      run: (v) => {
        const a = num(v.pocetna, 'početna'); const b = num(v.nova, 'nova');
        if (a === 0) throw new RangeError('Početna vrijednost ne smije biti nula.');
        const r = round((b - a) / Math.abs(a) * 100);
        return ok(r, 'Promjena: ' + fmt(r) + ' %');
      },
      example: { values: { pocetna: '80', nova: '100' }, expect: 25 }
    },
    {
      id: 'slozeni-rast', group: 'Financije', name: 'Složeni rast',
      description: 'Vrijednost ulaganja nakon godina uz godišnju stopu, uz pretpostavku da se kamata pripisuje jednom godišnje.',
      fields: [{ name: 'glavnica', label: 'Početni iznos (EUR)', default: '1000' }, { name: 'stopa', label: 'Godišnja stopa (%)', default: '5' }, { name: 'godine', label: 'Broj godina', default: '10' }],
      run: (v) => {
        const p = num(v.glavnica, 'početni iznos'); const r = num(v.stopa, 'stopa'); const y = int(v.godine, 'godine', 0, 100);
        const out = round(p * Math.pow(1 + r / 100, y));
        return ok(out, 'Nakon ' + y + ' god.: ' + fmt(out) + ' EUR');
      },
      example: { values: { glavnica: '1000', stopa: '5', godine: '10' }, expect: 1628.89 }
    },
    {
      id: 'anuitet', group: 'Financije', name: 'Mjesečna rata kredita',
      description: 'Anuitetna rata za kredit s fiksnom kamatom. Ne uključuje naknade ni osiguranje.',
      fields: [{ name: 'iznos', label: 'Iznos kredita (EUR)', default: '10000' }, { name: 'kamata', label: 'Godišnja kamata (%)', default: '6' }, { name: 'mjeseci', label: 'Broj mjeseci', default: '120' }],
      run: (v) => {
        const p = num(v.iznos, 'iznos'); const k = num(v.kamata, 'kamata'); const n = int(v.mjeseci, 'mjeseci', 1, 600);
        if (p <= 0) throw new RangeError('Iznos kredita mora biti veći od nule.');
        const r = k / 100 / 12;
        const rata = r === 0 ? p / n : p * r / (1 - Math.pow(1 + r, -n));
        return ok(round(rata), 'Mjesečna rata: ' + fmt(rata) + ' EUR');
      },
      example: { values: { iznos: '10000', kamata: '6', mjeseci: '120' }, expect: 111.02 }
    },
    {
      id: 'dani-izmedu', group: 'Vrijeme', name: 'Dani između datuma',
      description: 'Broj kalendarskih dana između dva datuma (GGGG-MM-DD).',
      fields: [{ name: 'od', label: 'Od', default: '2026-10-01', type: 'date' }, { name: 'do', label: 'Do', default: '2026-10-09', type: 'date' }],
      run: (v) => {
        const a = isoDate(v.od, 'od'); const b = isoDate(v.do, 'do');
        const d = Math.round((b - a) / DAY);
        return ok(d, 'Kalendarskih dana: ' + d);
      },
      example: { values: { od: '2026-10-01', do: '2026-10-09' }, expect: 8 }
    },
    {
      id: 'radni-dani', group: 'Vrijeme', name: 'Radni dani',
      description: 'Radni dani (ponedjeljak do petak) od prvog do zadnjeg datuma, uključivo. Isključuje fiksne državne blagdane. Pomični blagdani (Uskrs, Uskrsni ponedjeljak, Tijelovo) nisu uključeni.',
      fields: [{ name: 'od', label: 'Od', default: '2026-10-05', type: 'date' }, { name: 'do', label: 'Do', default: '2026-10-09', type: 'date' }],
      run: (v) => {
        let a = isoDate(v.od, 'od'); const b = isoDate(v.do, 'do');
        if (b < a) throw new RangeError('Datum „do” mora biti jednak ili nakon datuma „od”.');
        let count = 0; let holidays = 0;
        for (let t = a; t <= b; t += DAY) {
          const d = new Date(t); const wd = d.getUTCDay();
          const mmdd = String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
          if (wd === 0 || wd === 6) continue;
          if (HR_FIXED_HOLIDAYS.includes(mmdd)) { holidays++; continue; }
          count++;
        }
        return ok(count, 'Radnih dana: ' + count + (holidays ? ' (isključeno blagdana: ' + holidays + ')' : ''));
      },
      example: { values: { od: '2026-10-05', do: '2026-10-09' }, expect: 5 }
    },
    {
      id: 'prosjek', group: 'Statistika', name: 'Aritmetička sredina',
      description: 'Prosjek brojeva odvojenih razmakom ili točkom-zarezom. Decimalni zarez je dopušten.',
      fields: [{ name: 'brojevi', label: 'Brojevi', default: '2 4 6' }],
      run: (v) => {
        const xs = parse(v.brojevi);
        const m = xs.reduce((s, x) => s + x, 0) / xs.length;
        return ok(round(m, 4), 'Prosjek (' + xs.length + ' vrijednosti): ' + fmt(m));
      },
      example: { values: { brojevi: '2 4 6' }, expect: 4 }
    },
    {
      id: 'medijan', group: 'Statistika', name: 'Medijan',
      description: 'Srednja vrijednost sortiranog niza. Za paran broj vrijednosti vraća prosjek dviju srednjih.',
      fields: [{ name: 'brojevi', label: 'Brojevi', default: '3 1 4 1 5' }],
      run: (v) => {
        const xs = parse(v.brojevi).sort((a, b) => a - b);
        const n = xs.length; const m = n % 2 ? xs[(n - 1) / 2] : (xs[n / 2 - 1] + xs[n / 2]) / 2;
        return ok(round(m, 4), 'Medijan (' + n + ' vrijednosti): ' + fmt(m));
      },
      example: { values: { brojevi: '3 1 4 1 5' }, expect: 3 }
    },
    {
      id: 'standardna-devijacija', group: 'Statistika', name: 'Standardna devijacija (uzorak)',
      description: 'Uzoračka standardna devijacija (n − 1). Potrebne su najmanje dvije vrijednosti.',
      fields: [{ name: 'brojevi', label: 'Brojevi', default: '2 4 4 4 5 5 7 9' }],
      run: (v) => {
        const xs = parse(v.brojevi);
        if (xs.length < 2) throw new RangeError('Potrebne su najmanje dvije vrijednosti.');
        const m = xs.reduce((s, x) => s + x, 0) / xs.length;
        const sd = Math.sqrt(xs.reduce((s, x) => s + (x - m) * (x - m), 0) / (xs.length - 1));
        return ok(round(sd, 4), 'Standardna devijacija: ' + fmt(sd));
      },
      example: { values: { brojevi: '2 4 4 4 5 5 7 9' }, expect: 2.1381 }
    },
    {
      id: 'udio-postotak', group: 'Statistika', name: 'Udio u ukupnom',
      description: 'Postotak dijela u ukupnom iznosu.',
      fields: [{ name: 'dio', label: 'Dio', default: '25' }, { name: 'ukupno', label: 'Ukupno', default: '200' }],
      run: (v) => {
        const d = num(v.dio, 'dio'); const t = num(v.ukupno, 'ukupno');
        if (t === 0) throw new RangeError('Ukupno ne smije biti nula.');
        const r = round(d / t * 100);
        return ok(r, 'Udio: ' + fmt(r) + ' %');
      },
      example: { values: { dio: '25', ukupno: '200' }, expect: 12.5 }
    },
    {
      id: 'km-milje', group: 'Pretvorbe', name: 'Kilometri u milje',
      description: 'Pretvorba kilometara u milje (1 km = 0,621371 mi).',
      fields: [{ name: 'km', label: 'Kilometri', default: '10' }],
      run: (v) => { const r = round(num(v.km, 'km') * 0.621371, 4); return ok(r, fmt(r) + ' mi'); },
      example: { values: { km: '10' }, expect: 6.2137 }
    },
    {
      id: 'kg-funte', group: 'Pretvorbe', name: 'Kilogrami u funte',
      description: 'Pretvorba kilograma u funte (1 kg = 2,20462 lb).',
      fields: [{ name: 'kg', label: 'Kilogrami', default: '100' }],
      run: (v) => { const r = round(num(v.kg, 'kg') * 2.20462, 4); return ok(r, fmt(r) + ' lb'); },
      example: { values: { kg: '100' }, expect: 220.462 }
    },
    {
      id: 'celzij-fahrenheit', group: 'Pretvorbe', name: 'Celzij u Fahrenheit',
      description: 'Pretvorba temperature iz stupnjeva Celzija u Fahrenheit.',
      fields: [{ name: 'c', label: 'Stupnjevi Celzija', default: '100' }],
      run: (v) => { const r = round(num(v.c, 'temperatura') * 9 / 5 + 32); return ok(r, fmt(r) + ' °F'); },
      example: { values: { c: '100' }, expect: 212 }
    },
    {
      id: 'hex-rgb', group: 'Pretvorbe', name: 'Heksadecimalna boja u RGB',
      description: 'Pretvorba boje iz oblika #RRGGBB ili #RGB u vrijednosti RGB.',
      fields: [{ name: 'hex', label: 'Boja', default: '#07162d' }],
      run: (v) => {
        let s = String(v.hex || '').trim().replace(/^#/, '');
        if (/^[0-9a-fA-F]{3}$/.test(s)) s = s.split('').map((c) => c + c).join('');
        if (!/^[0-9a-fA-F]{6}$/.test(s)) throw new RangeError('Boja mora biti u obliku #RRGGBB ili #RGB.');
        const r = parseInt(s.slice(0, 2), 16); const g = parseInt(s.slice(2, 4), 16); const b = parseInt(s.slice(4, 6), 16);
        return ok({ r: r, g: g, b: b }, 'rgb(' + r + ', ' + g + ', ' + b + ')');
      },
      example: { values: { hex: '#07162d' }, expect: { r: 7, g: 22, b: 45 } }
    },
    {
      id: 'rimski-brojevi', group: 'Tekst i SEO', name: 'Rimski brojevi',
      description: 'Pretvorba cijelog broja od 1 do 3999 u rimske brojke.',
      fields: [{ name: 'broj', label: 'Broj (1–3999)', default: '1994' }],
      run: (v) => {
        let n = int(v.broj, 'broj', 1, 3999);
        const map = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
        let out = '';
        for (const [val, sym] of map) while (n >= val) { out += sym; n -= val; }
        return ok(out, out);
      },
      example: { values: { broj: '1994' }, expect: 'MCMXCIV' }
    },
    {
      id: 'url-slug', group: 'Tekst i SEO', name: 'URL slug',
      description: 'Pretvara naslov u URL-prijateljski oblik. Hrvatski znakovi se zamjenjuju osnovnim slovima (č, ć → c; š → s; ž → z; đ → d).',
      fields: [{ name: 'naslov', label: 'Naslov', default: 'Tvornica ideja: nacrti 2026!' }],
      run: (v) => {
        const src = String(v.naslov || '');
        if (!src.trim()) throw new RangeError('Unesite naslov.');
        const s = src.toLowerCase().replace(/[čć]/g, 'c').replace(/š/g, 's').replace(/ž/g, 'z').replace(/đ/g, 'd')
          .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        if (!s) throw new RangeError('Naslov ne sadrži slova ni brojke.');
        return ok(s, s);
      },
      example: { values: { naslov: 'Tvornica ideja: nacrti 2026!' }, expect: 'tvornica-ideja-nacrti-2026' }
    },
    {
      id: 'duljina-meta', group: 'Tekst i SEO', name: 'Duljina naslova i meta opisa',
      description: 'Provjera duljine SEO naslova (do 60 znakova) i meta opisa (120 do 160 znakova). Hashtagovi u naslovu i opisu se označavaju.',
      fields: [{ name: 'naslov', label: 'SEO naslov', default: 'Tvornica ideja | GNK ASG' }, { name: 'opis', label: 'Meta opis', default: 'Nacrti poboljšanja za portal s ocjenama, pretragom i poveznicama na stranice. Nacrti nisu odobreni.' }],
      run: (v) => {
        const t = String(v.naslov || '').trim(); const d = String(v.opis || '').trim();
        const tl = [...t].length; const dl = [...d].length;
        const tOk = tl > 0 && tl <= 60; const dOk = dl >= 120 && dl <= 160;
        const hash = /#\S/.test(t) || /#\S/.test(d);
        const value = { titleLength: tl, descriptionLength: dl, titleOk: tOk, descriptionOk: dOk, hashtagInMeta: hash };
        const parts = ['Naslov: ' + tl + ' znakova ' + (tOk ? '(u redu)' : '(izvan 1–60)'),
          'Opis: ' + dl + ' znakova ' + (dOk ? '(u redu)' : '(izvan 120–160)')];
        if (hash) parts.push('Upozorenje: hashtag u naslovu ili opisu nije dopušten.');
        return ok(value, parts.join('. ') + '.');
      },
      example: { values: { naslov: 'Tvornica ideja | GNK ASG', opis: 'x'.repeat(130) }, expect: { titleOk: true, descriptionOk: true } }
    },
    {
      id: 'brojac-hashtagova', group: 'Tekst i SEO', name: 'Brojač hashtagova',
      description: 'Broji različite hashtagove u tekstu i provjerava pravilo 5 do 10 vidljivih hashtagova. Javlja ponavljanje imena i entiteta, što je zabranjeno.',
      fields: [{ name: 'tekst', label: 'Tekst', default: '#Analiza #Poslovanje #Tehnologija #Podaci #Komentar #GNKASG' }],
      run: (v) => {
        const raw = String(v.tekst || '').match(/#[\p{L}\p{N}_]+/gu) || [];
        const seen = new Map();
        for (const h of raw) { const k = h.slice(1).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); if (!seen.has(k)) seen.set(k, h); }
        const tags = [...seen.values()];
        const nameRepeat = tags.filter((h) => /nermin|sefic/i.test(h.normalize('NFKD').replace(/[\u0300-\u036f]/g, ''))).length;
        const inRange = tags.length >= 5 && tags.length <= 10;
        const value = { count: tags.length, duplicatesRemoved: raw.length - tags.length, inRange: inRange, nameRepeats: nameRepeat };
        const msg = ['Različitih hashtagova: ' + tags.length + (inRange ? ' (u skladu s pravilom 5–10)' : ' (izvan raspona 5–10)')];
        if (value.duplicatesRemoved) msg.push('Ponovljenih: ' + value.duplicatesRemoved);
        if (nameRepeat) msg.push('Upozorenje: ime osobe ponovljeno kao hashtag (' + nameRepeat + ').');
        return ok(value, msg.join('. ') + '.');
      },
      example: { values: { tekst: '#Analiza #analiza #Podaci #Tehnologija #Financije #Tržište' }, expect: { count: 5, inRange: true } }
    },
    {
      id: 'base64-utf8', group: 'Tehnički', name: 'Base64 (UTF-8)',
      description: 'Kodiranje i dekodiranje teksta u Base64 s UTF-8 znakovima. Radi u pregledniku.',
      fields: [
        { name: 'nacin', label: 'Način', default: 'encode', type: 'select', options: [['encode', 'Kodiraj'], ['decode', 'Dekodiraj']] },
        { name: 'tekst', label: 'Tekst', default: 'Zagreb' }
      ],
      run: (v) => {
        const src = String(v.tekst || '');
        if (v.nacin === 'decode') {
          let bin;
          try { bin = atob(src.trim()); } catch (e) { throw new RangeError('Ulaz nije valjan Base64 zapis.'); }
          const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
          const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
          return ok(text, text);
        }
        if (v.nacin !== 'encode') throw new RangeError('Nepoznat način.');
        const bytes = new TextEncoder().encode(src);
        let bin = ''; for (const b of bytes) bin += String.fromCharCode(b);
        const out = btoa(bin);
        return ok(out, out);
      },
      example: { values: { nacin: 'encode', tekst: 'Zagreb' }, expect: 'WmFncmVi' }
    }
  ];

  function parse(v) {
    const parts = String(v || '').split(/[\s;]+/).filter(Boolean);
    if (!parts.length) throw new RangeError('Unesite barem jedan broj.');
    return parts.map((p) => num(p, 'broj'));
  }

  function byId(id) { return TOOLS.find((t) => t.id === id) || null; }

  function run(id, values) {
    const t = byId(id);
    if (!t) return { ok: false, error: 'Nepoznat alat.' };
    try { return t.run(values || {}); } catch (e) { return { ok: false, error: e.message }; }
  }

  return { TOOLS, byId, run, num, fmt, round, HR_FIXED_HOLIDAYS };
});
