/*
 * gnk-asg :: univerzalni klijentski loader za vanjske API izvore
 *
 * PRAVILA KOJA OVAJ TEMPLATE POSTUJE:
 *  1. Nista se ne downloada u repo i nista ne ulazi u build.
 *  2. Nista se ne dohvaca dok korisnik ne doscrolla do sekcije (IntersectionObserver).
 *  3. Nista ne blokira render - sve je async, s timeoutom i tihim padom.
 *  4. Ako izvor padne ili je spor, sekcija se jednostavno ne prikaze. Stranica ostaje ista.
 *  5. sessionStorage cache -> jedan korisnik = jedan poziv po izvoru po sesiji.
 *  6. Slike se lazy-loadaju i nikad se ne rehostaju.
 *
 * UPOTREBA U HTML-u:
 *   <div data-api="worldbank" data-render="pokazatelji"></div>
 *   <div data-api="currents"  data-render="kartice" data-max="8"></div>
 *   <script type="module" src="/js/api-loader.js"></script>
 */

const TIMEOUT_MS = 4000;      // sve sporije od ovoga se odbacuje
const CACHE_MIN  = 30;        // minuta

// Endpointi bez kljuca idu izravno. Oni s kljucem idu kroz vlastiti proxy
// (/api/proxy/<id>) da kljuc nikad ne zavrsi u klijentskom kodu.
const IZVORI = {
  worldbank:     { url: "https://api.worldbank.org/v2/country/IN;JP;NG;ZA;AE/indicator/NY.GDP.MKTP.CD?format=json&mrnev=1" },
  restcountries: { url: "https://restcountries.com/v3.1/region/asia?fields=name,flags,currencies,capital,latlng" },
  frankfurter:   { url: "https://api.frankfurter.app/latest?from=EUR&to=JPY,INR,CNY,ZAR,AED" },
  spaceflight:   { url: "https://api.spaceflightnewsapi.net/v4/articles/?limit=8" },
  openfoodfacts: { url: "https://world.openfoodfacts.org/api/v2/search?countries_tags=japan&page_size=8&fields=product_name,image_small_url,brands" },
  currents:      { url: "/api/proxy/currents" },
  newsdata:      { url: "/api/proxy/newsdata" },
  guardian:      { url: "/api/proxy/guardian" },
};

async function dohvati(id) {
  const kljuc = `api:${id}`;
  const spremljeno = sessionStorage.getItem(kljuc);
  if (spremljeno) {
    const { t, d } = JSON.parse(spremljeno);
    if (Date.now() - t < CACHE_MIN * 60_000) return d;
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(IZVORI[id].url, { signal: ctrl.signal, mode: "cors" });
    if (!r.ok) throw new Error(r.status);
    const d = await r.json();
    try { sessionStorage.setItem(kljuc, JSON.stringify({ t: Date.now(), d })); } catch {}
    return d;
  } catch (e) {
    console.warn(`[api-loader] ${id} preskocen:`, e.message);
    return null;   // tihi pad - sekcija se ne prikazuje
  } finally {
    clearTimeout(timer);
  }
}

// --- normalizacija: svaki izvor -> isti oblik { naslov, opis, slika, link, izvor } ---
const NORMALIZATORI = {
  spaceflight: d => (d.results || []).map(a => ({
    naslov: a.title, opis: a.summary, slika: a.image_url, link: a.url, izvor: a.news_site,
  })),
  currents: d => (d.news || []).map(a => ({
    naslov: a.title, opis: a.description, slika: a.image !== "None" ? a.image : null,
    link: a.url, izvor: new URL(a.url).hostname,
  })),
  newsdata: d => (d.results || []).map(a => ({
    naslov: a.title, opis: a.description, slika: a.image_url, link: a.link, izvor: a.source_id,
  })),
  guardian: d => (d.response?.results || []).map(a => ({
    naslov: a.webTitle, opis: "", slika: a.fields?.thumbnail, link: a.webUrl, izvor: "The Guardian",
  })),
  openfoodfacts: d => (d.products || []).map(p => ({
    naslov: p.product_name, opis: p.brands, slika: p.image_small_url, link: "#", izvor: "Open Food Facts",
  })),
  restcountries: d => d.map(c => ({
    naslov: c.name.common, opis: c.capital?.[0] || "", slika: c.flags?.png, link: "#", izvor: "REST Countries",
  })),
};

const escape = s => String(s ?? "").replace(/[<>&"]/g, c =>
  ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

function kartice(stavke, max) {
  return stavke.slice(0, max).map(s => `
    <article class="api-kartica">
      ${s.slika ? `<img src="${escape(s.slika)}" alt="" loading="lazy" decoding="async"
                        referrerpolicy="no-referrer" onerror="this.remove()">` : ""}
      <h3><a href="${escape(s.link)}" target="_blank" rel="noopener nofollow">${escape(s.naslov)}</a></h3>
      <p>${escape((s.opis || "").slice(0, 140))}</p>
      <span class="api-izvor">${escape(s.izvor)}</span>
    </article>`).join("");
}

function pokazatelji(d) {
  const red = (Array.isArray(d) ? d[1] : []) || [];
  return red.map(x => `
    <div class="api-pokazatelj">
      <span class="zemlja">${escape(x.country?.value)}</span>
      <span class="vrijednost">${x.value ? (x.value / 1e9).toFixed(1) + " mlrd USD" : "—"}</span>
      <span class="godina">${escape(x.date)}</span>
    </div>`).join("");
}

async function prikazi(el) {
  const id = el.dataset.api;
  const nacin = el.dataset.render || "kartice";
  const max = parseInt(el.dataset.max || "8", 10);

  const d = await dohvati(id);
  if (!d) { el.hidden = true; return; }

  let html = "";
  if (nacin === "pokazatelji") html = pokazatelji(d);
  else if (NORMALIZATORI[id]) html = kartice(NORMALIZATORI[id](d), max);

  if (!html.trim()) { el.hidden = true; return; }
  el.innerHTML = html;
  el.dataset.ucitano = "1";
}

const promatrac = new IntersectionObserver((unosi, obs) => {
  unosi.forEach(u => {
    if (u.isIntersecting) { obs.unobserve(u.target); prikazi(u.target); }
  });
}, { rootMargin: "200px" });   // krece 200px prije nego se vidi

document.querySelectorAll("[data-api]").forEach(el => promatrac.observe(el));
