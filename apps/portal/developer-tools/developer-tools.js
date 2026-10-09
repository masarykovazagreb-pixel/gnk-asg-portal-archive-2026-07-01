/*
 * GNK ASG Developer Tools — lokalna logika alata.
 *
 * Sve funkcije rade isključivo nad tekstom koji korisnik unese u preglednik.
 * Nema mrežnih poziva, nema local/session storagea, nema vanjskih biblioteka.
 * Rezultati nikad ne vraćaju pronađene tajne, e-mail adrese ili brojeve kartica,
 * nego samo kategorije i broj nalaza.
 *
 * Modul radi i u pregledniku (window.GNKDeveloperTools) i u Node.js testovima (module.exports).
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module && module.exports) {
    module.exports = api;
  } else {
    root.GNKDeveloperTools = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SEVERITY_PENALTY = { critical: 50, high: 30, medium: 15, low: 5 };

  function clampScore(value) {
    return Math.max(0, Math.min(100, Math.round(value)));
  }

  function finding(id, severity, text) {
    return { id: id, severity: severity, text: text };
  }

  /* ------------------------------------------------------------------ */
  /* 1. URL Safety Inspector                                             */
  /* ------------------------------------------------------------------ */

  var IPV4_RE = /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;
  var SENSITIVE_HOST_WORDS = /(^|[.-])(login|verify|verification|secure|account|update|wallet|bank|signin|password)([.-]|$)/i;
  var EXECUTABLE_PATH_RE = /\.(exe|scr|apk|bat|cmd|msi|ps1|vbs|jar)$/i;

  function inspectUrl(input) {
    var raw = String(input == null ? '' : input).trim();
    if (!raw) {
      return { ok: false, error: 'empty', score: 0, findings: [] };
    }

    var url;
    try {
      url = new URL(raw);
    } catch (e) {
      return {
        ok: false,
        error: 'invalid_url',
        score: 0,
        findings: [finding('invalid-url', 'high', 'Unos nije valjan apsolutni URL (nedostaje shema, npr. https://).')]
      };
    }

    var findings = [];

    if (url.protocol === 'https:') {
      // ok
    } else if (url.protocol === 'http:') {
      findings.push(finding('not-https', 'high', 'URL koristi HTTP umjesto HTTPS, pa sadržaj može biti presretnut ili izmijenjen.'));
    } else {
      findings.push(finding('unusual-scheme', 'critical', 'URL koristi neuobičajenu shemu (' + url.protocol.replace(':', '') + ').'));
    }

    if (url.username || url.password) {
      // Vjerodajnice se ne ispisuju; samo se navodi postojanje.
      findings.push(finding('embedded-credentials', 'critical', 'URL sadrži korisničko ime ili zaporku u samom linku.'));
    }

    var host = url.hostname;
    if (IPV4_RE.test(host) || host.indexOf('[') === 0) {
      findings.push(finding('ip-host', 'medium', 'Poveznica koristi IP adresu umjesto domene.'));
    }

    if (host.indexOf('xn--') !== -1 || /(^|\.)xn--/.test(host)) {
      findings.push(finding('punycode', 'medium', 'Domena sadrži Punycode (xn--), što može sakriti slična slova. Provjerite pravopis domene.'));
    }

    var labels = host.split('.').filter(Boolean);
    if (labels.length - 2 > 3) {
      findings.push(finding('many-subdomains', 'low', 'Domena ima neuobičajeno mnogo poddomena (' + (labels.length - 2) + ').'));
    }

    if (url.port && url.port !== '443' && url.protocol === 'https:') {
      findings.push(finding('non-standard-port', 'low', 'HTTPS poveznica koristi nestandardni port.'));
    }

    if (SENSITIVE_HOST_WORDS.test(host)) {
      findings.push(finding('sensitive-keyword-host', 'medium', 'Domena sadrži riječi često povezane s prijavom ili računom. To nije dokaz prijevare, ali zahtijeva provjeru izvora.'));
    }

    if (EXECUTABLE_PATH_RE.test(url.pathname)) {
      findings.push(finding('executable-target', 'medium', 'Poveznica vodi na izvršnu ili skriptnu datoteku.'));
    }

    if (raw.length > 2048) {
      findings.push(finding('very-long-url', 'low', 'URL je vrlo dug (više od 2048 znakova).'));
    }

    if (url.pathname.indexOf('@') !== -1 || url.search.indexOf('@') !== -1) {
      findings.push(finding('at-sign-in-path', 'low', 'Znak @ nalazi se u putanji ili upitu, što može zbuniti korisnika o stvarnoj domeni.'));
    }

    var score = clampScore(100 - findings.reduce(function (sum, f) {
      return sum + (SEVERITY_PENALTY[f.severity] || 0);
    }, 0));

    return {
      ok: true,
      error: null,
      score: score,
      host: host,
      findings: findings,
      note: 'Ovo je formalna provjera oblika poveznice. Ne otvara URL i ne dokazuje da je sadržaj siguran.'
    };
  }

  /* ------------------------------------------------------------------ */
  /* 2. Security Header Studio                                           */
  /* ------------------------------------------------------------------ */

  var MIN_HSTS_AGE = 15552000; // 180 dana

  function parseHeaders(text) {
    var map = {};
    String(text == null ? '' : text).split(/\r?\n/).forEach(function (line) {
      var m = /^\s*([A-Za-z0-9-]+)\s*:\s*(.*?)\s*$/.exec(line);
      if (m) {
        var name = m[1].toLowerCase();
        if (!(name in map)) map[name] = m[2];
      }
    });
    return map;
  }

  function directiveMap(csp) {
    var out = {};
    String(csp).split(';').forEach(function (part) {
      var tokens = part.trim().split(/\s+/);
      if (tokens[0]) out[tokens[0].toLowerCase()] = tokens.slice(1);
    });
    return out;
  }

  function analyzeHeaders(text) {
    var headers = parseHeaders(text);
    if (Object.keys(headers).length === 0) {
      return { ok: false, error: 'no_headers', score: 0, findings: [] };
    }

    var findings = [];
    var score = 0;

    // CSP (30)
    var csp = headers['content-security-policy'];
    if (!csp) {
      findings.push(finding('csp-missing', 'high', 'Content-Security-Policy nedostaje.'));
    } else {
      var dirs = directiveMap(csp);
      var scriptSrc = dirs['script-src'] || dirs['default-src'] || [];
      if (/'unsafe-eval'/.test(csp)) {
        findings.push(finding('csp-unsafe-eval', 'critical', 'CSP sadrži \'unsafe-eval\', što omogućuje izvršavanje koda iz stringova.'));
        score += 0;
      } else {
        var base = 30;
        if (scriptSrc.indexOf("'unsafe-inline'") !== -1) {
          findings.push(finding('csp-unsafe-inline', 'medium', 'CSP dopušta inline skripte (\'unsafe-inline\'), što slabi zaštitu od XSS-a.'));
          base -= 10;
        }
        if (!dirs['object-src'] || dirs['object-src'].indexOf("'none'") === -1) {
          findings.push(finding('csp-object-src', 'low', 'CSP nema object-src \'none\'.'));
          base -= 3;
        }
        if (!dirs['frame-ancestors']) {
          findings.push(finding('csp-frame-ancestors', 'low', 'CSP nema frame-ancestors (zaštita od ugradnje u tuđi frame).'));
          base -= 3;
        }
        score += Math.max(0, base);
      }
    }

    // HSTS (20)
    var hsts = headers['strict-transport-security'];
    if (!hsts) {
      findings.push(finding('hsts-missing', 'high', 'Strict-Transport-Security nedostaje.'));
    } else {
      var ageMatch = /max-age\s*=\s*(\d+)/i.exec(hsts);
      var age = ageMatch ? parseInt(ageMatch[1], 10) : 0;
      var hstsPoints = 20;
      if (age < MIN_HSTS_AGE) {
        findings.push(finding('hsts-short', 'medium', 'HSTS max-age je kraći od 180 dana.'));
        hstsPoints -= 8;
      }
      if (!/includesubdomains/i.test(hsts)) {
        findings.push(finding('hsts-no-subdomains', 'low', 'HSTS nema includeSubDomains.'));
        hstsPoints -= 3;
      }
      score += hstsPoints;
    }

    // X-Content-Type-Options (15)
    var xcto = headers['x-content-type-options'];
    if (!xcto) {
      findings.push(finding('xcto-missing', 'medium', 'X-Content-Type-Options nedostaje.'));
    } else if (xcto.toLowerCase() !== 'nosniff') {
      findings.push(finding('xcto-invalid', 'medium', 'X-Content-Type-Options ima vrijednost različitu od nosniff.'));
    } else {
      score += 15;
    }

    // Referrer-Policy (15)
    var rp = headers['referrer-policy'];
    if (!rp) {
      findings.push(finding('referrer-missing', 'low', 'Referrer-Policy nedostaje.'));
      score += 0;
    } else if (/unsafe-url/i.test(rp)) {
      findings.push(finding('referrer-unsafe', 'high', 'Referrer-Policy je postavljen na unsafe-url, pa se puna putanja šalje trećim stranama.'));
    } else {
      score += 15;
    }

    // Permissions-Policy (10)
    if (!headers['permissions-policy']) {
      findings.push(finding('permissions-missing', 'low', 'Permissions-Policy nedostaje.'));
    } else {
      score += 10;
    }

    // Clickjacking (10)
    var hasFrameProtection = !!headers['x-frame-options'] || (csp && /frame-ancestors/i.test(csp));
    if (!hasFrameProtection) {
      findings.push(finding('clickjacking-missing', 'low', 'Nema X-Frame-Options ni CSP frame-ancestors.'));
    } else {
      score += 10;
    }

    // Otkrivanje verzije poslužitelja
    if (headers['x-powered-by']) {
      findings.push(finding('x-powered-by', 'low', 'Zaglavlje X-Powered-By otkriva tehnologiju poslužitelja.'));
    }

    return {
      ok: true,
      error: null,
      score: clampScore(score),
      findings: findings,
      note: 'Ocjena pokriva samo zalijepljena zaglavlja jednog odgovora, bez testiranja poslužitelja.'
    };
  }

  /* ------------------------------------------------------------------ */
  /* 3. CSP Policy Builder                                               */
  /* ------------------------------------------------------------------ */

  function buildCsp(options) {
    var opts = options || {};
    var inline = !!opts.allowInlineScripts;
    var extImages = !!opts.allowExternalHttpsImages;
    var localFrames = !!opts.allowLocalFrames;

    var directives = [
      "default-src 'none'",
      "script-src 'self'" + (inline ? " 'unsafe-inline'" : ''),
      "style-src 'self'",
      "img-src 'self'" + (extImages ? ' https:' : ''),
      "font-src 'self'",
      "connect-src 'none'",
      "frame-src " + (localFrames ? "'self'" : "'none'"),
      "object-src 'none'",
      "base-uri 'none'",
      "form-action 'none'",
      "frame-ancestors 'none'",
      'upgrade-insecure-requests'
    ];

    var notes = [];
    if (inline) {
      notes.push('Inline skripte su uključene (\'unsafe-inline\'). Preporuka je koristiti nonce ili hash umjesto toga.');
    }
    if (extImages) {
      notes.push('Vanjske HTTPS slike su dopuštene. Provjerite da se ne prate korisnici preko slika.');
    }
    if (localFrames) {
      notes.push('Lokalni frameovi su dopušteni. frame-ancestors u meta oznaci nije učinkovit; postavite ga kao HTTP zaglavlje.');
    }
    notes.push('frame-ancestors radi samo kao HTTP zaglavlje, ne kao meta oznaka.');

    return {
      policy: directives.join('; ') + ';',
      metaTag: '<meta http-equiv="Content-Security-Policy" content="' + directives.join('; ') + ';">',
      notes: notes
    };
  }

  /* ------------------------------------------------------------------ */
  /* 4. Log Privacy Scanner                                              */
  /* ------------------------------------------------------------------ */

  var EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
  var IBAN_RE = /\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){2,7}(?:\s?[A-Z0-9]{1,4})?\b/g;
  var CARD_CANDIDATE_RE = /\b(?:\d[ -]?){12,18}\d\b/g;
  var IPV4_GLOBAL_RE = /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g;
  var SECRET_RE = /\b(?:api[_-]?key|access[_-]?token|auth[_-]?token|token|secret|client[_-]?secret|password|passwd|pwd|lozinka|zaporka|tajna)\b\s*[:=]\s*\S+/gi;
  var BEARER_RE = /\bBearer\s+[A-Za-z0-9._~+\/-]{16,}/gi;

  function isValidIban(candidate) {
    var s = candidate.replace(/\s+/g, '').toUpperCase();
    if (s.length < 15 || s.length > 34) return false;
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

  // Broj kartice: 13–19 znamenki, prva znamenka IIN raspona 3–6, nije sastavljen od jedne znamenke i prolazi Luhn.
  function isLikelyCardNumber(digits) {
    if (!/^\d{13,19}$/.test(digits)) return false;
    if (!/^[3-6]/.test(digits)) return false;
    if (/^(\d)\1+$/.test(digits)) return false;
    return passesLuhn(digits);
  }

  function countMatches(text, re) {
    var m = text.match(re);
    return m ? m.length : 0;
  }

  function scanLogPrivacy(text) {
    var source = String(text == null ? '' : text);
    var counts = {
      email: countMatches(source, EMAIL_RE),
      iban: 0,
      card: 0,
      secret: countMatches(source, SECRET_RE) + countMatches(source, BEARER_RE),
      ipv4: countMatches(source, IPV4_GLOBAL_RE)
    };

    (source.match(IBAN_RE) || []).forEach(function (c) {
      if (isValidIban(c)) counts.iban++;
    });

    (source.match(CARD_CANDIDATE_RE) || []).forEach(function (c) {
      var digits = c.replace(/[ -]/g, '');
      if (isLikelyCardNumber(digits)) counts.card++;
    });

    var total = counts.email + counts.iban + counts.card + counts.secret + counts.ipv4;
    var categories = [
      { id: 'email', label: 'e-mail adrese', count: counts.email },
      { id: 'iban', label: 'IBAN brojevi (provjera kontrolne znamenke)', count: counts.iban },
      { id: 'card', label: 'brojevi kartica (provjera Luhn)', count: counts.card },
      { id: 'secret', label: 'tajne, tokeni i zaporke', count: counts.secret },
      { id: 'ipv4', label: 'IPv4 adrese', count: counts.ipv4 }
    ];

    return {
      ok: true,
      totalFindings: total,
      categories: categories,
      lines: source ? source.split(/\r?\n/).length : 0,
      note: 'Prikazuju se samo broj i kategorija nalaza. Pronađene vrijednosti se ne prikazuju niti spremaju.'
    };
  }

  /* ------------------------------------------------------------------ */
  /* 5. JSON Schema Drift Detector                                       */
  /* ------------------------------------------------------------------ */

  function typeOf(v) {
    if (v === null) return 'null';
    if (Array.isArray(v)) return 'array';
    return typeof v; // string, number, boolean, object
  }

  function parseJsonSafe(text) {
    try {
      return { ok: true, value: JSON.parse(String(text)) };
    } catch (e) {
      // Namjerno ne vraćamo poruku parsera jer može sadržavati fragment unosa.
      return { ok: false };
    }
  }

  function classifyChange(fromType, toType) {
    if (fromType === 'null' || toType === 'null') return 'null-value-transition';
    if (fromType === 'number' && toType === 'string') return 'number-to-string';
    if (fromType === 'string' && toType === 'number') return 'string-to-number';
    if (fromType === 'object' && toType === 'array') return 'object-to-array';
    if (fromType === 'array' && toType === 'object') return 'array-to-object';
    return 'type-changed';
  }

  function compareJsonSchemas(textA, textB) {
    var a = parseJsonSafe(textA);
    if (!a.ok) return { ok: false, error: 'invalid_json', side: 'A', changes: [] };
    var b = parseJsonSafe(textB);
    if (!b.ok) return { ok: false, error: 'invalid_json', side: 'B', changes: [] };

    var changes = [];

    function walk(x, y, path) {
      var tx = typeOf(x);
      var ty = typeOf(y);

      if (tx !== ty) {
        changes.push({ path: path, kind: classifyChange(tx, ty), from: tx, to: ty });
        return;
      }

      if (tx === 'object') {
        var keysA = Object.keys(x);
        var keysB = Object.keys(y);
        keysB.forEach(function (k) {
          if (!Object.prototype.hasOwnProperty.call(x, k)) {
            changes.push({ path: path + '.' + k, kind: 'field-added', from: null, to: typeOf(y[k]) });
          }
        });
        keysA.forEach(function (k) {
          if (!Object.prototype.hasOwnProperty.call(y, k)) {
            changes.push({ path: path + '.' + k, kind: 'field-removed', from: typeOf(x[k]), to: null });
          } else {
            walk(x[k], y[k], path + '.' + k);
          }
        });
        return;
      }

      if (tx === 'array') {
        if (x.length && y.length) {
          walk(x[0], y[0], path + '[]');
        } else if (x.length !== y.length) {
          changes.push({ path: path, kind: 'array-emptiness-changed', from: x.length ? 'non-empty' : 'empty', to: y.length ? 'non-empty' : 'empty' });
        }
      }
    }

    walk(a.value, b.value, '$');

    var summary = {};
    changes.forEach(function (c) {
      summary[c.kind] = (summary[c.kind] || 0) + 1;
    });

    return {
      ok: true,
      error: null,
      changes: changes,
      summary: summary,
      note: 'Pregled za stručnu provjeru. Alat ne donosi odluku o kompatibilnosti i ne prikazuje vrijednosti polja.'
    };
  }

  return {
    inspectUrl: inspectUrl,
    parseHeaders: parseHeaders,
    analyzeHeaders: analyzeHeaders,
    buildCsp: buildCsp,
    scanLogPrivacy: scanLogPrivacy,
    isValidIban: isValidIban,
    passesLuhn: passesLuhn,
    compareJsonSchemas: compareJsonSchemas
  };
});
