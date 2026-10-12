// SPT — korisničke pomoćne funkcije, API, router
"use strict";

const API = {
  async get(path) {
    const r = await fetch(path);
    if (!r.ok) throw new Error("API " + r.status);
    return r.json();
  },
  async post(path, body) {
    const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) });
    if (!r.ok) throw new Error("API " + r.status);
    return r.json();
  }
};

const COUNTRY_NAMES = {
  HR:"Hrvatska",RS:"Srbija",BA:"Bosna i Hercegovina",SI:"Slovenija",ME:"Crna Gora",MK:"Sjeverna Makedonija",
  DE:"Njemačka",AT:"Austrija",CH:"Švicarska",FR:"Francuska",BE:"Belgija",ES:"Španjolska",PT:"Portugal",
  BR:"Brazil",IT:"Italija",NL:"Nizozemska",GB:"Velika Britanija",IE:"Irska",AU:"Australija",NZ:"Novi Zeland",
  CA:"Kanada",US:"SAD",PL:"Poljska",CZ:"Češka",SK:"Slovačka",HU:"Mađarska",RO:"Rumunjska",BG:"Bugarska",
  RU:"Rusija",UA:"Ukrajina",LT:"Litva",LV:"Latvija",EE:"Estonija",SE:"Švedska",NO:"Norveška",FI:"Finska",
  DK:"Danska",IS:"Island",TR:"Turska",KZ:"Kazahstan",UZ:"Uzbekistan",GR:"Grčka",EG:"Egipat",MA:"Maroko",
  DZ:"Alžir",TN:"Tunis",NG:"Nigerija",GH:"Gana",SN:"Senegal",CI:"Obala Bjelokosti",CM:"Kamerun",
  ZA:"Južnoafrička Rep.",KE:"Kenija",ET:"Etiopija",UG:"Uganda",TZ:"Tanzanija",IN:"Indija",PK:"Pakistan",
  BD:"Bangladeš",LK:"Šri Lanka",NP:"Nepal",JP:"Japan",KR:"Južna Koreja",CN:"Kina",TH:"Tajland",VN:"Vijetnam",
  ID:"Indonezija",MY:"Malezija",PH:"Filipini",IR:"Iran",IL:"Izrael",GE:"Gruzija",AM:"Armenija",AZ:"Azerbajdžan",
  MX:"Meksiko",AR:"Argentina",CO:"Kolumbija",CL:"Čile",UY:"Urugvaj",VE:"Venezuela",CU:"Kuba",
  DO:"Dominikanska Rep.",PA:"Panama",CR:"Kostarika",JM:"Jamajka",TT:"Trinidad i Tobago"
};
const FLAGS = {};
for (const cc of Object.keys(COUNTRY_NAMES)) {
  FLAGS[cc] = cc.replace(/./g, ch => String.fromCodePoint(127397 + ch.charCodeAt()));
}
const flag = cc => FLAGS[cc] || "🏳️";
const cname = cc => COUNTRY_NAMES[cc] || cc;

const SPORT_NAMES = {}; // popuni /api/sports pri startu
const sportName = id => SPORT_NAMES[id] || id;

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}
function fmtN(v, d = 1) { return v == null ? "—" : Number(v).toLocaleString("hr-HR", { maximumFractionDigits: d }); }
function fmtD(s) { return s ? s.split("-").reverse().join(".") : "—"; }
function fmtClock(sec) {
  sec = Math.max(0, Math.floor(sec));
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
function matchMinute(t, sport) {
  if (sport === "kosarka") {
    const q = Math.min(4, Math.floor(t / 600) + 1);
    return `Q${q} ${fmtClock(t % 600)}`;
  }
  const half = t <= 2700 ? 1 : 2;
  const m = Math.floor((t % 2700) / 60) + 1;
  return `${half}. pol. ${m}'`;
}
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function toast(msg, type = "info") {
  const box = document.getElementById("toasts") || document.body;
  const t = el("div", "toast t-" + type, (type === "ok" ? "✅ " : type === "err" ? "⚠️ " : "") + esc(msg));
  box.appendChild(t);
  setTimeout(() => t.classList.add("out"), 2900);
  setTimeout(() => t.remove(), 3300);
}
function debounce(fn, ms) { let h; return (...a) => { clearTimeout(h); h = setTimeout(() => fn(...a), ms); }; }

function spinner() { return el("div", "spinner"); }
function skeleton(n = 3) {
  const w = el("div", "skel-wrap");
  for (let i = 0; i < n; i++) w.append(el("div", "skel"));
  return w;
}

// ------- jedinice (metričke / imperijalne) -------
const PREFS = (() => {
  try { return JSON.parse(localStorage.getItem("spt_prefs") || "{}"); } catch (e) { return {}; }
})();
const IMPERIAL = () => PREFS.units === "imp";
function fmtKm(v, d = 1) {
  if (v == null) return "—";
  return IMPERIAL() ? (v * 0.621371).toLocaleString("hr-HR", { maximumFractionDigits: d }) + " mi"
                    : v.toLocaleString("hr-HR", { maximumFractionDigits: d }) + " km";
}
function fmtKg(v, d = 1) {
  if (v == null) return "—";
  return IMPERIAL() ? (v * 2.20462).toLocaleString("hr-HR", { maximumFractionDigits: d }) + " lb"
                    : v.toLocaleString("hr-HR", { maximumFractionDigits: d }) + " kg";
}
function fmtSpd(v, d = 1) {
  if (v == null) return "—";
  return IMPERIAL() ? (v * 0.621371).toLocaleString("hr-HR", { maximumFractionDigits: d }) + " mph"
                    : v.toLocaleString("hr-HR", { maximumFractionDigits: d }) + " km/h";
}
const kmUnit = () => IMPERIAL() ? "mi" : "km";
const spdUnit = () => IMPERIAL() ? "mph" : "km/h";

// ------- CSV izvoz (bilo koja tablica) -------
function exportCSV(rows, name) {
  const csv = "\uFEFF" + rows.map(r => r.map(c => {
    const s = String(c == null ? "" : c);
    return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(";")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = name;
  a.click();
  toast("CSV preuzet: " + name, "ok");
}

// ------- favoriti + nedavno gledani -------
function favList() { try { return JSON.parse(localStorage.getItem("spt_favs") || "[]"); } catch (e) { return []; } }
function isFav(aid) { return favList().includes(+aid); }
function favToggle(aid) {
  const f = favList();
  const i = f.indexOf(+aid);
  if (i > -1) f.splice(i, 1); else f.push(+aid);
  localStorage.setItem("spt_favs", JSON.stringify(f));
  return i === -1;
}
function recentAdd(aid, name) {
  let r = [];
  try { r = JSON.parse(localStorage.getItem("spt_recent") || "[]"); } catch (e) {}
  r = r.filter(x => x.id !== +aid);
  r.unshift({ id: +aid, name });
  localStorage.setItem("spt_recent", JSON.stringify(r.slice(0, 8)));
}
function recentList() { try { return JSON.parse(localStorage.getItem("spt_recent") || "[]"); } catch (e) { return []; } }

// ------- pretraživač sportaša (komponenta) -------
function athletePicker(onPick, opts = {}) {
  const wrap = el("div", "search-picker");
  const input = el("input"); input.type = "search"; input.placeholder = "🔎 Traži sportaša (ime)...";
  const res = el("div", "sp-results");
  wrap.append(input, res);
  const run = debounce(async () => {
    const q = input.value.trim();
    if (q.length < 2) { res.style.display = "none"; return; }
    const data = await API.get(`/api/athletes?q=${encodeURIComponent(q)}&size=10`);
    res.innerHTML = "";
    if (!data.items.length) { res.style.display = "block"; res.append(el("div", "it muted", "Nema rezultata")); return; }
    for (const a of data.items) {
      const it = el("div", "it");
      it.innerHTML = `<span class="flag">${flag(a.country)}</span> <b>${esc(a.name)}</b>
        <span class="meta">${esc(sportName(a.sport))} · ${esc(a.position || "")} · ${esc(a.club || "")}</span>`;
      it.onclick = () => { res.style.display = "none"; input.value = ""; onPick(a); };
      res.append(it);
    }
    res.style.display = "block";
  }, 220);
  input.addEventListener("input", run);
  input.addEventListener("blur", () => setTimeout(() => res.style.display = "none", 180));
  if (opts.sport) wrap.dataset.sport = opts.sport;
  return wrap;
}

// ------- router -------
const VIEWS = {};
let CURRENT = null;
function nav(viewId, sub) {
  const h = sub ? `#${viewId}/${sub}` : `#${viewId}`;
  if (location.hash === h) route();
  else location.hash = h;
}
function route() {
  const [vid, sub] = location.hash.replace(/^#/, "").split("/");
  const view = VIEWS[vid] || VIEWS.dashboard;
  document.querySelectorAll("#nav a").forEach(a => a.classList.toggle("active", a.dataset.view === (VIEWS[vid] ? vid : "dashboard")));
  document.body.dataset.livepage = vid === "live" ? "1" : "0";
  if (CURRENT && CURRENT.destroy) { try { CURRENT.destroy(); } catch (e) {} }
  const cont = document.getElementById("view");
  cont.innerHTML = "";
  cont.classList.remove("view-in");
  void cont.offsetWidth;
  cont.classList.add("view-in");
  if (vid === "karton" && sub) {
    API.get(`/api/athletes/${sub}`).then(a => { if (a && a.name) recentAdd(sub, a.name); }).catch(() => {});
  }
  window.scrollTo(0, 0);
  document.getElementById("view").scrollTop = 0;
  document.getElementById("pageTitle").textContent = view.title;
  document.getElementById("pageSub").textContent = view.sub || "";
  const tr = document.getElementById("topRight");
  tr.innerHTML = "";
  CURRENT = view;
  view.render(cont, sub);
  document.getElementById("view").scrollTop = 0;
}
window.addEventListener("hashchange", route);
