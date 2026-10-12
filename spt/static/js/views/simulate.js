// SPT — Simulacije: rekonstrukcija unatrag + projekcija unaprijed + what-if
"use strict";
VIEWS.simulate = {
  title: "Simulacije",
  sub: "Rekonstrukcija prošlosti (unatrag) i predviđanje (unaprijed) — opterećenje, rizik od ozljede, forma",
  async render(cont) {
    cont.innerHTML = "";
    const card = el("div", "card");
    card.append(el("h3", "", "🔮 Odaberi sportaša za simulaciju"));
    const picker = athletePicker(a => run(a.id));
    card.append(picker);
    cont.append(card);
    const out = el("div");
    out.style.marginTop = "14px";
    cont.append(out);

    async function run(aid, extra = 0) {
      out.innerHTML = ""; out.append(spinner());
      const d = await API.get(`/api/simulate?athlete=${aid}&extra=${extra}`);
      if (d.error) { out.innerHTML = '<div class="card">Nema podataka.</div>'; return; }
      out.innerHTML = "";

      // hero
      const hero = el("div", "card", `
        <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">
          <div class="player-dot-demo" style="background:linear-gradient(135deg,#0e7490,#38d6f5)">🔮</div>
          <div>
            <b style="font-size:16px">${esc(d.athlete.name)}</b>
            <span class="badge b-cyan" style="margin-left:8px">${esc(sportName(d.athlete.sport))}</span>
            <span class="badge b-dim" style="margin-left:4px">${esc(d.athlete.position)}</span>
            <div class="muted" style="font-size:12px;margin-top:4px">klub <b class="mono">${esc(d.athlete.club)}</b> · ${esc(cname(d.athlete.country))}</div>
          </div>
          <div style="margin-left:auto;text-align:right">
            <div class="muted" style="font-size:11px;letter-spacing:1px">ACWR (sada)</div>
            <div style="font-size:26px;font-weight:900;color:${d.acwr > 1.4 ? "var(--red)" : d.acwr < 0.8 ? "var(--amber)" : "var(--good)"}">${d.acwr}</div>
            <div class="faint" style="font-size:10.5px">kronično ${d.chronic} AU · akutno ${d.acute} AU</div>
          </div>
        </div>`);
      out.append(hero);

      const row = el("div", "grid g2"); row.style.marginTop = "14px";

      // ---- unatrag: tjedno opterećenje ----
      const back = el("div", "card");
      back.innerHTML = `<h3>⏪ Rekonstrukcija unatrag — 12 tjedana opterećenja</h3>`;
      const bc = el("div", "chartbox"); const bcv = el("canvas", "chart"); bc.append(bcv);
      back.append(bc);
      row.append(back);

      // ---- unaprijed: projekcija ----
      const fwd = el("div", "card");
      fwd.innerHTML = `<h3>⏩ Projekcija unaprijed — 4 tjedna <span class="faint" style="font-weight:400">(pojas = nesigurnost modela)</span></h3>`;
      const fc = el("div", "chartbox"); const fcv = el("canvas", "chart"); fc.append(fcv);
      fwd.append(fc);
      // what-if kontrola
      const wi = el("div", "", `
        <div style="display:flex;justify-content:space-between;font-size:12px" class="muted">
          <span><b>WHAT-IF:</b> promjena obujma treninga</span><b id="wiVal" style="color:var(--accent)">0%</b></div>`);
      const wiIn = el("input"); wiIn.type = "range"; wiIn.min = -30; wiIn.max = 30; wiIn.step = 5; wiIn.value = extra;
      wi.append(wiIn);
      wi.style.marginTop = "12px";
      wiIn.oninput = debounce(() => run(aid, +wiIn.value), 300);
      fwd.append(wi);
      row.append(fwd);
      out.append(row);

      // ---- rizik tablica + zastavice ----
      const row2 = el("div", "grid g2"); row2.style.marginTop = "14px";
      const riskCard = el("div", "card");
      let rh = `<h3>⚠️ Projekcija rizika od ozljede i forme</h3>
        <table class="tbl"><thead><tr><th>Tjedan</th><th class="num">Planirano opter. (AU)</th><th class="num">ACWR</th><th style="width:34%">Rizik</th><th class="num">Indeks forme</th></tr></thead><tbody>`;
      for (const p of d.projection) {
        const rc = p.risk > 40 ? "var(--red)" : p.risk > 20 ? "var(--amber)" : "var(--good)";
        rh += `<tr><td><b>T+${p.w}</b></td><td class="num">${p.load}</td><td class="num">${p.acwr}</td>
          <td><div class="progress"><i class="${p.risk > 40 ? "r" : ""}" style="width:${p.risk}%;background:${rc}"></i></div></td>
          <td class="num" style="color:${p.perf > 75 ? "var(--good)" : p.perf > 60 ? "var(--amber)" : "var(--red)"}">${p.perf}</td></tr>`;
      }
      rh += `</tbody></table>`;
      riskCard.innerHTML = rh;
      row2.append(riskCard);

      const flagCard = el("div", "card");
      flagCard.innerHTML = `<h3>🚩 Povijesne crvene zastavice (unatrag)</h3>`;
      const feed = el("div", "event-feed");
      if (!d.flags.length) feed.append(el("div", "muted", "Nema značajnih upozorenja u povijesti. 👍"));
      for (const f of d.flags) {
        feed.append(el("div", "ev", `<span class="t">${fmtD(f.date).slice(0, 5)}</span><span>${esc(f.text)}</span>`));
      }
      flagCard.append(feed);
      const recHead = el("h3", "", "💡 Preporuke sustava");
      recHead.style.marginTop = "14px";
      flagCard.append(recHead);
      const recs = el("div", "");
      for (const r of d.recs) {
        const div = el("div", "", `➤ ${esc(r)}`);
        div.style.cssText = "font-size:13px;color:var(--text);padding:6px 0;border-bottom:1px solid #14203355;line-height:1.5";
        recs.append(div);
      }
      flagCard.append(recs);
      row2.append(flagCard);
      out.append(row2);

      // grafikoni
      requestAnimationFrame(() => {
        lineChart(bcv, {
          labels: d.weeks.map(w => fmtD(w.w).slice(0, 5)),
          series: [{ name: "tjedno opterećenje (AU)", color: "#38d6f5", values: d.weeks.map(w => w.load) }],
          xEvery: 2
        });
        lineChart(fcv, {
          labels: [...d.weeks.map(w => fmtD(w.w).slice(0, 5)), ...d.projection.map(p => "T+" + p.w)],
          series: [
            { name: "povijest", color: "#38d6f5", values: [...d.weeks.map(w => w.load), ...Array(d.projection.length).fill(null).map((_, i) => i === 0 ? d.weeks[d.weeks.length - 1].load : null)] },
            { name: "projekcija", color: "#a3e635", values: [...Array(d.weeks.length - 1).fill(null), d.weeks[d.weeks.length - 1].load, ...d.projection.map(p => p.load)], lo: [...Array(d.weeks.length - 1).fill(null), d.projection[0].lo, ...d.projection.map(p => p.lo)], hi: [...Array(d.weeks.length - 1).fill(null), d.projection[0].hi, ...d.projection.map(p => p.hi)], dash: true }
          ],
          xEvery: 2
        });
      });
    }

    // prethodno odabrani (iz profila sportaša)
    const pre = sessionStorage.getItem("spt_sim_aid");
    if (pre) { sessionStorage.removeItem("spt_sim_aid"); run(pre); }
  }
};
