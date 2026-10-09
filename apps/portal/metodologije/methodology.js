/*
 * GNK ASG — Javna knjižnica metodologija: izračuni.
 *
 * Svaka metoda ima istoimeni izračun ovdje. Katalog (opis, jedinice, ograničenja,
 * vlasnik, verzija) živi u ../data/methodology_catalog.json. Testovi provjeravaju
 * da se primjeri iz kataloga podudaraju s izračunom.
 *
 * Nema mrežnih poziva, nema spremanja unosa. Radi u pregledniku i u Node.js-u.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module && module.exports) {
    module.exports = api;
  } else {
    root.GNKMethodology = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function num(v, name) {
    var n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
    if (!isFinite(n)) throw new Error('invalid_number:' + name);
    return n;
  }
  function nonZero(v, name) {
    if (v === 0) throw new Error('division_by_zero:' + name);
    return v;
  }

  // Relativna luminancija po WCAG 2.x
  function luminanceFromHex(hex) {
    var h = String(hex).replace('#', '');
    if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error('invalid_hex');
    var channels = [0, 2, 4].map(function (i) {
      var c = parseInt(h.substr(i, 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  }

  var COMPUTE = {
    'revenue-growth': function (i) {
      var novi = num(i.prihod_novi, 'prihod_novi');
      var stari = nonZero(num(i.prihod_stari, 'prihod_stari'), 'prihod_stari');
      return ((novi / stari) - 1) * 100;
    },
    'roi': function (i) {
      var prihod = num(i.prihod_od_ulaganja, 'prihod_od_ulaganja');
      var ulaganje = nonZero(num(i.iznos_ulaganja, 'iznos_ulaganja'), 'iznos_ulaganja');
      return ((prihod - ulaganje) / ulaganje) * 100;
    },
    'profit-margin': function (i) {
      var prihod = nonZero(num(i.prihod, 'prihod'), 'prihod');
      return ((prihod - num(i.trosak, 'trosak')) / prihod) * 100;
    },
    'break-even': function (i) {
      var fiksni = num(i.fiksni_troskovi, 'fiksni_troskovi');
      var cijena = num(i.cijena_po_jedinici, 'cijena_po_jedinici');
      var varijabilni = num(i.varijabilni_trosak_po_jedinici, 'varijabilni_trosak_po_jedinici');
      var marza = nonZero(cijena - varijabilni, 'marza_po_jedinici');
      if (marza < 0) throw new Error('negative_contribution');
      return fiksni / marza;
    },
    'cash-runway': function (i) {
      var novac = num(i.novac, 'novac');
      var odljev = nonZero(num(i.mjesecni_odljev, 'mjesecni_odljev'), 'mjesecni_odljev');
      return novac / odljev;
    },
    'capacity-utilisation': function (i) {
      var iskoristeno = num(i.iskoristeni_kapacitet, 'iskoristeni_kapacitet');
      var raspolozivo = nonZero(num(i.raspolozivi_kapacitet, 'raspolozivi_kapacitet'), 'raspolozivi_kapacitet');
      return (iskoristeno / raspolozivo) * 100;
    },
    'availability': function (i) {
      var ukupno = nonZero(num(i.ukupno_minuta, 'ukupno_minuta'), 'ukupno_minuta');
      var prekid = num(i.prekid_minuta, 'prekid_minuta');
      if (prekid < 0 || prekid > ukupno) throw new Error('downtime_out_of_range');
      return ((ukupno - prekid) / ukupno) * 100;
    },
    'incident-rate': function (i) {
      var incidenti = num(i.incidenti, 'incidenti');
      var sati = nonZero(num(i.radni_sati, 'radni_sati'), 'radni_sati');
      return (incidenti / sati) * 1000;
    },
    'risk-matrix-score': function (i) {
      var v = num(i.vjerojatnost, 'vjerojatnost');
      var u = num(i.utjecaj, 'utjecaj');
      if (v < 1 || v > 5 || u < 1 || u > 5) throw new Error('scale_out_of_range');
      return v * u;
    },
    'recovery-gap': function (i) {
      var rto = num(i.rto_minute, 'rto_minute');
      var stvarno = num(i.stvarno_vrijeme_oporavka_minute, 'stvarno_vrijeme_oporavka_minute');
      return Math.max(0, stvarno - rto);
    },
    'energy-cost': function (i) {
      return num(i.kwh, 'kwh') * num(i.cijena_po_kwh_eur, 'cijena_po_kwh_eur');
    },
    'energy-emissions': function (i) {
      // Faktor se mora unijeti iz javnog, navedenog izvora (vidi ograničenje metode).
      return num(i.kwh, 'kwh') * num(i.faktor_kgco2e_po_kwh, 'faktor_kgco2e_po_kwh') / 1000;
    },
    'wcag-contrast': function (i) {
      var l1 = luminanceFromHex(i.boja_teksta_hex);
      var l2 = luminanceFromHex(i.boja_pozadine_hex);
      var hi = Math.max(l1, l2);
      var lo = Math.min(l1, l2);
      return (hi + 0.05) / (lo + 0.05);
    },
    'sample-size': function (i) {
      var z = num(i.z, 'z');
      var p = num(i.p, 'p');
      var e = nonZero(num(i.e, 'e'), 'e');
      if (p <= 0 || p >= 1) throw new Error('p_out_of_range');
      return Math.ceil((z * z * p * (1 - p)) / (e * e));
    },
    'conversion-rate': function (i) {
      var posjeti = nonZero(num(i.posjeti, 'posjeti'), 'posjeti');
      return (num(i.konverzije, 'konverzije') / posjeti) * 100;
    },
    'priority-score': function (i) {
      var utjecaj = num(i.utjecaj, 'utjecaj');
      var pouzdanost = num(i.pouzdanost, 'pouzdanost');
      var napor = nonZero(num(i.napor, 'napor'), 'napor');
      if (pouzdanost < 0 || pouzdanost > 1) throw new Error('confidence_out_of_range');
      return (utjecaj * pouzdanost) / napor;
    }
  };

  // Sigurno izvršavanje: vraća { ok, value } ili { ok:false, error } bez echo-a unosa.
  function calculate(methodId, inputs) {
    var fn = COMPUTE[methodId];
    if (!fn) return { ok: false, error: 'unknown_method' };
    try {
      return { ok: true, value: fn(inputs || {}) };
    } catch (e) {
      return { ok: false, error: String(e.message).split(':')[0] };
    }
  }

  function methodIds() {
    return Object.keys(COMPUTE);
  }

  return { calculate: calculate, methodIds: methodIds, luminanceFromHex: luminanceFromHex };
});
