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
function toast(msg) {
  const t = el("div", "toast", esc(msg));
  document.getElementById("toasts").appendChild(t);
  setTimeout(() => t.remove(), 3200);
}
function debounce(fn, ms) { let h; return (...a) => { clearTimeout(h); h = setTimeout(() => fn(...a), ms); }; }

function spinner() { return el("div", "spinner"); }

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
