// SPT — Sportaši: popis + detaljni profil
"use strict";
VIEWS.athletes = {
  title: "Sportaši",
  sub: "Baza od 1 200+ sportaša iz cijelog svijeta — sve discipline, svi klubovi pod šiframa",
  async render(cont) {
    cont.append(spinner());
    const sports = await API.get("/api/sports");
    const cs = await API.get("/api/countries");
    cont.innerHTML = "";
    this.page = 1;

    const ctrl = el("div", "ctrl-row");
    const search = el("input"); search.type = "search"; search.placeholder = "🔎 Traži po imenu..."; search.style.minWidth = "220px";
    const spSel = el("select");
    spSel.append(el("option", "", "🏟 svi sportovi"));
    for (const s of sports) { const o = el("option"); o.value = s.id; o.textContent = `${s.hr} (${s.count})`; spSel.append(o); }
    const cSel = el("select");
    cSel.append(el("option", "", "🌍 sve zemlje"));
    for (const c of cs) { const o = el("option"); o.value = c.code; o.textContent = c.flag + " " + c.name; cSel.append(o); }
    const sexSel = el("select");
    sexSel.innerHTML = `<option value="">osobe: sve</option><option value="M">muškarci</option><option value="F">žene</option>`;
    ctrl.append(search, spSel, cSel, sexSel);
    cont.append(ctrl);

    // favoriti + nedavno (SPT 2.3)
    const favs = favList(), rec = recentList().filter(r => !favs.includes(r.id));
    if (favs.length || rec.length) {
      const fr = el("div", "pill-row");
      fr.style.marginTop = "10px";
      if (favs.length) {
        const wrapF = el("span", "");
        wrapF.innerHTML = `<span class="faint" style="font-size:11px;margin-right:4px">★ favoriti:</span> `;
        fr.append(wrapF);
        for (const id of favs) {
          API.get(`/api/athletes/${id}`).then(a => {
            if (a && a.name) {
              const c = el("div", "chip on", `★ ${esc(a.name)}`);
              c.style.cursor = "pointer";
              c.onclick = () => nav("karton", id);
              wrapF.append(c);
            }
          }).catch(() => {});
        }
      }
      if (rec.length) {
        const wrapR = el("span", "");
        wrapR.innerHTML = `<span class="faint" style="font-size:11px;margin-right:4px">🕑 nedavno:</span> `;
        fr.append(wrapR);
        for (const r of rec.slice(0, 5)) {
          const c = el("div", "chip", esc(r.name));
          c.style.cursor = "pointer";
          c.onclick = () => nav("karton", r.id);
          wrapR.append(c);
        }
      }
      cont.append(fr);
    }

    const card = el("div", "card");
    cont.append(card);
    const self = this;

    async function load() {
      card.innerHTML = ""; card.append(spinner());
      const p = new URLSearchParams({ q: search.value, sport: spSel.value, country: cSel.value, sex: sexSel.value, page: self.page, size: 30 });
      const d = await API.get("/api/athletes?" + p.toString());
      card.innerHTML = `<h3>${d.total.toLocaleString("hr-HR")} sportaša${self.page > 1 ? ` · stranica ${self.page}` : ""}</h3>`;
      const t = el("table", "tbl");
      t.innerHTML = `<thead><tr><th>Sportaš</th><th></th><th>Sport</th><th>Pozicija</th><th>Klub</th><th class="num">god.</th><th class="num">max km/h</th><th class="num">km/aktiv.</th><th class="num">spremn.</th></tr></thead>`;
      const tb = el("tbody");
      for (const a of d.items) {
        const tr = el("tr", "click");
        tr.innerHTML = `<td><b>${esc(a.name)}</b></td>
          <td><span class="flag">${flag(a.country)}</span></td>
          <td>${esc(sportName(a.sport))}</td><td class="muted">${esc(a.position || "—")}</td>
          <td class="mono muted">${esc(a.club)}</td><td class="num">${a.age}</td>
          <td class="num">${a.top ? fmtN(a.top) : "—"}</td><td class="num">${a.dist ? fmtN(a.dist) : "—"}</td>
          <td class="num" style="color:${a.readiness > 78 ? "var(--good)" : a.readiness > 65 ? "var(--amber)" : "var(--red)"}">${a.readiness ? Math.round(a.readiness) : "—"}</td>`;
        tr.onclick = () => nav("karton", a.id);
        tb.append(tr);
      }
      t.append(tb);
      const wrap = el("div", "scroll-x"); wrap.append(t);
      card.append(wrap);
      const pager = el("div", "pager");
      const prev = el("div", "btn ghost sm", "← natrag");
      const next = el("div", "btn ghost sm", "naprijed →");
      prev.onclick = () => { if (self.page > 1) { self.page--; load(); } };
      next.onclick = () => { if (self.page * 30 < d.total) { self.page++; load(); } };
      pager.append(prev, el("span", "", `${self.page} / ${Math.ceil(d.total / 30)}`), next);
      card.append(pager);
    }
    search.addEventListener("input", debounce(() => { self.page = 1; load(); }, 250));
    spSel.onchange = () => { self.page = 1; load(); };
    cSel.onchange = () => { self.page = 1; load(); };
    sexSel.onchange = () => { self.page = 1; load(); };
    load();
  }
};

// (profil je sada Karton — vidi karton.js)

