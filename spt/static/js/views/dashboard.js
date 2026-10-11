// SPT — Nadzorna ploča (2.0: live mreža + feed)
"use strict";
VIEWS.dashboard = {
  title: "Nadzorna ploča",
  sub: "Pregled cijelog sustava — baza, mreža, utakmice, aktivnosti",
  async render(cont) {
    cont.append(spinner());
    const [meta, dash, meta2, net] = await Promise.all([
      API.get("/api/meta"), API.get("/api/dashboard"), API.get("/api/meta2"), API.get("/api/network/stats")
    ]);
    cont.innerHTML = "";

    // hero mreža
    const hero = el("div", "hero-net");
    hero.innerHTML = `
      <div><div style="font-size:20px;font-weight:900">🌍 SPT mreža — uživo</div>
        <div class="muted" style="font-size:12px;margin-top:4px">82 zemlje · ${net.clubs_online.toLocaleString("hr-HR")} klubova · ${Math.round(net.messages_per_min).toLocaleString("hr-HR")} poruka/min</div></div>
      <div style="display:flex;gap:24px;text-align:right;flex-wrap:wrap">
        <div><div class="big">${net.athletes_online_total.toLocaleString("hr-HR")}</div><div class="lbl">${I18N.t.athletes_online || "sportaša u mreži"}</div></div>
        <div><div class="big" style="color:var(--red)">${net.active_right_now.toLocaleString("hr-HR")}</div><div class="lbl">${I18N.t.active_now || "aktivnih treninga"}</div></div>
        <div><div class="big" style="color:var(--accent2)">${net.sessions_today.toLocaleString("hr-HR")}</div><div class="lbl">${I18N.t.sessions_today || "sesija danas"}</div></div>
      </div>`;
    cont.append(hero);

    // KPI kartice
    const kpis = el("div", "grid g5"); kpis.style.marginTop = "14px";
    const kpiData = [
      [meta.athletes.toLocaleString("hr-HR"), "Sportaša u lokalnoj bazi", `+${meta2.youth} mladih kategorija (12–17)`],
      [meta.sports, "Sportova", "od skijanja i atletike do auto-moto"],
      [meta.sessions.toLocaleString("hr-HR"), "Treninga i utakmica", `${Math.round(dash.total_km).toLocaleString("hr-HR")} km praćeno`],
      [`${meta.metrics}+`, "Vrsta mjerenja", `+ ${meta2.body_comp.toLocaleString("hr-HR")} vaganja · ${meta2.tests.toLocaleString("hr-HR")} testova`],
      [meta.devices, "Uređaja u katalogu", "+ 8 SPT uređaja (vest/pod/watch…)"],
    ];
    for (const [v, l, s] of kpiData) {
      kpis.append(el("div", "card kpi", `<div class="v">${v}</div><div class="l">${l}</div><div class="s">${s}</div>`));
    }
    cont.append(kpis);

    // drugi red: live feed + spremnost + sportovi
    const row = el("div", "grid g3"); row.style.marginTop = "14px";
    const feedCard = el("div", "card");
    feedCard.innerHTML = `<h3>⚡ Mrežni feed <span class="live-dot" style="margin-left:6px"></span></h3>`;
    const feed = el("div", "event-feed");
    function renderFeed(items) {
      feed.innerHTML = items.map(f => `
        <div class="ev"><span class="flag">${flag(f.country)}</span>
          <div style="flex:1"><b>${esc(f.name)}</b> <span class="faint" style="font-size:11px">· ${esc(sportName(f.sport))}</span>
          <div class="faint" style="font-size:11px">${f.type === "match" ? "utakmica" : f.type === "training" ? "trening" : f.type} · ${fmtN(f.km)} km · max ${fmtN(f.top)} km/h · puls ${f.hr}</div></div>
          <div style="text-align:right"><b class="mono" style="color:var(--accent2)">${f.load}</b><div class="faint" style="font-size:10px">AU</div></div>
        </div>`).join("");
    }
    renderFeed(net.feed);
    feedCard.append(feed);
    const feedTimer = setInterval(async () => {
      if (!document.body.contains(feed)) { clearInterval(feedTimer); return; }
      try { const n = await API.get("/api/network/stats"); renderFeed(n.feed); } catch (e) {}
    }, 4000);
    row.append(feedCard);

    // spremnost
    const rdCard = el("div", "card kpi");
    const rd = dash.avg_readiness || 0;
    rdCard.innerHTML = `<h3>Prosječna spremnost baze</h3>
      <div class="v" style="color:${rd > 78 ? "var(--good)" : rd > 65 ? "var(--amber)" : "var(--red)"}">${fmtN(rd, 1)}<span class="u">/100</span></div>
      <div class="progress" style="margin-top:8px"><i style="width:${rd}%; background:${rd > 78 ? "var(--good)" : rd > 65 ? "var(--amber)" : "var(--red)"}"></i></div>
      <div class="s" style="margin-top:8px">${meta2.anomalies.toLocaleString("hr-HR")} anomalija označeno (crveno) · ${meta2.injuries} ozljeda u evidenciji</div>`;
    row.append(rdCard);

    // sportovi distribucija
    const spCard = el("div", "card");
    spCard.innerHTML = `<h3>Sportaši po sportovima (top 12)</h3>`;
    const cv = el("canvas", "chart"); cv.style.height = "260px";
    spCard.append(cv);
    row.append(spCard);
    cont.append(row);
    requestAnimationFrame(() => {
      hbarChart(cv, dash.sports_top.map(([id, n]) => ({ label: sportName(id), value: n })), { fmt: v => Math.round(v) });
    });

    // utakmice + zadnje aktivnosti
    const row2 = el("div", "grid g2"); row2.style.marginTop = "14px";
    const mCard = el("div", "card");
    mCard.innerHTML = `<h3>🎬 Snimljene utakmice — spremne za reprodukciju</h3>`;
    for (const m of dash.matches) {
      const it = el("div", "card", `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
          <div><b style="font-size:15px">${esc(sportName(m.sport))}</b> <span class="badge b-cyan">${esc(m.id)}</span>
            <div class="muted" style="font-size:12px;margin-top:4px">${fmtD(m.date)} · puni pozicijski podaci 1 Hz · ${m.id === "M-001" ? "22" : "10"} igrača + lopta</div></div>
          <div class="mono" style="font-size:22px;font-weight:900">${esc(m.home)} <span style="color:var(--accent)">${esc(m.score)}</span> ${esc(m.away)}</div>
        </div>`);
      it.style.cursor = "pointer";
      it.onclick = () => nav("replay");
      mCard.append(it);
    }
    row2.append(mCard);

    const sCard = el("div", "card");
    sCard.innerHTML = `<h3>Posljednje zabilježene aktivnosti</h3>`;
    const t = el("table", "tbl");
    t.innerHTML = `<thead><tr><th>Sportaš</th><th>Sport</th><th>Vrsta</th><th class="num">km</th><th class="num">max km/h</th><th class="num">Opterećenje</th></tr></thead>`;
    const tb = el("tbody");
    for (const s of dash.recent) {
      const tr = el("tr", "click");
      tr.innerHTML = `<td><span class="flag">${flag(s.country)}</span> ${esc(s.athlete)}</td>
        <td>${esc(sportName(s.sport))}</td>
        <td>${s.type === "match" ? '<span class="badge b-red">UTAKMICA</span>' : s.type === "training" ? '<span class="badge b-blue">TRENING</span>' : s.type === "gym" ? '<span class="badge b-amber">TERETANA</span>' : '<span class="badge b-gr">REGENERACIJA</span>'}</td>
        <td class="num">${fmtN(s.dist)}</td><td class="num">${fmtN(s.top)}</td><td class="num">${s.load ?? "—"}</td>`;
      tr.onclick = () => nav("athletes");
      tb.append(tr);
    }
    t.append(tb);
    sCard.append(t);
    row2.append(sCard);
    cont.append(row2);
  }
};
