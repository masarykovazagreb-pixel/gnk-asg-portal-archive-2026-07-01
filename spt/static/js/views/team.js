// SPT — Pregled kluba: dostupnost, roster, anomalije, planovi treninga
"use strict";
VIEWS.team = {
  title: "Pregled kluba",
  sub: "Dostupnost igrača, spremnost, anomalije, ozljede i planovi treninga — sve za jedan klub (šifra)",
  async render(cont, sub) {
    cont.innerHTML = "";
    const ctrl = el("div", "ctrl-row");
    const clubSel = el("select");
    ctrl.append(clubSel);
    cont.append(ctrl);
    const clubs = await API.get("/api/clubs");
    const featured = clubs.filter(c => c.featured);
    const pool = featured.length ? featured : clubs.slice(0, 40);
    for (const c of pool) {
      const o = el("option"); o.value = c.code;
      o.textContent = `${c.code} — ${cname(c.country)} · ${sportName(c.sport)} (${c.n})`;
      clubSel.append(o);
    }
    if (sub) clubSel.value = sub;

    const out = el("div"); out.style.marginTop = "12px";
    cont.append(out);

    async function load() {
      out.innerHTML = ""; out.append(spinner());
      const d = await API.get(`/api/team?club=${clubSel.value}`);
      if (d.error) { out.innerHTML = '<div class="card">Nema podataka.</div>'; return; }
      out.innerHTML = "";
      history.replaceState(null, "", "#team/" + clubSel.value);

      // hero
      const hero = el("div", "hero-net");
      const injured = d.roster.filter(r => !r.available);
      hero.innerHTML = `
        <div><div style="font-size:20px;font-weight:900">🛡️ ${esc(d.club)} <span class="badge b-cyan">${esc(sportName(d.sport))}</span></div>
        <div class="muted" style="font-size:12.5px;margin-top:4px">${d.roster.length} sportaša · prosječna spremnost ${Math.round(d.roster.reduce((a, b) => a + (b.readiness || 0), 0) / Math.max(1, d.roster.length))}/100</div></div>
        <div style="display:flex;gap:26px;text-align:right;flex-wrap:wrap">
          <div><div class="big" style="color:var(--good)">${d.availability}%</div><div class="lbl">DOSTUPNOST</div></div>
          <div><div class="big" style="color:${injured.length ? "var(--red)" : "var(--good)"}">${injured.length}</div><div class="lbl">OZLJEĐENIH</div></div>
          <div><div class="big" style="color:var(--amber)">${d.roster.reduce((a, b) => a + b.critical_anomalies, 0)}</div><div class="lbl">KRITIČNE ANOMALIJE</div></div>
        </div>`;
      out.append(hero);

      const row = el("div", "grid g2"); row.style.marginTop = "14px";

      // opterećenje kluba kroz vrijeme
      const loadCard = el("div", "card");
      loadCard.innerHTML = `<h3>📊 Kolektivno opterećenje (12 tjedana)</h3>`;
      const box = el("div", "chartbox"); const cv = el("canvas", "chart"); box.append(cv);
      loadCard.append(box);
      row.append(loadCard);

      // anomalije kluba
      const anomCard = el("div", "card");
      anomCard.innerHTML = `<h3>🚩 Anomalije u klubu (crvene zastavice)</h3>`;
      const anoms = await API.get(`/api/anomalies?limit=60`);
      const clubAnoms = anoms.items.filter(a => a.club === clubSel.value).slice(0, 8);
      if (!clubAnoms.length) anomCard.append(el("div", "muted", "Nema aktivnih anomalija. ✅"));
      for (const a of clubAnoms) {
        anomCard.append(el("div", "", `<div style="font-size:12.5px;padding:6px 0;border-bottom:1px solid #14203355">
          <b class="link" data-aid="${a.athlete}">${esc(a.name)}</b>: ${esc(a.msg)}</div>`));
      }
      anomCard.querySelectorAll("[data-aid]").forEach(x => x.onclick = () => nav("karton", x.dataset.aid));
      row.append(anomCard);
      out.append(row);

      // AI rizik ozljede (SPT 2.5)
      try {
        const risk = await API.get(`/api/analysis/risk?club=${clubSel.value}`);
        if (risk.items.length) {
          const rCard = el("div", "card"); rCard.style.marginTop = "14px";
          rCard.innerHTML = `<h3>🤖 AI procjena rizika ozljede <span class="badge b-red">${risk.high} visok</span> <span class="badge b-amber">${risk.moderate} umjeren</span>
            <span class="faint" style="font-weight:400;font-size:11px;float:right">model: ACWR + spremnost + wellness + asimetrija + povijest</span></h3>`;
          const rt = el("table", "tbl");
          rt.innerHTML = `<thead><tr><th>Igrač</th><th style="width:30%">Rizik</th><th class="num">score</th><th>Čimbenici</th></tr></thead>`;
          const rtb = el("tbody");
          for (const r of risk.items.slice(0, 12)) {
            const col = r.level === "visok" ? "var(--red)" : r.level === "umjeren" ? "var(--amber)" : "var(--good)";
            rtb.append(el("tr", "click", `<td><b>${esc(r.name)}</b> <span class="faint">${esc(r.pos || "")}</span></td>
              <td><div class="progress"><i style="width:${r.risk}%;background:${col}"></i></div></td>
              <td class="num" style="color:${col}"><b>${r.risk}</b></td>
              <td class="muted" style="font-size:11.5px">${r.factors.map(esc).join(" · ") || "—"}</td>`));
          }
          rt.append(rtb);
          rCard.append(rt);
          out.append(rCard);
        }
      } catch (e) {}

      // roster tablica
      const rosterCard = el("div", "card"); rosterCard.style.marginTop = "14px";
      rosterCard.innerHTML = `<h3>👥 Roster — spremnost i status</h3>`;
      const t = el("table", "tbl");
      t.innerHTML = `<thead><tr><th>Igrač</th><th>Poz.</th><th class="num">god.</th><th class="num">sesija</th>
        <th style="width:26%">Spremnost</th><th class="num">km/ses</th><th class="num">opter.</th><th>Status</th></tr></thead>`;
      const tb = el("tbody");
      for (const r of [...d.roster].sort((a, b) => (a.readiness || 0) - (b.readiness || 0))) {
        const tr = el("tr", "click");
        const rd = r.readiness || 0;
        tr.innerHTML = `<td><b>${esc(r.name)}</b>${r.squad ? ` <span class="badge b-dim">${esc(r.squad)}</span>` : ""}</td>
          <td class="muted">${esc(r.position)}</td><td class="num">${r.age}</td><td class="num">${r.n_sessions}</td>
          <td><div class="progress"><i class="${rd < 65 ? "r" : rd > 80 ? "g" : ""}" style="width:${rd}%"></i></div></td>
          <td class="num">${fmtN((r.load || 0) / Math.max(1, r.n_sessions) * 0.02, 1)}</td><td class="num">${r.load || "—"}</td>
          <td>${r.active_injury ? '<span class="badge b-red">🚑 OZLJEDA</span>' : r.critical_anomalies ? '<span class="badge b-amber">⚠️ ANOMALIJA</span>' : '<span class="badge b-gr">✅ SPREMAN</span>'}</td>`;
        tr.onclick = () => nav("karton", r.id);
        tb.append(tr);
      }
      t.append(tb);
      rosterCard.append(t);
      out.append(rosterCard);

      // planovi treninga
      const planCard = el("div", "card"); planCard.style.marginTop = "14px";
      const plans = await API.get(`/api/plans?club=${clubSel.value}`);
      planCard.innerHTML = `<h3>📅 Planovi treninga (${plans.plans.length}) <span class="faint" style="font-weight:400;float:right">klikni dan za detalje</span></h3>`;
      const pgrid = el("div", "grid g4");
      for (const p of plans.plans) {
        const pc = el("div", "card");
        pc.style.cursor = "pointer";
        pc.innerHTML = `<b style="font-size:13px">${fmtD(p.pdate)}</b>
          <div class="muted" style="font-size:11.5px;margin-top:3px">${esc(p.title)} · ${esc(p.focus)}</div>
          <div class="progress" style="margin-top:8px"><i style="width:${p.done_pct}%"></i></div>
          <div class="faint" style="font-size:10.5px;margin-top:4px">${p.items.length} jedinica · ${p.done_pct}% završeno · ${p.total_load} AU</div>`;
        pc.onclick = () => planDetail(p);
        pgrid.append(pc);
      }
      if (!plans.plans.length) planCard.append(el("div", "muted", "Nema planova za klub (planove unose trener/kondicijski trener)."));
      planCard.append(pgrid);
      out.append(planCard);

      function planDetail(p) {
        const modal = el("div");
        modal.style.cssText = "position:fixed;inset:0;background:#04070ccc;z-index:70;display:flex;align-items:center;justify-content:center;padding:20px";
        const card = el("div", "card");
        card.style.cssText = "max-width:600px;width:100%;max-height:86vh;overflow-y:auto;background:#0d1522";
        card.innerHTML = `<h3>📅 ${fmtD(p.pdate)} — ${esc(p.title)} <span class="badge b-dim">${esc(p.coach)}</span></h3>`;
        const t2 = el("table", "tbl");
        t2.innerHTML = `<thead><tr><th>Vrijeme</th><th>Jedinica</th><th>Intenzitet</th><th class="num">min</th><th class="num">AU</th><th></th></tr></thead>`;
        const tb2 = el("tbody");
        for (const it of p.items) {
          const tr = el("tr", "", `<td class="mono muted">${esc(it.time_min)}</td><td><b>${esc(it.drill)}</b></td>
            <td>${it.intensity === "maksimalno" ? '<span class="badge b-red">MAKS</span>' : it.intensity === "visoko" ? '<span class="badge b-amber">VISOKO</span>' : it.intensity === "srednje" ? '<span class="badge b-blue">SREDNJE</span>' : '<span class="badge b-gr">NISKO</span>'}</td>
            <td class="num">${it.duration_min}</td><td class="num">${it.load_au}</td><td></td>`);
          const chk = el("input"); chk.type = "checkbox"; chk.checked = !!it.done;
          chk.onchange = async () => {
            await API.post("/api/plans/item", { id: it.id, done: chk.checked ? 1 : 0 });
            load();
          };
          tr.lastElementChild.append(chk);
          tb2.append(tr);
        }
        t2.append(tb2);
        card.append(t2);
        const close = el("div", "btn ghost sm", "Zatvori");
        close.style.cssText = "margin-top:12px;width:100%";
        close.onclick = () => { modal.remove(); load(); };
        card.append(close);
        modal.append(card);
        modal.onclick = e => { if (e.target === modal) modal.remove(); };
        document.body.append(modal);
      }

      requestAnimationFrame(() => {
        lineChart(cv, {
          labels: d.weeks.map(w => fmtD(w.w).slice(0, 5)),
          series: [{ name: "kolektivno opterećenje (AU)", color: "#38d6f5", values: d.weeks.map(w => w.load) }],
          xEvery: 2
        });
      });
    }
    clubSel.onchange = load;
    load();
  }
};
