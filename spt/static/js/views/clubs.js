// SPT — Klubovi (pod šiframa), sportovi i mjerenja, uređaji
"use strict";
VIEWS.clubs = {
  title: "Klubovi",
  sub: "Svi klubovi u bazi vode se isključivo pod šiframa — identitet je zaštićen",
  async render(cont) {
    cont.append(spinner());
    const clubs = await API.get("/api/clubs");
    cont.innerHTML = "";
    const info = el("div", "card", `<h3>🔐 Politika šifriranja</h3>
      <p class="muted" style="font-size:13px;line-height:1.6">Klubovi su anonimizirani kodom oblika <code class="mono">KLB-XXXX</code> (npr. <b class="mono">${esc(clubs[0]?.code || "KLB-A1B2")}</b>).
      Poznati su samo: zemlja, razina natjecanja i sport. Imena klubova, gradovi i stadioni nisu pohranjeni —
      analize i usporedbe rade jednako dobro i bez otkrivanja identiteta.</p>`);
    info.style.marginBottom = "14px";
    cont.append(info);

    const grid = el("div", "grid g4");
    for (const c of clubs) {
      const card = el("div", "card club-card");
      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:start">
          <div class="mono" style="font-size:17px;font-weight:800;color:var(--accent)">${esc(c.code)}</div>
          ${c.featured ? '<span class="badge b-amber">ISTAKNUT</span>' : ""}
        </div>
        <div class="muted" style="font-size:12px;margin-top:6px">
          <span class="flag">${flag(c.country)}</span> ${esc(cname(c.country))}<br>
          ${esc(c.level)}<br>${esc(sportName(c.sport))}
        </div>
        <div style="margin-top:10px;font-size:12.5px"><b>${c.n}</b> sportaša u registru</div>`;
      card.onclick = () => clubDetail(c.code);
      grid.append(card);
    }
    cont.append(grid);

    async function clubDetail(code) {
      const c = await API.get(`/api/clubs/${code}`);
      if (c.error) return;
      const modal = el("div", "", "");
      modal.style.cssText = "position:fixed;inset:0;background:#04070ccc;z-index:60;display:flex;align-items:center;justify-content:center;padding:20px";
      const card = el("div", "card");
      card.style.cssText = "max-width:760px;width:100%;max-height:86vh;overflow-y:auto;background:#0d1522";
      card.innerHTML = `<h3>🔐 ${esc(c.code)} — ${esc(cname(c.country))}</h3>
        <div class="muted" style="font-size:12.5px;margin-bottom:12px">${esc(c.level)} · ${esc(sportName(c.sport))} · ${c.roster.length} sportaša</div>`;
      const t = el("table", "tbl");
      t.innerHTML = `<thead><tr><th>Sportaš</th><th></th><th>Poz.</th><th class="num">god.</th><th class="num">max km/h</th><th class="num">spremn.</th></tr></thead>`;
      const tb = el("tbody");
      for (const r of c.roster) {
        const tr = el("tr", "click");
        tr.innerHTML = `<td><b>${esc(r.name)}</b></td><td><span class="flag">${flag(r.country)}</span></td>
          <td class="muted">${esc(r.position)}</td><td class="num">${r.age}</td>
          <td class="num">${r.top ? fmtN(r.top) : "—"}</td>
          <td class="num" style="color:${r.readiness > 78 ? "var(--good)" : r.readiness > 65 ? "var(--amber)" : "var(--red)"}">${r.readiness ? Math.round(r.readiness) : "—"}</td>`;
        tr.onclick = () => { modal.remove(); nav("athlete", r.id); };
        tb.append(tr);
      }
      t.append(tb);
      card.append(t);
      const close = el("div", "btn ghost sm", "Zatvori");
      close.style.marginTop = "12px";
      close.onclick = () => modal.remove();
      card.append(close);
      modal.append(card);
      modal.onclick = e => { if (e.target === modal) modal.remove(); };
      document.body.append(modal);
    }
  }
};
