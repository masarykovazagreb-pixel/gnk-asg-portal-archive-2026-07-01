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
})();
