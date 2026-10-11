// SPT — Karton sportaša (cjelovik dosje: mjerenja, ozljede, masa, testovi, norme)
"use strict";
VIEWS.karton = {
  title: "Karton sportaša",
  sub: "Cijeli dosje: sve utakmice, ozljede, tjelesni sastav, testovi, norme i odstupanja",
  async render(cont, sub) {
    if (!sub) {
      cont.append(el("div", "card", `<h3>🔎 Odaberi sportaša</h3>`));
      cont.append(athletePicker(a => nav("karton", a.id)));
      return;
    }
    cont.append(spinner());
    const k = await API.get(`/api/athletes/${sub}/karton`);
    if (k.error) { cont.innerHTML = '<div class="card">Karton ne postoji ili nemate pristup.</div>'; return; }
    cont.innerHTML = "";
    document.getElementById("pageSub").textContent = `${sportName(k.sport)} · ${k.position} · ${k.club} · ${k.n_sessions} sesija · ${k.total_km} km ukupno`;

    // ============ HERO ============
    const hero = el("div", "card detail-hero");
    const initials = k.name.split(" ").map(x => x[0]).join("").slice(0, 2);
    const activeInj = k.injuries.find(i => i.status === "aktivna");
    hero.innerHTML = `
      <div class="avatar">${esc(initials)}</div>
      <div style="min-width:240px">
        <div class="hero-name"><span class="flag">${flag(k.country)}</span> ${esc(k.name)}</div>
        <div class="hero-meta">
          <span>${k.tag === "youth" ? "🎓 mlada kategorija" + (k.squad ? " (" + esc(k.squad) + ")" : "") : "sportaš"}</span>
          <span>godina: <b>${k.age}</b></span>
          <span>${k.sex === "F" ? "ženski" : "muški"}</span>
          <span>klub: <b class="mono">${esc(k.club)}</b></span>
        </div>
        ${activeInj ? `<div style="margin-top:8px"><span class="badge b-red">🚑 AKTIVNA OZLJEDA: ${esc(activeInj.itype)} — ${esc(activeInj.body_part)}</span></div>` : ""}
      </div>
      <div style="margin-left:auto;display:flex;gap:26px;text-align:right;flex-wrap:wrap">
        <div><div class="faint" style="font-size:10px;letter-spacing:1px">UKUPNO KM</div><div style="font-size:24px;font-weight:900;color:var(--accent)">${fmtN(k.total_km, 0)}</div></div>
        <div><div class="faint" style="font-size:10px;letter-spacing:1px">SESIJA</div><div style="font-size:24px;font-weight:900">${k.n_sessions}</div></div>
        <div><div class="faint" style="font-size:10px;letter-spacing:1px">OZLJEDA</div><div style="font-size:24px;font-weight:900;color:${k.injuries.length ? "var(--red)" : "var(--good)"}">${k.injuries.length}</div></div>
        <div><div class="faint" style="font-size:10px;letter-spacing:1px">ANOMALIJA</div><div style="font-size:24px;font-weight:900;color:var(--amber)">${k.anomalies.length}</div></div>
      </div>`;
    // akcije
    const acts = el("div", "ctrl-row"); acts.style.marginTop = "0";
    const bNut = el("div", "btn sm", "🥗 Prehrana");
    bNut.onclick = () => nav("nutrition", sub);
    const bExp = el("div", "btn ghost sm", "⬇ " + (I18N.t.export_csv || "Izvezi CSV"));
    bExp.onclick = () => window.open(`/api/athletes/${sub}/export`);
    const bSim = el("div", "btn gr sm", "🔮 Simulacije");
    bSim.onclick = () => { sessionStorage.setItem("spt_sim_aid", sub); nav("simulate"); };
    acts.append(bNut, bExp, bSim);
    hero.append(acts);
    cont.append(hero);

    // ============ RED 1: norme/odstupanja + tjelesni sastav ============
    const row1 = el("div", "grid g2"); row1.style.marginTop = "14px";

    // --- norme i odstupanja ---
    const normCard = el("div", "card");
    normCard.innerHTML = `<h3>🎯 Odstupanja od referentnih norma (utakmice, ${esc(sportName(k.sport))})</h3>
      <div class="faint" style="font-size:11px;margin:-6px 0 10px">P10–P90 iz javnih sportsko-znanstvenih podataka (prilagođeno spolu i poziciji)</div>`;
    if (Object.keys(k.norm_deviations).length === 0) {
      normCard.append(el("div", "muted", "Nema dovoljno podataka utakmica za usporedbu s normama."));
    }
    const zoneMeta = { iznad_reference: ["z-good", "▲"], u_okviru: ["z-acc", "●"], ispod_reference: ["z-amber", "▼"], znatno_ispod: ["z-red", "⬇"] };
    for (const [metric, d] of Object.entries(k.norm_deviations)) {
      const [cls, arrow] = zoneMeta[d.zone] || ["z-acc", "●"];
      const devTxt = d.dev_pct > 0 ? `+${fmtN(d.dev_pct)}%` : `${fmtN(d.dev_pct)}%`;
      const rowEl = el("div", "", `
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:12.5px;margin-bottom:4px">
          <span class="muted">${esc(d.metric_hr)}</span>
          <span><b class="mono">${fmtN(d.value)} ${esc(d.unit || "")}</b>
          <span class="zone-pill ${cls}">${arrow} ${devTxt}</span></span>
        </div>
        <div class="progress" style="margin-bottom:10px"><i style="width:${Math.min(100, Math.max(4, 50 + d.dev_pct))}%;
          background:${d.zone === "iznad_reference" ? "linear-gradient(90deg,#34d399,#a3e635)" : d.zone === "u_okviru" ? "linear-gradient(90deg,var(--accent),var(--accent2))" : "linear-gradient(90deg,#f87171,#fbbf24)"}"></i></div>`);
      rowEl.title = `Referentni raspon: P10 ${d.ref_p10} / P50 ${d.ref_p50} / P90 ${d.ref_p90}`;
      normCard.append(rowEl);
    }
    row1.append(normCard);

    // --- tjelesni sastav graf ---
    const bcCard = el("div", "card");
    bcCard.innerHTML = `<h3>⚖️ Tjelesni sastav — pametna vaga (2 godine)</h3>`;
    const bcSel = el("select"); bcSel.style.marginBottom = "8px";
    const metrics = ["weight", "fat", "muscle", "water", "bmi"];
    const mNames = { weight: "Težina (kg)", fat: "Masnoća (%)", muscle: "Mišići (kg)", water: "Voda (%)", bmi: "BMI" };
    for (const m of metrics) { const o = el("option"); o.value = m; o.textContent = mNames[m]; bcSel.append(o); }
    bcSel.value = "weight";
    const bcBox = el("div", "chartbox tall");
    const bcCv = el("canvas", "chart"); bcBox.append(bcCv);
    bcCard.append(bcSel, bcBox);
    if (k.body_comp.length) {
      const last = k.body_comp[k.body_comp.length - 1];
      const grid = el("div", "grid g4"); grid.style.marginTop = "10px";
      for (const [lbl, val] of [["Težina", `${last.weight} kg`], ["Masnoća", `${last.fat}%`], ["Mišići", `${last.muscle} kg`], ["Metab. dob", `${last.metabolic_age} g`]]) {
        grid.append(el("div", "", `<div class="faint" style="font-size:10px;letter-spacing:1px">${lbl.toUpperCase()}</div><b style="font-size:16px">${val}</b>`));
      }
      bcCard.append(grid);
    }
    row1.append(bcCard);
    cont.append(row1);

    // ============ RED 2: kronologija + tjedno opterećenje ============
    const row2 = el("div", "grid g2"); row2.style.marginTop = "14px";

    // --- vremenska linija (ozljede + važna mjerenja) ---
    const tlCard = el("div", "card");
    tlCard.innerHTML = `<h3>🕰️ Kronologija dosjea</h3>`;
    const tl = el("div", "timeline-vert");
    const events = [];
    for (const i of k.injuries) events.push({ date: i.idate, cls: "inj", txt: `<b style="color:var(--red)">🏥 ${esc(i.itype)}</b> (${esc(i.body_part)}) — ${esc(i.cause)}, ${i.days_out} dana izvan, status: ${esc(i.status)}` });
    for (const a of k.anomalies.slice(0, 6)) events.push({ date: a.adate, cls: "", txt: `🚩 ${esc(a.msg)}` });
    const bcStep = Math.max(1, Math.floor(k.body_comp.length / 6));
    for (let i = k.body_comp.length - 1; i >= 0; i -= bcStep) {
      const b = k.body_comp[i];
      events.push({ date: b.bdate, cls: "bc", txt: `⚖️ Vaga: <b>${b.weight} kg</b> · masnoća ${b.fat}% · mišići ${b.muscle} kg <span class="faint">(${esc(b.source)})</span>` });
    }
    events.sort((a, b) => b.date.localeCompare(a.date));
    for (const ev of events.slice(0, 18)) {
      tl.append(el("div", `tl-item ${ev.cls}`, `<span class="faint mono" style="font-size:11px">${fmtD(ev.date)}</span><div style="font-size:12.5px;margin-top:2px">${ev.txt}</div>`));
    }
    if (!events.length) tl.append(el("div", "muted", "Prazna kronologija."));
    tlCard.append(tl);
    row2.append(tlCard);

    // --- tjedno opterećenje + kalendar ---
    const loadCard = el("div", "card");
    loadCard.innerHTML = `<h3>📊 Opterećenje (16 tjedana) i struktura treninga</h3>`;
    const lbox = el("div", "chartbox"); const lcv = el("canvas", "chart"); lbox.append(lcv);
    loadCard.append(lbox);
    const mix = el("div", "pill-row"); mix.style.marginTop = "10px";
    const stNames = { match: "utakmice", training: "treninzi", gym: "teretana", recovery: "regeneracija" };
    const tot = Object.values(k.stypes).reduce((a, b) => a + b, 0) || 1;
    const stColors = { match: "#ff5a5f", training: "#4f8cff", gym: "#fbbf24", recovery: "#34d399" };
    for (const [st, n] of Object.entries(k.stypes)) {
      mix.append(el("span", "chip", `<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${stColors[st]};margin-right:6px"></span>${stNames[st] || st}: <b>&nbsp;${n}</b> (${Math.round(100 * n / tot)}%)`));
    }
    loadCard.append(mix);
    row2.append(loadCard);
    cont.append(row2);

    // ============ RED 3: testovi ============
    if (Object.keys(k.tests).length) {
      const row3 = el("div", "grid g3"); row3.style.marginTop = "14px";
      const tNames = { sprint10: "Sprint 10 m", sprint30: "Sprint 30 m", cmj: "Skok (CMJ)", yoyo: "Yo-Yo test", lactate_test: "Laktatni test" };
      for (const [ttype, arr] of Object.entries(k.tests)) {
        const card = el("div", "card");
        const unit = arr[0].unit || "";
        card.innerHTML = `<h3>🧪 ${tNames[ttype] || ttype} <span class="faint" style="font-weight:400">(${unit})</span></h3>`;
        const box = el("div", "chartbox"); box.style.height = "150px";
        const cv = el("canvas", "chart"); box.append(cv);
        card.append(box);
        const last = arr[arr.length - 1];
        const best = Math.min(...arr.map(x => x.value)) <= 0 ? null :
          (ttype.startsWith("sprint") ? Math.min(...arr.map(x => x.value)) : Math.max(...arr.map(x => x.value)));
        card.append(el("div", "muted", `Zadnji: <b>${fmtN(last.value, 2)} ${unit}</b> · Osobni najbolji: <b style="color:var(--accent2)">${fmtN(best, 2)}</b>`));
        if (ttype === "lactat_test" && last.stages) {
          const st = el("div", "muted"); st.style.cssText = "font-size:11.5px;margin-top:6px;line-height:1.6";
          st.innerHTML = "Laktatna krivulja: " + last.stages.map(s => `${s.speed_kmh}km/h→${s.lactate}mmol`).join(" · ");
          card.append(st);
        }
        row3.append(card);
      }
      cont.append(row3);
    }

    // ============ RED 4: utakmice + glas ============
    if (k.matches.length || k.voice.length) {
      const row4 = el("div", "grid g2"); row4.style.marginTop = "14px";
      if (k.matches.length) {
        const mCard = el("div", "card");
        mCard.innerHTML = `<h3>🎬 Snimljene utakmice (pozicijski podaci)</h3>`;
        for (const m of k.matches) {
          const it = el("div", "", `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid #14203355">
              <div><b>${esc(sportName(m.sport))}</b> <span class="faint" style="font-size:11.5px">${fmtD(m.mdate)}</span></div>
              <div class="mono">${esc(m.home)} <b style="color:var(--accent)">${esc(m.score)}</b> ${esc(m.away)}</div>
            </div>`);
          const btn = el("div", "btn sm", "▶ Reprodukcija");
          btn.onclick = () => nav("replay");
          it.querySelector("div").append(btn);
          mCard.append(it);
        }
        row4.append(mCard);
      }
      if (k.voice.length) {
        const vCard = el("div", "card");
        vCard.innerHTML = `<h3>🎙️ BioSenzor zapisi (glas/disanje/srce)</h3>`;
        for (const v of k.voice.slice(0, 6)) {
          vCard.append(el("div", "mini-stat", `<span>${fmtD(v.vdate)} — stres glasa</span><b style="color:${v.stress > 65 ? "var(--red)" : v.stress > 35 ? "var(--amber)" : "var(--good)"}">${fmtN(v.stress, 0)}/100 · disanje ${fmtN(v.breathing_rate, 0)}/min</b>`));
        }
        row4.append(vCard);
      }
      cont.append(row4);
    }

    // grafikoni
    requestAnimationFrame(() => {
      if (k.body_comp.length > 1) {
        const draw = () => {
          const m = bcSel.value;
          lineChart(bcCv, {
            labels: k.body_comp.map(b => fmtD(b.bdate).slice(0, 5)),
            series: [{ name: mNames[m], color: m === "fat" ? "#ff5a5f" : "#38d6f5", values: k.body_comp.map(b => b[m]) }],
            xEvery: Math.max(1, Math.ceil(k.body_comp.length / 7))
          });
        };
        draw();
        bcSel.onchange = draw;
      }
      lineChart(lcv, {
        labels: k.weeks.map(w => fmtD(w.w).slice(0, 5)),
        series: [{ name: "tjedno opterećenje (AU)", color: "#38d6f5", values: k.weeks.map(w => w.load) }],
        xEvery: 2
      });
      for (const [ttype, arr] of Object.entries(k.tests)) {
        const cvv = cont.querySelector(`[data-t="${ttype}"]`);
      }
      // testovi: pronađi canvase po redu
      const testCards = cont.querySelectorAll(".grid.g3 .card");
      let ti = 0;
      for (const [ttype, arr] of Object.entries(k.tests)) {
        const card = testCards[ti++];
        if (!card) break;
        const cvv = card.querySelector("canvas");
        const unit = arr[0].unit || "";
        lineChart(cvv, {
          labels: arr.map(x => fmtD(x.date).slice(0, 5)),
          series: [{ name: tNames[ttype] || ttype, color: "#a3e635", values: arr.map(x => x.value) }],
          xEvery: 1, yMin: Math.min(...arr.map(x => x.value)) * 0.97, yMax: Math.max(...arr.map(x => x.value)) * 1.03
        });
      }
    });
  }
};
VIEWS.athlete = VIEWS.karton; // stara ruta vodi na karton
