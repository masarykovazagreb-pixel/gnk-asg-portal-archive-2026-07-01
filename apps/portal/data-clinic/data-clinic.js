/*
 * GNK ASG Data Clinic — lokalna logika alata za CSV podatke.
 *
 * Svi alati rade nad tekstom koji korisnik unese ili učita s uređaja (FileReader).
 * Nema mrežnih poziva, nema local/session storagea, nema vanjskih biblioteka.
 * Rezultati prikazuju kategorije, brojeve i ISO datume, ali nikad ne vraćaju
 * pronađene e-mail adrese, IBAN-ove, brojeve kartica, telefone ni OIB-ove.
 *
 * Modul radi u pregledniku (window.GNKDataClinic) i u Node.js testovima (module.exports).
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module && module.exports) {
    module.exports = api;
  } else {
    root.GNKDataClinic = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* CSV parser (RFC 4180 uz navodnike; delimiter: , ; ili tab)          */
  /* ------------------------------------------------------------------ */

  function detectDelimiter(text) {
    var firstLine = String(text).split(/\r?\n/)[0] || '';
    var best = ',';
    var bestCount = -1;
    [',', ';', '\t'].forEach(function (d) {
      var count = 0;
      var inQuotes = false;
      for (var i = 0; i < firstLine.length; i++) {
        var ch = firstLine.charAt(i);
        if (ch === '"') inQuotes = !inQuotes;
        else if (!inQuotes && ch === d) count++;
      }
      if (count > bestCount) {
        best = d;
        bestCount = count;
      }
    });
    return best;
  }

  function parseCsv(text) {
    var source = String(text == null ? '' : text).replace(/^\uFEFF/, '');
    if (!source.trim()) return { ok: false, error: 'empty', headers: [], rows: [] };

    var delimiter = detectDelimiter(source);
    var records = [];
    var record = [];
    var field = '';
    var inQuotes = false;

    for (var i = 0; i < source.length; i++) {
      var ch = source.charAt(i);
      if (inQuotes) {
        if (ch === '"') {
          if (source.charAt(i + 1) === '"') {
            field += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          field += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        record.push(field);
        field = '';
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && source.charAt(i + 1) === '\n') i++;
        record.push(field);
        records.push(record);
        record = [];
        field = '';
      } else {
        field += ch;
      }
    }
    if (inQuotes) return { ok: false, error: 'unclosed_quote', headers: [], rows: [] };
    if (field !== '' || record.length) {
      record.push(field);
      records.push(record);
    }
    records = records.filter(function (r) {
      return !(r.length === 1 && r[0].trim() === '');
    });
    if (records.length === 0) return { ok: false, error: 'empty', headers: [], rows: [] };

    var headers = records[0].map(function (h) { return h.trim(); });
    var rows = records.slice(1).map(function (r) {
      var out = [];
      for (var c = 0; c < headers.length; c++) out.push(r[c] == null ? '' : r[c]);
      return out;
    });
    var ragged = records.slice(1).filter(function (r) { return r.length !== headers.length; }).length;
    return { ok: true, error: null, delimiter: delimiter, headers: headers, rows: rows, raggedRows: ragged };
  }

  function columnValues(parsed, index) {
    return parsed.rows.map(function (r) { return r[index]; });
  }

  /* ------------------------------------------------------------------ */
  /* Validatori osjetljivih obrazaca                                      */
  /* ------------------------------------------------------------------ */

  var EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  var IBAN_RE = /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/;
  var PHONE_RE = /^(\+|00)\d{1,3}[\s\/.-]?\(?\d{1,4}\)?([\s\/.-]?\d{2,4}){2,4}$/;

  function isValidIban(value) {
    var s = String(value).replace(/\s+/g, '').toUpperCase();
    if (!IBAN_RE.test(s) || s.length < 15 || s.length > 34) return false;
    var rearranged = s.slice(4) + s.slice(0, 4);
    var numeric = '';
    for (var i = 0; i < rearranged.length; i++) {
      var c = rearranged.charAt(i);
      numeric += /[A-Z]/.test(c) ? String(c.charCodeAt(0) - 55) : c;
    }
    var remainder = 0;
    for (var j = 0; j < numeric.length; j++) {
      remainder = (remainder * 10 + Number(numeric.charAt(j))) % 97;
    }
    return remainder === 1;
  }

  function passesLuhn(digits) {
    var sum = 0;
    var alt = false;
    for (var i = digits.length - 1; i >= 0; i--) {
      var n = digits.charCodeAt(i) - 48;
      if (alt) {
        n *= 2;
        if (n > 9) n -= 9;
      }
      sum += n;
      alt = !alt;
    }
    return sum % 10 === 0;
  }

  function isLikelyCardNumber(value) {
    var digits = String(value).replace(/[ -]/g, '');
    if (!/^\d{13,19}$/.test(digits)) return false;
    if (!/^[3-6]/.test(digits)) return false;
    if (/^(\d)\1+$/.test(digits)) return false;
    return passesLuhn(digits);
  }

  // OIB: 11 znamenki, kontrolna znamenka ISO 7064 (MOD 11,10).
  function isValidOib(value) {
    var s = String(value).trim();
    if (!/^\d{11}$/.test(s)) return false;
    var a = 10;
    for (var i = 0; i < 10; i++) {
      a = (a + Number(s.charAt(i))) % 10;
      if (a === 0) a = 10;
      a = (a * 2) % 11;
    }
    var control = 11 - a;
    if (control === 10) control = 0;
    return control === Number(s.charAt(10));
  }

  function looksLikePhone(value) {
    var s = String(value).trim();
    var digits = s.replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 15) return false;
    return PHONE_RE.test(s);
  }

  /* ------------------------------------------------------------------ */
  /* 1. CSV Privacy Inspector                                            */
  /* ------------------------------------------------------------------ */

  var PRIVACY_CATEGORIES = [
    { id: 'email', label: 'e-mail adrese', test: function (v) { return EMAIL_RE.test(v.trim()); } },
    { id: 'iban', label: 'IBAN (provjera kontrolne znamenke)', test: function (v) { return isValidIban(v); } },
    { id: 'card', label: 'brojevi kartica (Luhn)', test: function (v) { return isLikelyCardNumber(v); } },
    { id: 'oib', label: 'OIB (provjera kontrolne znamenke)', test: function (v) { return isValidOib(v); } },
    { id: 'phone', label: 'telefonski brojevi (nalikuje)', test: function (v) { return looksLikePhone(v); } }
  ];

  function inspectCsvPrivacy(text) {
    var parsed = parseCsv(text);
    if (!parsed.ok) return { ok: false, error: parsed.error, columns: [], totalFindings: 0 };

    var columns = parsed.headers.map(function (name, index) {
      var counts = {};
      PRIVACY_CATEGORIES.forEach(function (cat) { counts[cat.id] = 0; });
      columnValues(parsed, index).forEach(function (value) {
        var v = String(value || '').trim();
        if (!v) return;
        PRIVACY_CATEGORIES.forEach(function (cat) {
          if (cat.test(v)) counts[cat.id]++;
        });
      });
      var total = Object.keys(counts).reduce(function (s, k) { return s + counts[k]; }, 0);
      return { name: name, counts: counts, total: total };
    });

    return {
      ok: true,
      error: null,
      rows: parsed.rows.length,
      columns: columns,
      totalFindings: columns.reduce(function (s, c) { return s + c.total; }, 0),
      categories: PRIVACY_CATEGORIES.map(function (c) { return { id: c.id, label: c.label }; }),
      note: 'Prikazuju se samo nazivi stupaca i brojevi nalaza. Vrijednosti se ne prikazuju niti spremaju.'
    };
  }

  /* ------------------------------------------------------------------ */
  /* 2. Missing Data Explorer                                            */
  /* ------------------------------------------------------------------ */

  var MISSING_TOKENS = ['', 'null', 'NULL', 'NA', 'N/A', 'n/a', '-', '—'];

  function exploreMissingData(text) {
    var parsed = parseCsv(text);
    if (!parsed.ok) return { ok: false, error: parsed.error, columns: [] };
    var rowCount = parsed.rows.length;
    var columns = parsed.headers.map(function (name, index) {
      var empty = columnValues(parsed, index).filter(function (v) {
        return MISSING_TOKENS.indexOf(String(v == null ? '' : v).trim()) !== -1;
      }).length;
      return {
        name: name,
        empty: empty,
        rows: rowCount,
        share: rowCount ? Math.round((empty / rowCount) * 1000) / 10 : 0
      };
    });
    return { ok: true, error: null, rows: rowCount, columns: columns, raggedRows: parsed.raggedRows };
  }

  /* ------------------------------------------------------------------ */
  /* 3. Unit Consistency Checker                                         */
  /* ------------------------------------------------------------------ */

  var UNIT_MAP = {
    kg: 'kg', g: 'g', mg: 'mg', t: 't',
    m: 'm', cm: 'cm', mm: 'mm', km: 'km',
    eur: 'EUR', '€': 'EUR', kn: 'HRK', hrk: 'HRK', usd: 'USD', '$': 'USD',
    '%': '%',
    h: 'h', hr: 'h', sati: 'h', sat: 'h',
    min: 'min', minuta: 'min', minute: 'min',
    s: 's', sek: 's', sec: 's'
  };

  // Vraća jedinicu ili null ako vrijednost nije broj s oznakom ili samostalan broj.
  function unitOf(value) {
    var s = String(value == null ? '' : value).trim();
    if (!s) return null;
    var numeric = /^[-+]?\d[\d.,\s]*$/;
    if (numeric.test(s)) return '(bez jedinice)';
    var m = /^[-+]?\d[\d.,\s]*\s*([^\d\s.,]+)$/.exec(s);
    if (!m) return null;
    var token = m[1].toLowerCase();
    if (token === '%') return '%';
    if (token === '€') return 'EUR';
    if (token === '$') return 'USD';
    return UNIT_MAP[token] || '(nepoznata jedinica)';
  }

  function checkUnitConsistency(text) {
    var parsed = parseCsv(text);
    if (!parsed.ok) return { ok: false, error: parsed.error, columns: [] };
    var columns = parsed.headers.map(function (name, index) {
      var counts = {};
      var classified = 0;
      columnValues(parsed, index).forEach(function (value) {
        var unit = unitOf(value);
        if (unit === null) return;
        classified++;
        counts[unit] = (counts[unit] || 0) + 1;
      });
      var units = Object.keys(counts);
      return {
        name: name,
        classified: classified,
        units: units.map(function (u) { return { unit: u, count: counts[u] }; }),
        mixed: units.length > 1
      };
    });
    return {
      ok: true,
      error: null,
      columns: columns,
      mixedColumns: columns.filter(function (c) { return c.mixed; }).length,
      note: 'Alat ne mijenja podatke automatski. Odluku o pretvorbi donosi vlasnik skupa podataka.'
    };
  }

  /* ------------------------------------------------------------------ */
  /* 4. Date Format Normalizer                                           */
  /* ------------------------------------------------------------------ */

  function isoFromParts(y, m, d) {
    var date = new Date(Date.UTC(y, m - 1, d));
    if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
    return y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  }

  // status: iso (već ISO), normalized (jednoznačno pretvoreno), ambiguous (dd/mm ili mm/dd), invalid
  function normalizeDate(value) {
    var s = String(value == null ? '' : value).trim();
    if (!s) return { status: 'empty', iso: null };

    var iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (iso) {
      var v1 = isoFromParts(+iso[1], +iso[2], +iso[3]);
      return v1 ? { status: 'iso', iso: v1 } : { status: 'invalid', iso: null };
    }

    // Hrvatski i europski zapis: 9.10.2026. ili 9.10.2026 / 9. 10. 2026
    var hr = /^(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{4})\.?$/.exec(s);
    if (hr) {
      var v2 = isoFromParts(+hr[3], +hr[2], +hr[1]);
      return v2 ? { status: 'normalized', iso: v2 } : { status: 'invalid', iso: null };
    }

    // Kosa crta: može biti DD/MM/YYYY ili MM/DD/YYYY
    var slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
    if (slash) {
      var a = +slash[1];
      var b = +slash[2];
      var y = +slash[3];
      if (a > 12 && b <= 12) {
        var v3 = isoFromParts(y, b, a);
        return v3 ? { status: 'normalized', iso: v3 } : { status: 'invalid', iso: null };
      }
      if (b > 12 && a <= 12) {
        var v4 = isoFromParts(y, a, b);
        return v4 ? { status: 'normalized', iso: v4 } : { status: 'invalid', iso: null };
      }
      if (a <= 12 && b <= 12) return { status: 'ambiguous', iso: null };
      return { status: 'invalid', iso: null };
    }

    return { status: 'invalid', iso: null };
  }

  function normalizeDateColumn(text, columnName) {
    var parsed = parseCsv(text);
    if (!parsed.ok) return { ok: false, error: parsed.error };
    var index = parsed.headers.indexOf(columnName);
    if (index === -1) return { ok: false, error: 'column_not_found' };
    var summary = { iso: 0, normalized: 0, ambiguous: 0, invalid: 0, empty: 0 };
    var output = columnValues(parsed, index).map(function (value) {
      var r = normalizeDate(value);
      summary[r.status]++;
      return r;
    });
    return { ok: true, error: null, summary: summary, results: output };
  }

  /* ------------------------------------------------------------------ */
  /* 5. Data Contract Builder                                            */
  /* ------------------------------------------------------------------ */

  var CONTRACT_TYPES = ['string', 'number', 'integer', 'boolean', 'date'];
  var CLASSIFICATIONS = ['public', 'internal', 'confidential', 'personal_data'];
  var FIELD_NAME_RE = /^[a-z][a-z0-9_]{1,63}$/;

  // Ulaz: po jedno polje u retku, "naziv;tip;obavezno;klasifikacija" (zarez ili tab također prihvaćeni).
  function buildDataContract(definition) {
    var lines = String(definition == null ? '' : definition).split(/\r?\n/).filter(function (l) { return l.trim(); });
    if (lines.length === 0) return { ok: false, errors: [{ line: 0, error: 'empty' }], contract: null };

    var errors = [];
    var fields = [];
    var seen = {};

    lines.forEach(function (line, idx) {
      var parts = line.split(/[;,\t]/).map(function (p) { return p.trim(); });
      var lineNo = idx + 1;
      if (parts.length !== 4) {
        errors.push({ line: lineNo, error: 'expected_4_columns' });
        return;
      }
      var name = parts[0];
      var type = parts[1].toLowerCase();
      var required = parts[2].toLowerCase();
      var classification = parts[3].toLowerCase();

      if (!FIELD_NAME_RE.test(name)) errors.push({ line: lineNo, error: 'invalid_name' });
      if (CONTRACT_TYPES.indexOf(type) === -1) errors.push({ line: lineNo, error: 'unknown_type' });
      if (['da', 'ne', 'yes', 'no', 'true', 'false'].indexOf(required) === -1) errors.push({ line: lineNo, error: 'invalid_required_flag' });
      if (CLASSIFICATIONS.indexOf(classification) === -1) errors.push({ line: lineNo, error: 'unknown_classification' });
      if (seen[name]) errors.push({ line: lineNo, error: 'duplicate_name' });
      seen[name] = true;

      if (!errors.some(function (e) { return e.line === lineNo; })) {
        fields.push({
          name: name,
          type: type,
          required: required === 'da' || required === 'yes' || required === 'true',
          classification: classification
        });
      }
    });

    if (errors.length) return { ok: false, errors: errors, contract: null };

    return {
      ok: true,
      errors: [],
      contract: {
        contractVersion: '1.0',
        fields: fields,
        personalDataFields: fields.filter(function (f) { return f.classification === 'personal_data'; }).map(function (f) { return f.name; })
      }
    };
  }

  return {
    parseCsv: parseCsv,
    isValidIban: isValidIban,
    isValidOib: isValidOib,
    passesLuhn: passesLuhn,
    isLikelyCardNumber: isLikelyCardNumber,
    looksLikePhone: looksLikePhone,
    inspectCsvPrivacy: inspectCsvPrivacy,
    exploreMissingData: exploreMissingData,
    unitOf: unitOf,
    checkUnitConsistency: checkUnitConsistency,
    normalizeDate: normalizeDate,
    normalizeDateColumn: normalizeDateColumn,
    buildDataContract: buildDataContract,
    CONTRACT_TYPES: CONTRACT_TYPES,
    CLASSIFICATIONS: CLASSIFICATIONS
  };
});
