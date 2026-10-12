// SPT — inicijalizacija aplikacije (2.0: i18n, auth, live mreža, jezični izbornik)
"use strict";

const I18N = { lang: "hr", t: {}, langs: [] };
function tr(key) { return I18N.t[key] || key; }

const AUTH = {
  user: null,
  async load() {
    try { const r = await API.get("/api/auth/me"); this.user = r.user; } catch (e) { this.user = null; }
  },
  isAdmin() { return this.user && this.user.role === "admin"; },
  isStaff() { return this.user && ["trener", "kondicijski"].includes(this.user.role); },
  async login(u, p) { return API.post("/api/auth/login", { username: u, pin: p }); },
  async logout() { await API.post("/api/auth/logout", {}); this.user = null; location.reload(); }
};

async function setLang(l) {
  localStorage.setItem("spt_lang", l);
  I18N.lang = l;
  await loadI18n();
  route();
}
async function loadI18n() {
  try {
    const d = await API.get(`/api/i18n?lang=${I18N.lang}`);
    I18N.t = d.t; I18N.langs = d.langs;
  } catch (e) { /* fallback hr */ }
}

// ------- prijava (modal) -------
function showLogin() {
  const modal = el("div");
  modal.style.cssText = "position:fixed;inset:0;background:#04070ccc;z-index:80;display:flex;align-items:center;justify-content:center;padding:20px";
  const card = el("div", "card");
  card.style.cssText = "max-width:380px;width:100%;background:#0d1522";
  card.innerHTML = `<h3>🔐 ${tr("login")} — SPT</h3>
    <p class="muted" style="font-size:12px;margin:8px 0 14px">Demo računi: <b>trener/1234</b> · kondicija/1234 · sportas/1234 · skaut/1234 · admin/admin123</p>`;
  const fu = el("label", "fld", tr("username"));
  const iu = el("input"); iu.type = "text"; iu.value = "trener";
  fu.append(iu);
  const fp = el("label", "fld", tr("pin"));
  const ip = el("input"); ip.type = "password"; ip.value = "1234";
  fp.append(ip);
  fp.style.marginTop = "10px";
  const err = el("div", "", ""); err.style.cssText = "color:var(--red);font-size:12px;margin-top:8px;min-height:16px";
  const btn = el("div", "btn", "➜ " + tr("login"));
  btn.style.marginTop = "12px";
  btn.onclick = async () => {
    const r = await AUTH.login(iu.value.trim(), ip.value);
    if (r.error) { err.textContent = r.error; return; }
    AUTH.user = r.user;
    modal.remove();
    route();
    toast(tr("login") + ": " + r.user.name);
  };
  ip.addEventListener("keydown", e => { if (e.key === "Enter") btn.click(); });
  const close = el("div", "btn ghost sm", "✕");
  close.style.cssText = "margin-top:10px;width:100%";
  close.onclick = () => modal.remove();
  card.append(fu, fp, err, btn, close);
  modal.append(card);
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
  document.body.append(modal);
  iu.focus();
}

function renderUserBadge() {
  const tr2 = document.getElementById("topRight");
  if (!tr2) return;
  tr2.innerHTML = "";
  // zvono s obavijestima
  const bell = el("div", "notif-bell");
  bell.id = "notifBell";
  bell.innerHTML = `🔔<span class="ndot" style="display:none"></span>`;
  bell.title = "Obavijesti";
  bell.onclick = showNotifPanel;
  tr2.append(bell);
  // jezični izbornik
  const langSel = el("select");
  langSel.title = "Language / Jezik";
  langSel.style.cssText = "background:#15202f;border:1px solid #27395a;color:#e8eef8;border-radius:10px;padding:5px 8px;font-size:12px";
  for (const l of I18N.langs) {
    const o = el("option"); o.value = l.code; o.textContent = l.name.toUpperCase();
    if (l.code === I18N.lang) o.selected = true;
    langSel.append(o);
  }
  langSel.onchange = () => setLang(langSel.value);
  tr2.append(langSel);
  // korisnik
  if (AUTH.user) {
    const badge = el("div", "", `👤 <b>${esc(AUTH.user.name || AUTH.user.username)}</b> <span class="badge b-cyan">${esc(AUTH.user.role)}</span>`);
    badge.style.cssText = "display:flex;align-items:center;gap:8px;font-size:12.5px;margin-left:12px";
    const out = el("div", "btn ghost sm", tr("logout"));
    out.style.marginLeft = "8px";
    out.onclick = () => AUTH.logout();
    badge.append(out);
    tr2.append(badge);
  } else {
    const b = el("div", "btn sm", "🔐 " + tr("login"));
    b.style.marginLeft = "12px";
    b.onclick = showLogin;
    tr2.append(b);
  }
}

// ------- live mreža (virtualni brojevi) -------
function netTicker() {
  const el1 = document.getElementById("netTicker");
  if (!el1) return;
  API.get("/api/network/stats").then(d => {
    el1.innerHTML = `🌍 <b class="mono" data-count="${d.athletes_online_total}">${d.athletes_online_total.toLocaleString("hr-HR")}</b> ${tr("athletes_online")}
      &nbsp;·&nbsp; 🔴 <b class="mono">${d.active_right_now.toLocaleString("hr-HR")}</b> ${tr("active_now")}
      &nbsp;·&nbsp; 📈 <b class="mono">${d.sessions_today.toLocaleString("hr-HR")}</b> ${tr("sessions_today")}`;
  }).catch(() => {});
}

// ------- tema / TV način -------
function applyTheme(t) {
  document.body.classList.toggle("light", t === "light");
  localStorage.setItem("spt_theme", t);
}

// ------- pomoć (tipka ?) -------
function showHelp() {
  const modal = el("div");
  modal.style.cssText = "position:fixed;inset:0;background:#04070ccc;z-index:95;display:flex;align-items:center;justify-content:center;padding:20px";
  const card = el("div", "card");
  card.style.cssText = "max-width:520px;width:100%;background:#0d1522";
  card.innerHTML = `<h3>⌨️ kratice i trikovi</h3>
    <div class="mini-stat"><span><b>Ctrl + K</b></span><b>komandna paleta — traži sve</b></div>
    <div class="mini-stat"><span><b>?</b></span><b>ova pomoć</b></div>
    <div class="mini-stat"><span><b>F11</b></span><b>fullscreen</b></div>
    <div class="mini-stat"><span><b>Kontrolna soba</b></span><b>do 9 live ploča + usporedba 2 igrača</b></div>
    <div class="mini-stat"><span><b>Izvještaji</b></span><b>generiraj → odobri → ispiši PDF</b></div>
    <div class="mini-stat"><span><b>SPT AI</b></span><b>pitaj bilo što o bazi</b></div>`;
  const close = el("div", "btn ghost sm", "Zatvori");
  close.style.cssText = "margin-top:12px;width:100%";
  close.onclick = () => modal.remove();
  card.append(close);
  modal.append(card);
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
  document.body.append(modal);
}

// ------- obavijesti (zvono) -------
let NOTIF_ITEMS = [];
function seenNotifs() { try { return JSON.parse(localStorage.getItem("spt_seen_notifs") || "{}"); } catch (e) { return {}; } }
function pollNotifs() {
  const bell = document.getElementById("notifBell");
  if (!bell) return;
  API.get("/api/notifications").then(d => {
    NOTIF_ITEMS = d.items || [];
    const seen = seenNotifs();
    const unread = NOTIF_ITEMS.filter(x => !seen[x.id]).length;
    const dot = bell.querySelector(".ndot");
    if (dot) { dot.style.display = unread ? "block" : "none"; dot.textContent = unread > 9 ? "9+" : unread; }
  }).catch(() => {});
}
function showNotifPanel() {
  document.querySelectorAll(".notif-panel").forEach(x => x.remove());
  const seen = seenNotifs();
  const panel = el("div", "card notif-panel");
  panel.innerHTML = `<h3>🔔 Obavijesti <span class="faint" style="float:right;font-weight:400;font-size:11px">anomalije · ozljede · izvještaji</span></h3>`;
  if (!NOTIF_ITEMS.length) panel.append(el("div", "muted", "Nema novih obavijesti. ✓"));
  for (const it of NOTIF_ITEMS) {
    const row = el("div", "notif-it" + (seen[it.id] ? "" : " unread"));
    row.innerHTML = `<span class="ni-dot ${it.sev}"></span><div style="flex:1">
      <div style="font-size:12.5px">${esc(it.txt)}</div>
      <div class="faint" style="font-size:10.5px">${esc(it.date || "")}</div></div>`;
    row.onclick = () => {
      seen[it.id] = 1;
      localStorage.setItem("spt_seen_notifs", JSON.stringify(seen));
      panel.remove();
      pollNotifs();
      if (it.link) { const [v, s] = it.link.split("/"); nav(v, s); }
    };
    panel.append(row);
  }
  const clr = el("div", "btn ghost sm", "Označi sve kao pročitano");
  clr.style.cssText = "margin-top:10px;width:100%";
  clr.onclick = () => {
    const s2 = seenNotifs();
    for (const it of NOTIF_ITEMS) s2[it.id] = 1;
    localStorage.setItem("spt_seen_notifs", JSON.stringify(s2));
    panel.remove(); pollNotifs();
  };
  panel.append(clr);
  const bell = document.getElementById("notifBell");
  const r = bell ? bell.getBoundingClientRect() : { right: 40, top: 60 };
  panel.style.cssText += `position:fixed;top:${r.bottom + 8}px;right:${Math.max(12, window.innerWidth - r.right)}px;width:340px;max-height:60vh;overflow-y:auto;z-index:90;background:#0d1522`;
  document.body.append(panel);
  setTimeout(() => {
    document.addEventListener("click", function h(e) {
      if (!panel.contains(e.target) && e.target !== bell) { panel.remove(); document.removeEventListener("click", h); }
    });
  }, 50);
}

// ------- Ctrl+K komandna paleta -------
function togglePalette() {
  if (document.querySelector(".palette")) { document.querySelector(".palette").remove(); return; }
  const pal = el("div", "palette");
  pal.innerHTML = `<div class="pal-box">
    <div class="pal-head">🔎 <input placeholder="Traži: sportaše, klubove, utakmice, ekrane… (Ctrl+K)" autofocus></div>
    <div class="pal-res"></div></div>`;
  pal.onclick = e => { if (e.target === pal) pal.remove(); };
  document.body.append(pal);
  const inp = pal.querySelector("input");
  const res = pal.querySelector(".pal-res");
  inp.focus();
  const db = debounce(async () => {
    const qv = inp.value.trim();
    res.innerHTML = "";
    if (!qv) {
      res.append(el("div", "pal-hint", "Unesi barem 2 znaka — ili odaberi ekran ispod"));
      for (const [vid, v] of Object.entries(VIEWS)) {
        const it = el("div", "pal-it", `🖥 <b>${esc(v.title || vid)}</b>`);
        it.onclick = () => { pal.remove(); nav(vid); };
        res.append(it);
      }
      return;
    }
    const low = qv.toLowerCase();
    // ekrani
    for (const [vid, v] of Object.entries(VIEWS)) {
      if ((v.title || vid).toLowerCase().includes(low)) {
        const it = el("div", "pal-it", `🖥 <b>${esc(v.title || vid)}</b>`);
        it.onclick = () => { pal.remove(); nav(vid); };
        res.append(it);
      }
    }
    // sportaši
    try {
      const d = await API.get(`/api/athletes?q=${encodeURIComponent(qv)}&size=6`);
      for (const a of d.items) {
        const it = el("div", "pal-it");
        it.innerHTML = `🏃 <span class="flag">${flag(a.country)}</span> <b>${esc(a.name)}</b>
          <span class="meta">${esc(sportName(a.sport))} · ${esc(a.club || "")}</span>`;
        it.onclick = () => { pal.remove(); nav("karton", a.id); };
        res.append(it);
      }
    } catch (e) {}
    // klubovi
    try {
      const cl = await API.get("/api/clubs");
      for (const c of cl.filter(c => (c.code + " " + (c.country || "")).toLowerCase().includes(low)).slice(0, 4)) {
        const it = el("div", "pal-it", `🏢 <b>${esc(c.code)}</b> <span class="meta">${esc(cname(c.country))} · ${esc(sportName(c.sport))}</span>`);
        it.onclick = () => { pal.remove(); nav("team", c.code); };
        res.append(it);
      }
    } catch (e) {}
    if (!res.children.length) res.append(el("div", "pal-hint", "Nema rezultata."));
  }, 200);
  inp.addEventListener("input", db);
  inp.addEventListener("keydown", e => {
    if (e.key === "Escape") pal.remove();
    if (e.key === "Enter") { const f = res.querySelector(".pal-it"); if (f) f.click(); }
  });
}

(async function boot() {
  // jezik iz localStorage
  I18N.lang = localStorage.getItem("spt_lang") || "hr";
  await Promise.all([
    loadI18n(),
    AUTH.load(),
    (async () => {
      try {
        const sports = await API.get("/api/sports");
        for (const s of sports) SPORT_NAMES[s.id] = s.hr;
      } catch (e) {}
    })()
  ]);
  // prevedi navigaciju
  document.querySelectorAll("#nav a").forEach(a => {
    const k = "nav_" + a.dataset.view;
    if (I18N.t[k]) {
      const ico = a.querySelector(".ico");
      const live = a.querySelector(".live-dot");
      a.textContent = "";
      a.append(ico || el("span"), el("span", "", I18N.t[k]));
      if (live) a.append(live);
    }
  });
  if (!location.hash) location.hash = "#dashboard";
  route();
  setInterval(netTicker, 4000);
  netTicker();
  setInterval(pollNotifs, 30000);
  pollNotifs();
  applyTheme(localStorage.getItem("spt_theme") || "dark");
  if (localStorage.getItem("spt_tv")) document.body.classList.add("tv");
  document.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); togglePalette(); }
    if (e.key === "?" && !/input|textarea|select/i.test((e.target.tagName || ""))) showHelp();
  });
})();
