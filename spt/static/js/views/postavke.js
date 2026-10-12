// SPT 2.2 — Postavke: izgled, zvuk, kratice, admin akcije, Windows 11
"use strict";
VIEWS.postavke = {
  title: "Postavke",
  sub: "Izgled, zvuk, prečice, sigurnosne kopije i Windows 11 desktop",
  render(cont) {
    cont.innerHTML = "";
    const grid = el("div", "grid g2");

    // ============ IZGLED ============
    const ui = el("div", "card");
    ui.innerHTML = `<h3>🎨 Izgled</h3>`;
    const rowT = el("div", "ctrl-row");
    rowT.append(el("span", "faint", "Tema:"));
    for (const [id, lbl] of [["dark", "🌙 Tamna"], ["light", "☀️ Svijetla"]]) {
      const c = el("div", "chip" + ((localStorage.getItem("spt_theme") || "dark") === id ? " on" : ""), lbl);
      c.onclick = () => { applyTheme(id); rowT.querySelectorAll(".chip").forEach(x => x.classList.remove("on")); c.classList.add("on"); };
      rowT.append(c);
    }
    ui.append(rowT);
    const rowTV = el("div", "ctrl-row");
    rowTV.append(el("span", "faint", "TV način (veliki prikaz):"));
    const tv = el("div", "chip" + (document.body.classList.contains("tv") ? " on" : ""), "📺 " + (document.body.classList.contains("tv") ? "UKLJUČEN" : "isključen"));
    tv.onclick = () => {
      document.body.classList.toggle("tv");
      tv.classList.toggle("on");
      tv.textContent = "📺 " + (document.body.classList.contains("tv") ? "UKLJUČEN" : "isključen");
      localStorage.setItem("spt_tv", document.body.classList.contains("tv") ? "1" : "");
    };
    rowTV.append(tv);
    ui.append(rowTV);
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
    grid.append(ui);

    // ============ ZVUK/DOGAĐAJI ============
    const snd = el("div", "card");
    snd.innerHTML = `<h3>🔊 Zvuk i alarmi</h3>
      <p class="muted" style="font-size:12.5px;line-height:1.65">U <b>Kontrolnoj sobi</b> možeš uključiti zvučni signal kad se pojavi <b style="color:var(--red)">crveni alarm</b>
      (puls u zoni 5, pretjerano opterećenje). Zvono obavijesti uvijek radi tiho (vizualno).</p>
      <div class="mini-stat"><span>Test zvuka</span><b class="link" id="testSnd">▶ pokreni beep</b></div>`;
    grid.append(snd);

    // ============ KRATICE ============
    const kb = el("div", "card");
    kb.innerHTML = `<h3>⌨️ Tipkovničke kratice</h3>
      <div class="mini-stat"><span><b>Ctrl + K</b></span><b>komandna paleta (sportaši, klubovi, ekrani)</b></div>
      <div class="mini-stat"><span><b>?</b></span><b>pomoć / popis kratica</b></div>
      <div class="mini-stat"><span><b>F11</b></span><b>fullscreen (idealno za TV način)</b></div>
      <div class="mini-stat"><span><b>Esc</b></span><b>zatvori modal/paletu</b></div>
      <div class="mini-stat"><span><b>Enter</b></span><b>prvi rezultat u paleti</b></div>`;
    grid.append(kb);

    // ============ WINDOWS 11 ============
    const win = el("div", "card");
    win.innerHTML = `<h3>🖥 Windows 11 desktop</h3>
      <p class="muted" style="font-size:12.5px;line-height:1.7">
      1. Instaliraj <b>Python 3.10+</b> (python.org — obavezno "Add to PATH").<br>
      2. Mapa <span class="mono">spt/</span> → dvoklik <b>start_windows.bat</b> — server se diže na
      <span class="mono">http://localhost:8000</span> i preglednik se sam otvara.<br>
      3. <b>SPT-prečica.bat</b> stvara prečicu na radnoj površini (pokreće cijeli SPT jednim dvoklikom).<br>
      4. Aplikacija radi <b>potpuno offline</b> — nula instalacija, nula ovisnosti.<br>
      5. Za gašenje: zatvori prozor ili <span class="mono">Ctrl+C</span> u konzoli.</p>
      <div class="mini-stat"><span>Verzija</span><b>SPT 2.2.0</b></div>`;
    grid.append(win);

    // ============ ADMIN ============
    if (AUTH.user && AUTH.user.role === "admin") {
      const adm = el("div", "card");
      adm.style.borderColor = "#5a2a2a";
      adm.innerHTML = `<h3>🛡️ Administracija <span class="badge b-red">samo admin</span></h3>`;
      const b1 = el("div", "btn", "💾 Preuzmi sigurnosnu kopiju baze (.db)");
      b1.onclick = () => { window.open("/api/admin/backup"); toast("Kopija se preuzima…"); };
      const b2 = el("div", "btn ghost", "♻️ Regeneriraj bazu (reset demo podataka)");
      b2.style.marginTop = "10px";
      b2.onclick = async () => {
        if (!confirm("Ovo briše sve lokalne izmjene i regenerira demo bazu (1423 sportaša). Nastaviti?")) return;
        b2.textContent = "⏳ Radim…";
        const r = await API.post("/api/admin/reseed", {});
        b2.textContent = "♻️ Regeneriraj bazu (reset demo podataka)";
        if (r.ok) toast(`Baza regenerirana — ${r.athletes} sportaša. Osvježi stranicu.`);
        else toast(r.error || "Greška");
      };
      adm.append(b1, b2);
      const note = el("div", "muted");
      note.style.cssText = "font-size:11.5px;margin-top:10px;line-height:1.5";
      note.textContent = "Kopija je SQLite datoteka — možeš je otvoriti s bilo kojim SQLite alatom ili vratiti zamjenom spt.db.";
      adm.append(note);
      grid.append(adm);
    }
    cont.append(grid);

    setTimeout(() => {
      const t = document.getElementById("testSnd");
      if (t) t.onclick = () => beep(660);
    }, 0);
  }
};
