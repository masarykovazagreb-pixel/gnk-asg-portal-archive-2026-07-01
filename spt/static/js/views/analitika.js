// SPT 2.4 — Napredna analitika: trendovi, pozicije, doba, raspršenje, konzistentnost, balans, wellness, ozljede
"use strict";
VIEWS.analitika = {
  title: "Napredna analitika",
  sub: "Trendovi · po pozicijama · dobne krivulje · raspršenje · konzistentnost · balans opterećenja · wellness vs forma · teret ozljeda",
  render(cont) {
    cont.innerHTML = "";
    const self = this;

    const METRICS = [
      ["dist_total", "Kilometri po sesiji"], ["top_speed", "Najveća brzina"], ["hr_avg", "Prosječni puls"],
      ["hr_max", "Maksimalni puls"], ["sprints", "Sprintevi"], ["srpe", "Opterećenje (AU)"],
      ["readiness", "Spremnost"], ["lactate", "Laktat"], ["stride_len", "Dužina koraka"]
    ];
    const metricSel = (def) => {
      const s = el("select");
      for (const [v, l] of METRICS) { const o = el("option"); o.value = v; o.textContent = l; s.append(o); }
      s.value = def;
      return s;
    };
    const sportSelAsync = async (def) => {
      const s = el("select");
      const sports = await API.get("/api/sports");
      for (const sp of sports) { const o = el("option"); o.value = sp.id; o.textContent = `${sp.hr} (${sp.count})`; s.append(o); }
      s.value = def;
      return s;
    };

    const tabs = el("div", "tabs");
    const TABS = [["📈 Trend", tabTrend], ["📦 Pozicije", tabPositions], ["🎂 Dobne krivulje", tabAges],
      ["⚬ Raspršenje", tabScatter], ["🎯 Konzistentnost", tabConsistency], ["⚖️ Balans", tabBalance],
      ["🧘 Wellness vs forma", tabWellness], ["🚑 Teret ozljeda", tabBurden]];
    const chips = TABS.map(([lbl]) => el("div", "chip", lbl));
    chips[0].classList.add("on");
    TABS.forEach(([, fn], i) => chips[i].onclick = () => {
      chips.forEach(c => c.classList.remove("on"));
      chips[i].classList.add("on");
      body.innerHTML = "";
      fn(body);
    });
    tabs.append(...chips);
    cont.append(tabs);
    const body = el("div"); body.style.marginTop = "12px";
    cont.append(body);
    TABS[0][1](body);

    // ============ 1) TREND ============
    async function tabTrend(body) {
      const card = el("div", "card");
      card.append(el("h3", "", "📈 Trend metrike kroz vrijeme"));
      card.append(el("p", "muted", "Odaberi sportaša i metriku — SPT crta niz sesija s procjenom trenda (regresija), promjenom u % i verdiktom."));
      const row = el("div", "ctrl-row"); row.style.flexWrap = "wrap";
      const picked = el("div", "muted", "— niste odabrali —");
      const ms = metricSel("top_speed");
      row.append(ms);
      card.append(row);
      card.append(athletePicker(async a => { picked.innerHTML = `✅ <b>${esc(a.name)}</b>`; load(a.id); }));
      const out = el("div"); out.style.marginTop = "12px";
      card.append(out);
      body.append(card);

      async function load(aid) {
        out.innerHTML = ""; out.append(spinner());
        const d = await API.get(`/api/analysis/trend?athlete=${aid}&metric=${ms.value}`);
        out.innerHTML = "";
        if (d.error || !d.points.length) { out.append(el("div", "muted", "Nema dovoljno podataka za trend (min. 3 sesije).")); return; }
        const ml = (METRICS.find(m => m[0] === ms.value) || [, ms.value])[1];
        const vCol = d.verdict === "modra" ? "var(--good)" : d.verdict === "crvena" ? "var(--red)" : "var(--dim)";
        const vTxt = d.verdict === "modra" ? "📈 NAPREDAK" : d.verdict === "crvena" ? "📉 PAD" : "➡️ STABILNO";
        out.append(el("div", "pill-row", `
          <span class="chip on" style="color:${vCol}">${vTxt}</span>
          <span class="chip">promjena <b style="color:${vCol};margin-left:4px">${d.change_pct > 0 ? "+" : ""}${fmtN(d.change_pct)}%</b></span>
          <span class="chip">trend <b style="margin-left:4px">${d.slope_per_week > 0 ? "+" : ""}${fmtN(d.slope_per_week, 2)}/tj</span></span>
          <span class="chip">${d.n} sesija</span>`));
        const box = el("div", "chartbox");
        const cv = el("canvas", "chart"); box.append(cv);
        out.append(box);
        requestAnimationFrame(() => lineChart(cv, {
          labels: d.points.map(p => p[0].slice(5)),
          series: [{ name: ml, color: d.verdict === "crvena" ? "#ff5a5f" : "#38d6f5", values: d.points.map(p => p[1]) }],
          xEvery: Math.max(1, Math.floor(d.points.length / 10))
        }));
      }
      ms.onchange = () => { if (out.querySelector("canvas")) { /* ponovi s istim sportašem */ } };
    }

    // ============ 2) POZICIJE (box plot) ============
    async function tabPositions(body) {
      const card = el("div", "card");
      card.append(el("h3", "", "📦 Raspodjela po pozicijama (P10–P90)"));
      const row = el("div", "ctrl-row");
      const sp = await sportSelAsync("nogomet");
      const ms = metricSel("dist_total");
      row.append(sp, ms);
      card.append(row);
      const out = el("div"); out.style.marginTop = "12px";
      card.append(out);
      body.append(card);
      async function load() {
        out.innerHTML = ""; out.append(spinner());
        const d = await API.get(`/api/analysis/positions?sport=${sp.value}&metric=${ms.value}`);
        out.innerHTML = "";
        if (!d.items.length) { out.append(el("div", "muted", "Nema dovoljno podataka.")); return; }
        const lo = Math.min(...d.items.map(i => i.p10));
        const hi = Math.max(...d.items.map(i => i.p90));
        const pos = v => (v - lo) / (hi - lo) * 100;
        for (const it of d.items) {
          const r = el("div", "box-row");
          r.innerHTML = `
            <span class="bl">${esc(it.pos)} <span class="faint" style="font-size:10px">n=${it.n}</span></span>
            <div class="bt" title="P10 ${it.p10} · P25 ${it.p25} · P50 ${it.p50} · P75 ${it.p75} · P90 ${it.p90}">
              <div class="bw" style="left:${pos(it.p10)}%;width:${Math.max(2, pos(it.p90) - pos(it.p10))}%"></div>
              <div class="bq" style="left:${pos(it.p25)}%;width:${Math.max(1, pos(it.p75) - pos(it.p25))}%"></div>
              <div class="bm" style="left:${pos(it.p50)}%"></div>
            </div>
            <span class="bv mono">${fmtN(it.p50)} ${esc(d.unit || "")}</span>`;
          out.append(r);
        }
        out.append(el("div", "cal-legend", `<span class="faint" style="font-size:11px">široka traka = raspon P10–P90 · tamniji = P25–P75 · crta = medijana (P50) · hover za brojeve</span>`));
      }
      sp.onchange = load; ms.onchange = load;
      load();
    }

    // ============ 3) DOBNE KRIVULJE ============
    async function tabAges(body) {
      const card = el("div", "card");
      card.append(el("h3", "", "🎂 Dobne krivulje — prosjek metrike po dobi"));
      const row = el("div", "ctrl-row");
      const sp = await sportSelAsync("nogomet");
      const ms = metricSel("top_speed");
      row.append(sp, ms);
      card.append(row);
      const out = el("div"); out.style.marginTop = "12px";
      card.append(out);
      body.append(card);
      async function load() {
        out.innerHTML = ""; out.append(spinner());
        const d = await API.get(`/api/analysis/ages?sport=${sp.value}&metric=${ms.value}`);
        out.innerHTML = "";
        if (!d.items.length) { out.append(el("div", "muted", "Nema dovoljno podataka.")); return; }
        if (d.peak) {
          out.append(el("div", "pill-row", `<span class="chip on">🏆 vrhunac: <b style="margin-left:4px">${esc(d.peak.label)} god.</b> (${fmtN(d.peak.avg)} ${esc(d.unit || "")})</span>
            <span class="chip">${d.items.map(i => `${i.label}: ${i.n}`).join(" · ")}</span>`));
        }
        const box = el("div", "chartbox");
        const cv = el("canvas", "chart"); box.append(cv);
        out.append(box);
        requestAnimationFrame(() => lineChart(cv, {
          labels: d.items.map(i => i.label),
          series: [{ name: d.name + (d.unit ? " (" + d.unit + ")" : ""), color: "#a3e635", values: d.items.map(i => i.avg) }]
        }));
      }
      sp.onchange = load; ms.onchange = load;
      load();
    }

    // ============ 4) RASPRŠENJE ============
    async function tabScatter(body) {
      const card = el("div", "card");
      card.append(el("h3", "", "⚬ Dijagram raspršenja — metrika vs metrika"));
      card.append(el("p", "muted", "Svaka točka je sportaš (boja = spol). Prijeci mišem pokaže ime, klik otvara karton. r = Pearsonova korelacija."));
      const row = el("div", "ctrl-row"); row.style.flexWrap = "wrap";
      const sp = await sportSelAsync("nogomet");
      const mx = metricSel("dist_total");
      const my = metricSel("top_speed");
      row.append(sp, mx, el("span", "faint", "vs"), my);
      card.append(row);
      const out = el("div"); out.style.marginTop = "12px";
      card.append(out);
      body.append(card);
      async function load() {
        out.innerHTML = ""; out.append(spinner());
        const d = await API.get(`/api/analysis/scatter?sport=${sp.value}&x=${mx.value}&y=${my.value}`);
        out.innerHTML = "";
        if (!d.points.length) { out.append(el("div", "muted", "Nema podataka.")); return; }
        const rCol = Math.abs(d.r) > 0.5 ? "var(--good)" : Math.abs(d.r) > 0.25 ? "var(--amber)" : "var(--dim)";
        out.append(el("div", "pill-row", `
          <span class="chip on">n = ${d.n}</span>
          <span class="chip">r = <b style="color:${rCol};margin-left:4px">${d.r}</b></span>
          <span class="chip">${esc(d.xname)} → ${esc(d.yname)}</span>`));
        out.append(scatterChart(d));
      }
      sp.onchange = load; mx.onchange = load; my.onchange = load;
      load();
    }

    // ============ 5) KONZISTENTNOST ============
    async function tabConsistency(body) {
      const card = el("div", "card");
      card.append(el("h3", "", "🎯 Konzistentnost — ko je najstabilniji (varijabilnost CV)"));
      card.append(el("p", "muted", "CV = standardna devijacija / prosjek. Nizak CV = svaka sesija slična (pouzdani igrač); visok CV = «boom or bust» profil."));
      const row = el("div", "ctrl-row");
      const sp = await sportSelAsync("nogomet");
      const ms = metricSel("dist_total");
      row.append(sp, ms);
      card.append(row);
      const out = el("div"); out.style.marginTop = "12px";
      card.append(out);
      body.append(card);
      async function load() {
        out.innerHTML = ""; out.append(spinner());
        const d = await API.get(`/api/analysis/consistency?sport=${sp.value}&metric=${ms.value}`);
        out.innerHTML = "";
        if (!d.most_consistent.length) { out.append(el("div", "muted", "Nema dovoljno podataka (min. 8 sesija).")); return; }
        const grid = el("div", "grid g2");
        const mk = (title, items, col, ico) => {
          const c = el("div", "card");
          c.innerHTML = `<h3>${ico} ${title}</h3>`;
          const mx = Math.max(...items.map(i => i.cv), 1);
          for (const it of items.slice(0, 8)) {
            c.append(el("div", "zone-bar", `<span class="zlbl" style="width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(it.name)}">${esc(it.name)}</span>
              <div class="zb"><i style="width:${Math.round(it.cv / mx * 100)}%;background:${col}"></i></div>
              <b>CV ${fmtN(it.cv)}%</b>`));
          }
          return c;
        };
        grid.append(mk("Najkonzistentniji", d.most_consistent, "var(--good)", "🟢"),
          mk("Najvarijabilniji", d.most_variable, "var(--red)", "🔴"));
        out.append(grid);
      }
      sp.onchange = load; ms.onchange = load;
      load();
    }

    // ============ 6) BALANS ============
    async function tabBalance(body) {
      const card = el("div", "card");
      card.append(el("h3", "", "⚖️ Balans opterećenja po klubovima (28 dana)"));
      card.append(el("p", "muted", "Gini koeficijent (0 = svi jednako opterećeni, 1 = sve radi jedan igrač) + koliko % opterećenja nose 3 najopterećenija igrača. Klubovi s najvećim Gini = rizik preopterećenja pojedinaca."));
      const out = el("div");
      card.append(out);
      body.append(card);
      out.append(spinner());
      const d = await API.get("/api/analysis/loadbalance");
      out.innerHTML = "";
      const t = el("table", "tbl");
      t.innerHTML = `<thead><tr><th>Klub</th><th>Sport</th><th class="num">igrača</th><th style="width:26%">Gini</th><th class="num">top-3 nosi</th><th>Procjena</th></tr></thead>`;
      const tb = el("tbody");
      for (const it of d.items) {
        const grade = it.gini > 0.3 ? ["🔴 nebalansirano", "var(--red)"] : it.gini > 0.2 ? ["🟡 umjereno", "var(--amber)"] : ["🟢 balansirano", "var(--good)"];
        tb.append(el("tr", "", `<td><b class="mono">${esc(it.club)}</b></td>
          <td class="muted">${esc(sportName(it.sport))}</td><td class="num">${it.n}</td>
          <td><div class="progress"><i style="width:${Math.round(it.gini * 100)}%;background:${grade[1]}"></i></div></td>
          <td class="num">${fmtN(it.top3_share, 0)}%</td>
          <td style="color:${grade[1]}">${grade[0]}</td>`));
      }
      t.append(tb);
      out.append(t);
    }

    // ============ 7) WELLNESS VS FORMA ============
    async function tabWellness(body) {
      const card = el("div", "card");
      card.append(el("h3", "", "🧘 Wellness vs forma — spava li bolje = bolja spremnost?"));
      card.append(el("p", "muted", "Po sportašu: prosječna kvaliteta sna (wellness, 30 dana) vs prosječna spremnost iz sesija. r ≈ 0 znači da u ovoj bazi san ne određuje spremnost sama — ali pojedinačni outlayeri su zanimljivi."));
      const out = el("div");
      card.append(out);
      body.append(card);
      out.append(spinner());
      const d = await API.get("/api/analysis/wellnessperf");
      out.innerHTML = "";
      const rCol = Math.abs(d.r) > 0.3 ? "var(--good)" : "var(--dim)";
      out.append(el("div", "pill-row", `<span class="chip on">n = ${d.n}</span>
        <span class="chip">r = <b style="color:${rCol};margin-left:4px">${d.r}</b></span>
        <span class="chip">X: kvaliteta sna (1–5) · Y: spremnost (0–100)</span>`));
      out.append(scatterChart({ points: d.points.map(p => ({ ...p, x: p.sleep, y: p.readiness, sex: "M" })), xname: "kvaliteta sna", yname: "spremnost" }));
    }

    // ============ 8) TERET OZLJEDA ============
    async function tabBurden(body) {
      const card = el("div", "card");
      card.append(el("h3", "", "🚑 Teret ozljeda po klubovima (godinu dana)"));
      card.append(el("p", "muted", "Burden = izgubljeni dani na 1000 AU opterećenja — mjeri koliko ozljede koštaju u odnosu na koliko se radi. Najveći burden = prioritet za preventivne programe."));
      const out = el("div");
      card.append(out);
      body.append(card);
      out.append(spinner());
      const d = await API.get("/api/analysis/injuryburden");
      out.innerHTML = "";
      if (!d.items.length) { out.append(el("div", "muted", "Nema dovoljno podataka.")); return; }
      const mx = Math.max(...d.items.map(i => i.burden));
      const t = el("table", "tbl");
      t.innerHTML = `<thead><tr><th>Klub</th><th>Sport</th><th class="num">ozljeda</th><th class="num">izgubljenih dana</th><th class="num">opterećenje (AU)</th><th style="width:24%">Burden</th></tr></thead>`;
      const tb = el("tbody");
      for (const it of d.items) {
        tb.append(el("tr", "", `<td><b class="mono">${esc(it.club)}</b></td>
          <td class="muted">${esc(sportName(it.sport))}</td>
          <td class="num">${it.injuries}</td><td class="num">${it.days_lost}</td>
          <td class="num muted">${it.load_au.toLocaleString("hr-HR")}</td>
          <td><div class="progress"><i style="width:${Math.round(it.burden / mx * 100)}%;background:var(--red)"></i></div>
            <span class="faint" style="font-size:10.5px">${fmtN(it.burden, 2)} dana / 1000 AU</span></td>`));
      }
      t.append(tb);
      out.append(t);
    }
  }
};

// ============ scatter crtač s hover/klik ============
function scatterChart(d) {
  const wrap = el("div", "scatter-wrap");
  const cv = el("canvas", "scatter-cv");
  const tip = el("div", "scatter-tip");
  wrap.append(cv, tip);
  const pts = d.points;
  requestAnimationFrame(() => {
    const rect = cv.getBoundingClientRect();
    const W = Math.max(280, rect.width), H = 300;
    const dpr = window.devicePixelRatio || 1;
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.height = H + "px";
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const pad = { l: 44, r: 12, t: 12, b: 30 };
    const X = v => pad.l + (v - x0) / ((x1 - x0) || 1) * (W - pad.l - pad.r);
    const Y = v => H - pad.b - (v - y0) / ((y1 - y0) || 1) * (H - pad.t - pad.b);
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      // grid + osi
      ctx.strokeStyle = "#1c2940"; ctx.fillStyle = "#5b6c85";
      ctx.font = "10px Segoe UI"; ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const gx = pad.l + i * (W - pad.l - pad.r) / 4;
        const gy = H - pad.b - i * (H - pad.t - pad.b) / 4;
        ctx.beginPath(); ctx.moveTo(gx, pad.t); ctx.lineTo(gx, H - pad.b); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(pad.l, gy); ctx.lineTo(W - pad.r, gy); ctx.stroke();
        ctx.textAlign = "center";
        ctx.fillText(fmtN(x0 + (x1 - x0) * i / 4, 1), gx, H - 10);
        ctx.textAlign = "right";
        ctx.fillText(fmtN(y0 + (y1 - y0) * i / 4, 1), pad.l - 6, gy + 3);
      }
      ctx.textAlign = "center"; ctx.fillStyle = "#8ea0b8"; ctx.font = "bold 10.5px Segoe UI";
      ctx.fillText((d.xname || "X") + (d.xunit ? " (" + d.xunit + ")" : ""), W / 2, H - 1);
      // točke
      for (const p of pts) {
        ctx.beginPath();
        ctx.arc(X(p.x), Y(p.y), 4, 0, 7);
        ctx.fillStyle = p.sex === "F" ? "#fbbf24cc" : "#38d6f5cc";
        ctx.fill();
      }
    };
    draw();
    // hover + klik
    let hover = null;
    cv.addEventListener("mousemove", e => {
      const r = cv.getBoundingClientRect();
      const mx = e.clientX - r.left, my = e.clientY - r.top;
      let best = null, bd = 14 * 14;
      for (const p of pts) {
        const dx = X(p.x) - mx, dy = Y(p.y) - my;
        const dd = dx * dx + dy * dy;
        if (dd < bd) { bd = dd; best = p; }
      }
      hover = best;
      if (best) {
        tip.style.display = "block";
        tip.style.left = Math.min(W - 160, X(best.x) + 10) + "px";
        tip.style.top = (Y(best.y) - 34) + "px";
        tip.innerHTML = `<b>${esc(best.name)}</b><br>${fmtN(best.x)} × ${fmtN(best.y)}${best.sport ? " · " + esc(sportName(best.sport)) : ""}`;
        cv.style.cursor = "pointer";
      } else {
        tip.style.display = "none";
        cv.style.cursor = "default";
      }
    });
    cv.addEventListener("mouseleave", () => { tip.style.display = "none"; });
    cv.addEventListener("click", () => { if (hover) nav("karton", hover.id); });
  });
  return wrap;
}
