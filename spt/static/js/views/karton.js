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
    const bPrint = el("div", "btn ghost sm", "🖨 Kartica igrača");
    bPrint.onclick = () => printPlayerCard(k);
    const bFav = el("div", "btn ghost sm", isFav(sub) ? "★" : "☆");
    bFav.title = "Favorit";
    bFav.onclick = () => { const on = favToggle(sub); bFav.textContent = on ? "★" : "☆"; toast(on ? "Dodano u favorite" : "Uklonjeno iz favorita"); };
    acts.append(bNut, bExp, bSim, bPrint, bFav);
    hero.append(acts);
    // potpunost kartona
    if (k.completeness != null) {
      const cp = el("div", "mini-stat");
      cp.style.marginTop = "10px";
      cp.innerHTML = `<span>Potpunost kartona</span><b style="color:${k.completeness >= 75 ? "var(--good)" : k.completeness >= 50 ? "var(--amber)" : "var(--red)"}">${k.completeness}% ${k.completeness >= 75 ? "· odlično" : k.completeness >= 50 ? "· dopuni preostale kategorije" : "· kritično malo podataka"}</b>`;
      hero.append(cp);
    }
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

    // ============ ACHIEVEMENTI (medalje) ============
    try {
      const ach = await API.get(`/api/athletes/${sub}/achievements`);
      if (ach.items && ach.items.length) {
        const aCard = el("div", "card");
        aCard.style.marginTop = "14px";
        aCard.innerHTML = `<h3>🏅 Medalje i rekordi</h3>`;
        const arow = el("div", "pill-row");
        for (const a of ach.items) {
          arow.append(el("div", "chip ach-chip",
            `<span style="font-size:17px">${a.ico}</span> <b>${esc(a.v)}</b> <span class="faint">${esc(a.t)}</span>`));
        }
        aCard.append(arow);
        cont.append(aCard);
      }
    } catch (e) {}

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

    // --- WELLNESS (jutarnji upitnik + trend) ---
    const wlCard = el("div", "card");
    wlCard.innerHTML = `<h3>🧘 Wellness — jutarnji upitnik (21 dan)</h3>`;
    try {
      const wl = await API.get(`/api/wellness?athlete=${sub}`);
      const items = wl.items || [];
      if (items.length) {
        const wlBox = el("div", "chartbox"); const wlCv = el("canvas", "chart"); wlBox.append(wlCv);
        wlCard.append(wlBox);
        const chrono = [...items].reverse();
        requestAnimationFrame(() => lineChart(wlCv, {
          labels: chrono.map(x => x.wdate.slice(5)),
          series: [
            { name: "kvaliteta sna", color: "#4f8cff", values: chrono.map(x => x.sleep_q) },
            { name: "raspoloženje", color: "#a3e635", values: chrono.map(x => x.mood) },
            { name: "energija", color: "#38d6f5", values: chrono.map(x => x.energy) },
            { name: "bolnost (niže=bolje)", color: "#ff5a5f", values: chrono.map(x => x.soreness) }
          ]
        }));
        const last = items[0];
        wlCard.append(el("div", "mini-stat", `<span>Zadnje jutro (${fmtD(last.wdate)})</span>
          <b>san ${fmtN(last.sleep_h)} h · kvaliteta ${last.sleep_q}/5 · bolnost ${last.soreness}/5 · energija ${last.energy}/5</b>`));
      } else {
        wlCard.append(el("div", "muted", "Nema wellness zapisa."));
      }
    } catch (e) { wlCard.append(el("div", "muted", "Wellness nedostupan.")); }
    // forma za upis
    const wlForm = el("details");
    wlForm.innerHTML = `<summary style="cursor:pointer;font-size:12.5px;color:var(--accent)">➕ Upiši današnji jutarnji upitnik</summary>`;
    const fw = el("div", "ctrl-row"); fw.style.cssText = "flex-wrap:wrap;gap:10px;margin-top:10px";
    const fields = [["sleep_h", "San (h)", "number", 7.5, 0.5], ["sleep_q", "Kvaliteta sna (1-5)", "number", 4, 1],
      ["soreness", "Bolnost mišića (1-5)", "number", 2, 1], ["mood", "Raspoloženje (1-5)", "number", 4, 1],
      ["stress", "Stres (1-5)", "number", 2, 1], ["energy", "Energija (1-5)", "number", 4, 1]];
    const inputs = {};
    for (const [k2, l2, tp, dv, st] of fields) {
      const la = el("label", "fld", l2); la.style.minWidth = "120px";
      const inp = el("input"); inp.type = tp; inp.value = dv; inp.step = st; inp.min = 0; inp.max = 5;
      la.append(inp); fw.append(la); inputs[k2] = inp;
    }
    const wlBtn = el("div", "btn sm", "💾 Spremi zapis");
    wlBtn.onclick = async () => {
      const body = { athlete: +sub };
      for (const k2 in inputs) body[k2] = +inputs[k2].value;
      const r = await API.post("/api/wellness", body);
      if (r.error) { toast(r.error); return; }
      toast("Wellness zapis spremljen ✓");
      VIEWS.karton.render(cont, sub);
    };
    fw.append(wlBtn);
    wlForm.append(fw);
    wlCard.append(wlForm);
    row2.append(wlCard);

    // --- tjedno opterećenje + kalendar ---
    const loadCard = el("div", "card");
    loadCard.innerHTML = `<h3>📊 Opterećenje (16 tjedana) i struktura treninga</h3>`;
    if (k.load_science && k.load_science.monotony) {
      const ls = k.load_science;
      const mCol = ls.monotony > 2 ? "var(--red)" : ls.monotony > 1.5 ? "var(--amber)" : "var(--good)";
      loadCard.append(el("div", "pill-row", `
        <span class="chip">🧠 monotonija <b style="color:${mCol};margin-left:4px">${ls.monotony}</b></span>
        <span class="chip">🔥 strain <b style="margin-left:4px">${fmtN(ls.strrain || ls.strain, 0)} AU</b></span>
        <span class="chip">📈 EWMA <b style="margin-left:4px">${fmtN(ls.ewma, 0)} AU/dan</b></span>
        <span class="chip">dnevni prosjek <b style="margin-left:4px">${fmtN(ls.daily_mean, 0)} ± ${fmtN(ls.daily_std, 0)}</b></span>`));
    }
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

    // ============ SESIJE (zadnjih 25, klik = detalji) ============
    if (k.sessions && k.sessions.length) {
      const sCard = el("div", "card");
      sCard.style.marginTop = "14px";
      sCard.innerHTML = `<h3>📓 Sve sesije (${k.n_sessions}) <span class="faint" style="font-weight:400;float:right">klikni redak za detalje</span></h3>`;
      const st = el("table", "tbl");
      st.innerHTML = `<thead><tr><th>Datum</th><th>Vrsta</th><th class="num">km</th><th class="num">max ${IMPERIAL() ? "mph" : "km/h"}</th>
        <th class="num">puls</th><th class="num">sprint</th><th class="num">AU</th><th class="num">spremnost</th></tr></thead>`;
      const stb = el("tbody");
      for (const s of k.sessions) {
        const tr = el("tr", "click");
        tr.innerHTML = `<td class="mono">${fmtD(s.sdate)}</td>
          <td>${s.stype === "match" ? '<span class="badge b-red">UTAKMICA</span>' : s.stype === "gym" ? '<span class="badge b-amber">TERETANA</span>' : s.stype === "recovery" ? '<span class="badge b-gr">REGEN</span>' : '<span class="badge b-blue">TRENING</span>'}</td>
          <td class="num">${fmtN(s.dist_total, 1)}</td><td class="num">${fmtN(s.top_speed)}</td>
          <td class="num">${s.hr_avg || "—"}</td><td class="num">${s.sprints ?? "—"}</td>
          <td class="num">${s.srpe ?? "—"}</td>
          <td class="num"><span style="color:${(s.readiness || 0) < 65 ? "var(--red)" : (s.readiness || 0) < 75 ? "var(--amber)" : "var(--good)"}">${s.readiness ?? "—"}</span></td>`;
        tr.onclick = () => sessionDetail(s, k);
        stb.append(tr);
      }
      st.append(stb);
      sCard.append(st);
      cont.append(sCard);
    }

    // ============ BILJEŠKE TRENERA ============
    const nCard = el("div", "card");
    nCard.style.marginTop = "14px";
    nCard.innerHTML = `<h3>📝 Bilješke trenera</h3>`;
    if (k.notes && k.notes.length) {
      for (const n of k.notes) {
        nCard.append(el("div", "note-item", `<div class="faint" style="font-size:10.5px">${fmtD(n.ndate)} · <b>${esc(n.author)}</b></div>
          <div style="font-size:13px;margin-top:2px">${esc(n.text)}</div>`));
      }
    } else {
      nCard.append(el("div", "muted", "Još nema bilježaki."));
    }
    if (AUTH.user && ["trener", "kondicijski", "admin"].includes(AUTH.user.role)) {
      const ta = el("textarea");
      ta.placeholder = "Nova bilješka (opis forme, dojmovi, dogovor…)";
      ta.style.cssText = "width:100%;min-height:56px;margin-top:10px;background:var(--panel3);border:1px solid var(--border);border-radius:10px;color:var(--text);padding:9px;font-size:13px";
      const nb = el("div", "btn sm", "💾 Dodaj bilješku");
      nb.style.marginTop = "8px";
      nb.onclick = async () => {
        if (!ta.value.trim()) return;
        const r = await API.post("/api/notes", { athlete: +sub, text: ta.value });
        if (r.ok) { toast("Bilješka spremljena", "ok"); VIEWS.karton.render(cont, sub); }
        else toast(r.error || "Greška", "err");
      };
      nCard.append(ta, nb);
    }
    cont.append(nCard);

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

// ---- detalji sesije (modal) ----
function sessionDetail(s, k) {
  const modal = el("div", "modal-bg");
  const area = el("div", "print-area");
  area.innerHTML = `<div class="rep-brand">📡 <b>SPT</b> · Sports Performance Tracking · produced by GNK ASG</div>
    <h1>Sesija — ${esc(k.name)}</h1>
    <div class="rep-sub">${fmtD(s.sdate)} · ${esc(sportName(s.sport))} · ${s.stype === "match" ? "utakmica" : s.stype === "gym" ? "teretana" : s.stype === "recovery" ? "regeneracija" : "trening"} · ${s.duration || "—"} min</div>
    <div class="rep-gen">karton: ${esc(k.club)} · pozicija ${esc(k.position)}</div>`;
  const kpis = el("div", "rep-kpis");
  const kv = [
    ["Udaljenost", fmtKm(s.dist_total, 2)], ["Max brzina", fmtSpd(s.top_speed)],
    ["Prosj. puls", (s.hr_avg || "—") + " bpm"], ["Max puls", (s.hr_max || "—") + " bpm"],
    ["Sprintevi", s.sprints ?? "—"], ["Opterećenje", (s.srpe ?? "—") + " AU"],
    ["Spremnost", (s.readiness ?? "—") + "/100"], ["Laktat", s.lactate != null ? s.lactate + " mmol/L" : "—"]
  ];
  for (const [l, v] of kv) kpis.append(el("div", "rep-kpi", `<div class="v">${esc(String(v))}</div><div class="l">${esc(l)}</div>`));
  area.append(kpis);
  if (s.stride_len || s.ball_speed_max) {
    const extra = el("div", "rep-sec");
    extra.append(el("h3", "", "Tehnički podaci"));
    extra.append(el("div", "rep-rec", `dužina koraka: ${s.stride_len || "—"} m · brzina lopte (max): ${s.ball_speed_max || "—"} km/h`));
    area.append(extra);
  }
  const btns = el("div", "no-print rep-btns");
  const bp = el("div", "btn", "🖨 Ispiši");
  bp.onclick = () => window.print();
  const bc = el("div", "btn ghost", "Zatvori");
  bc.onclick = () => modal.remove();
  btns.append(bp, bc);
  modal.append(area, btns);
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
  document.body.append(modal);
}

// ---- kartica igrača za ispis (one-pager) ----
function printPlayerCard(k) {
  const modal = el("div", "modal-bg");
  const area = el("div", "print-area");
  const initials = k.name.split(" ").map(x => x[0]).join("").slice(0, 2);
  area.innerHTML = `<div class="rep-brand">📡 <b>SPT</b> · Sports Performance Tracking · produced by GNK ASG</div>
    <h1>${esc(k.name)}</h1>
    <div class="rep-sub">${esc(sportName(k.sport))} · ${esc(k.position)} · ${esc(k.club)} · ${k.age} g · ${k.n_sessions} sesija · ${fmtKm(k.total_km, 0)}</div>
    <div class="rep-gen">kartica igrača · ${new Date().toLocaleDateString("hr-HR")} · potpunost podataka ${k.completeness ?? "—"}%</div>`;
  // KPI
  const kpis = el("div", "rep-kpis");
  const last = (k.sessions || [])[0] || {};
  for (const [l, v] of [
    ["Zadnja sesija", fmtD(last.sdate || "—")],
    ["Zadnja km", fmtKm(last.dist_total, 1)],
    ["Max brzina (zadnja)", fmtSpd(last.top_speed)],
    ["Spremnost (zadnja)", (last.readiness ?? "—") + "/100"],
    ["Ozljeda", k.injuries.length ? "DA (" + k.injuries.length + ")" : "ne"],
  ]) kpis.append(el("div", "rep-kpi", `<div class="v">${esc(String(v))}</div><div class="l">${esc(l)}</div>`));
  area.append(kpis);
  // opterećenje graf
  if (k.weeks && k.weeks.length) {
    const sec = el("div", "rep-sec");
    sec.append(el("h3", "", "Tjedno opterećenje (16 tjedana)"));
    const box = el("div", "chartbox"); const cv = el("canvas", "chart"); box.append(cv);
    sec.append(box);
    area.append(sec);
    requestAnimationFrame(() => lineChart(cv, {
      labels: k.weeks.map(w => w.w.slice(5)),
      series: [{ name: "AU", color: "#38d6f5", values: k.weeks.map(w => w.load) }],
      xEvery: 3
    }));
  }
  // norme
  if (k.norm_deviations && Object.keys(k.norm_deviations).length) {
    const sec = el("div", "rep-sec");
    sec.append(el("h3", "", "Odstupanja od normi (utakmice)"));
    const t = el("table", "rep-tbl");
    t.innerHTML = "<thead><tr><th>Metrika</th><th>Vrijednost</th><th>Referenca</th><th>Ocjena</th></tr></thead>";
    for (const m of Object.values(k.norm_deviations)) {
      t.append(el("tr", "", `<td>${esc(m.metric_hr || m.metric || "")}</td><td>${fmtN(m.value, 1)} ${esc(m.unit || "")}</td>
        <td>${fmtN(m.p50, 1)}</td><td>${esc(m.label || "")}</td>`));
    }
    sec.append(t);
    area.append(sec);
  }
  // load science
  if (k.load_science && k.load_science.monotony) {
    const sec = el("div", "rep-sec");
    sec.append(el("h3", "", "Znanstveni sažetak opterećenja"));
    sec.append(el("div", "rep-rec", `Monotonija: <b>${k.load_science.monotony}</b> (rizik &gt; 2,0) · Strain: <b>${fmtN(k.load_science.strain, 0)} AU</b> · EWMA: <b>${fmtN(k.load_science.ewma, 0)} AU/dan</b> · dnevni prosjek ${fmtN(k.load_science.daily_mean, 0)} ± ${fmtN(k.load_science.daily_std, 0)}`));
    area.append(sec);
  }
  area.append(el("div", "rep-foot", "SPT · produced by GNK ASG · sintetski demo-podaci"));
  const btns = el("div", "no-print rep-btns");
  const bp = el("div", "btn", "🖨 Ispiši / spremi PDF");
  bp.onclick = () => window.print();
  const bc = el("div", "btn ghost", "Zatvori");
  bc.onclick = () => modal.remove();
  btns.append(bp, bc);
  modal.append(area, btns);
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
  document.body.append(modal);
}
