// SPT 2.3 — Postavke: izgled, jedinice, PWA, zvuk, kratice, korisnici (admin), Windows
"use strict";
VIEWS.postavke = {
  title: "Postavke",
  sub: "Izgled · jedinice · instalacija · zvuk · kratice · korisnici · Windows 11",
  async render(cont) {
    cont.innerHTML = "";

    // ================= IZGLED =================
    const ui = el("div", "card");
    ui.innerHTML = `<h3>🎨 Izgled</h3>`;
    const mkRow = (label, opts, cur, onPick) => {
      const r = el("div", "ctrl-row");
      r.append(el("span", "faint", label + ":"));
      for (const [v, l] of opts) {
        const c = el("div", "chip" + (cur === v ? " on" : ""), l);
        c.onclick = () => { r.querySelectorAll(".chip").forEach(x => x.classList.remove("on")); c.classList.add("on"); onPick(v); };
        r.append(c);
      }
      return r;
    };
    ui.append(mkRow("Tema", [["auto", "🌗 Auto (sustav)"], ["dark", "🌙 Tamna"], ["light", "☀️ Svijetla"]],
      localStorage.getItem("spt_theme") || "dark",
      v => { applyTheme(v); toast("Tema: " + v, "ok"); }));
    ui.append(mkRow("Veličina teksta", [["S", "A"], ["M", "A"], ["L", "A"], ["XL", "A"]],
      PREFS.font || "M",
      v => savePref("font", v)));
    ui.append(mkRow("Gustoća tablica", [["normal", "Normalno"], ["compact", "Kompaktno"]],
      PREFS.density || "normal",
      v => savePref("density", v)));
    ui.append(mkRow("Paleta", [["normal", "Standardna"], ["colorblind", "Slijepima za boje (plavo/narančasto)"]],
      PREFS.colorblind ? "colorblind" : "normal",
      v => savePref("colorblind", v === "colorblind")));
    ui.append(mkRow("Jedinice", [["met", "Metričke (km · kg)"], ["imp", "Imperijalne (mi · lb)"]],
      PREFS.units || "met",
      v => savePref("units", v)));
    const rowL = el("div", "ctrl-row");
    rowL.append(el("span", "faint", "Jezik sučelja:"));
    const ls = el("select");
    for (const l of (I18N.langs || [])) {
      const o = el("option"); o.value = l.code; o.textContent = l.name;
      if (l.code === I18N.lang) o.selected = true;
      ls.append(o);
    }
    ls.onchange = () => setLang(ls.value);
    rowL.append(ls);
    ui.append(rowL);
    const rowTV = el("div", "ctrl-row");
    rowTV.append(el("span", "faint", "TV način (svlačionica):"));
    const tv = el("div", "chip" + (document.body.classList.contains("tv") ? " on" : ""),
      "📺 " + (document.body.classList.contains("tv") ? "UKLJUČEN" : "isključen"));
    tv.onclick = () => {
      document.body.classList.toggle("tv");
      tv.classList.toggle("on");
      tv.textContent = "📺 " + (document.body.classList.contains("tv") ? "UKLJUČEN" : "isključen");
      localStorage.setItem("spt_tv", document.body.classList.contains("tv") ? "1" : "");
    };
    rowTV.append(tv);
    ui.append(rowTV);
    cont.append(ui);

    const grid = el("div", "grid g2"); grid.style.marginTop = "14px";

    // ================= PWA =================
    const pwa = el("div", "card");
    pwa.innerHTML = `<h3>📲 Instaliraj kao aplikaciju</h3>
      <p class="muted" style="font-size:12.5px;line-height:1.65">Instaliraj SPT kao <b>pravu desktop aplikaciju za Windows 11</b>:
      zaseban prozor bez adresne trake, ikona u Start meniju, radi i <b>offline</b> (pregledana sučelja ostaju dostupna bez interneta).</p>`;
    const iBtn = el("div", "btn", "⬇ Instaliraj SPT");
    iBtn.onclick = installApp;
    pwa.append(iBtn);
    const pwa2 = el("div", "muted");
    pwa2.style.cssText = "font-size:11.5px;margin-top:8px;line-height:1.5";
    pwa2.innerHTML = "Alternativno: ikona <b>⊕ Instaliraj</b> u adresnoj traci preglednika (Edge/Chrome).<br>Prečice unutar aplikacije: Kontrolna soba · Uživo · Izvještaji · AI.";
    pwa.append(pwa2);
    grid.append(pwa);

    // ================= ZVUK =================
    const snd = el("div", "card");
    snd.innerHTML = `<h3>🔊 Zvuk i alarmi</h3>
      <p class="muted" style="font-size:12.5px;line-height:1.6">U <b>Kontrolnoj sobi</b> uključi zvučni signal za crvene alarmi
      (puls zona 5, previsok broj sprinteva). Zvono obavijesti uvijek radi vizualno.</p>
      <div class="mini-stat"><span>Test zvuka</span><b class="link" id="testSnd">▶ pokreni beep</b></div>`;
    grid.append(snd);

    // ================= KRATICE =================
    const kb = el("div", "card");
    kb.innerHTML = `<h3>⌨️ Tipkovničke kratice</h3>
      <div class="mini-stat"><span><b>Ctrl + K</b></span><b>komandna paleta (sportaši, klubovi, ekrani)</b></div>
      <div class="mini-stat"><span><b>?</b></span><b>pomoć / popis kratica</b></div>
      <div class="mini-stat"><span><b>F11</b></span><b>fullscreen (idealno za TV način)</b></div>
      <div class="mini-stat"><span><b>Esc</b></span><b>zatvori modal/paletu</b></div>
      <div class="mini-stat"><span><b>Enter</b></span><b>prvi rezultat u paleti</b></div>
      <div class="mini-stat"><span><b>Ctrl + P</b></span><b>ispis trenutnog ekrana</b></div>`;
    grid.append(kb);

    // ================= WINDOWS =================
    const win = el("div", "card");
    win.innerHTML = `<h3>🖥 Windows 11 desktop</h3>
      <p class="muted" style="font-size:12.5px;line-height:1.7">
      1. Instaliraj <b>Python 3.10+</b> (obavezno "Add to PATH").<br>
      2. <b>start_windows.bat</b> — server na <span class="mono">localhost:8000</span>, auto-restart ako padne.<br>
      3. <b>SPT-prečica.bat</b> — prečica na radnoj površini.<br>
      4. Ili instaliraj PWA (gore) za prozor bez trake.<br>
      5. Radi potpuno offline — čisti Python, nula ovisnosti.</p>
      <div class="mini-stat"><span>Verzija</span><b>SPT 2.3.0 · produced by GNK ASG</b></div>`;
    grid.append(win);
    cont.append(grid);

    // ================= ADMIN: KORISNICI =================
    if (AUTH.user && AUTH.user.role === "admin") {
      const uc = el("div", "card");
      uc.style.marginTop = "14px";
      uc.style.borderColor = "#5a2a2a";
      uc.innerHTML = `<h3>👥 Korisnici i uloge <span class="badge b-red">samo admin</span></h3>`;
      const t = el("table", "tbl");
      t.innerHTML = `<thead><tr><th>Korisnik</th><th>Uloga</th><th>Klub</th><th>Ime</th><th></th></tr></thead>`;
      const tb = el("tbody");
      const users = await API.get("/api/users");
      for (const u of users) {
        const tr = el("tr", "", `<td><b>${esc(u.username)}</b></td>
          <td><span class="badge ${u.role === "admin" ? "b-red" : u.role === "skaut" ? "b-dim" : "b-cyan"}">${esc(u.role)}</span></td>
          <td class="muted">${esc(u.club || "—")}</td><td class="muted">${esc(u.name || "")}</td>`);
        const del = el("td");
        if (u.username !== "admin") {
          const b = el("div", "btn ghost sm", "🗑");
          b.onclick = async () => {
            if (!confirm(`Obrisati korisnika ${u.username}?`)) return;
            await API.post("/api/users/delete", { id: u.id });
            toast("Korisnik obrisan", "ok");
            VIEWS.postavke.render(cont);
          };
          del.append(b);
        }
        tr.append(del);
        tb.append(tr);
      }
      t.append(tb);
      uc.append(t);

      // novi korisnik forma
      const nf = el("details");
      nf.style.marginTop = "12px";
      nf.innerHTML = `<summary style="cursor:pointer;font-size:13px;color:var(--accent)">➕ Dodaj korisnika</summary>`;
      const fr = el("div", "ctrl-row"); fr.style.cssText = "flex-wrap:wrap;gap:10px;margin-top:10px";
      const mk = (ph, tp) => { const i = el("input"); i.type = tp || "text"; i.placeholder = ph; fr.append(i); return i; };
      const iu = mk("korisničko ime"), ip = mk("PIN", "password"), iname = mk("prikazno ime");
      const ir = el("select");
      for (const [v, l] of [["trener", "trener"], ["kondicijski", "kondicijski"], ["skaut", "skaut"], ["sportas", "sportaš"], ["admin", "admin"]]) {
        const o = el("option"); o.value = v; o.textContent = l; ir.append(o);
      }
      const ic = mk("klub (KLB-…, opciono)");
      fr.append(ir, ic);
      const add = el("div", "btn sm", "💾 Spremi korisnika");
      add.onclick = async () => {
        const r = await API.post("/api/users", { username: iu.value.trim(), pin: ip.value, name: iname.value.trim() || iu.value.trim(), role: ir.value, club: ic.value.trim() || null });
        if (r.error) { toast(r.error, "err"); return; }
        toast("Korisnik dodan ✓", "ok");
        VIEWS.postavke.render(cont);
      };
      fr.append(add);
      nf.append(fr);
      uc.append(nf);
      cont.append(uc);

      // backup + reseed
      const adm = el("div", "card");
      adm.style.marginTop = "14px";
      adm.style.borderColor = "#5a2a2a";
      adm.innerHTML = `<h3>🛡️ Podaci</h3>`;
      const b1 = el("div", "btn", "💾 Preuzmi sigurnosnu kopiju baze (.db)");
      b1.onclick = () => { window.open("/api/admin/backup"); toast("Kopija se preuzima…"); };
      const b2 = el("div", "btn ghost", "♻️ Regeneriraj bazu (reset demo podataka)");
      b2.style.marginLeft = "10px";
      b2.onclick = async () => {
        if (!confirm("Ovo briše sve lokalne izmjene i regenerira demo bazu. Nastaviti?")) return;
        b2.textContent = "⏳ Radim…";
        const r = await API.post("/api/admin/reseed", {});
        b2.textContent = "♻️ Regeneriraj bazu";
        if (r.ok) toast(`Baza regenerirana — ${r.athletes} sportaša`, "ok");
        else toast(r.error || "Greška", "err");
      };
      const rowBtns = el("div");
      rowBtns.style.cssText = "display:flex;gap:10px;flex-wrap:wrap";
      rowBtns.append(b1, b2);
      adm.append(rowBtns);
      cont.append(adm);
    }

    setTimeout(() => {
      const t = document.getElementById("testSnd");
      if (t) t.onclick = () => beep(660);
    }, 0);
  }
};
