// SPT — Prehrana po kartonu (potrebe vs unos, višak/manjak)
"use strict";
VIEWS.nutrition = {
  title: "Prehrana",
  sub: "Dnevne potrebe izračunate iz kartona (BMR/TDEE, makronutrijenti, hidratacija) vs stvarni unos",
  async render(cont, sub) {
    if (!sub) {
      cont.append(el("div", "card", `<h3>🔎 Odaberi sportaša</h3><p class="muted" style="font-size:12.5px">Potrebe se računaju iz Mifflin-St Jeor formule, kategorije sporta i tjednog opterećenja.</p>`));
      cont.append(athletePicker(a => nav("nutrition", a.id)));
      return;
    }
    cont.append(spinner());
    const d = await API.get(`/api/athletes/${sub}/nutrition`);
    if (!d || d.error) { cont.innerHTML = '<div class="card">Nema podataka.</div>'; return; }
    cont.innerHTML = "";
    document.getElementById("pageSub").textContent = `${d.athlete.name} · ${sportName(d.athlete.sport)} · tjedno opterećenje ${d.week_load} AU`;

    // hero: potrebe
    const needs = d.needs;
    const hero = el("div", "card");
    hero.innerHTML = `<h3>🎯 Dnevne potrebe — ${esc(d.athlete.name)}</h3>
      <div class="grid g5" style="gap:10px">
        ${[["TDEE", `${needs.tdee} <span class="faint" style="font-size:12px">kcal</span>`, "ukupna potrošnja"],
           ["Ugljikohidrati", `${needs.cho_g} g`, `${needs.cho_gkg} g/kg`],
           ["Proteini", `${needs.pro_g} g`, `${needs.pro_gkg} g/kg`],
           ["Masti", `${needs.fat_g} g`, `${needs.fat_gkg} g/kg`],
           ["Voda", `${(needs.water_ml / 1000).toFixed(1)} L`, "35 ml/kg + znoj"]]
        .map(([l, v, s]) => `<div class="kpi"><div class="v" style="font-size:19px">${v}</div><div class="l">${l}</div><div class="s">${s}</div></div>`).join("")}
      </div>
      <div class="faint" style="font-size:11px;margin-top:8px">BMR ${needs.bmr} kcal × faktor aktivnosti ${needs.activity_factor} (tjedno opterećenje ${d.week_load} AU)</div>`;
    cont.append(hero);

    // graf: unos vs potrebe kroz dane
    const row = el("div", "grid g2"); row.style.marginTop = "14px";
    const chartCard = el("div", "card");
    chartCard.innerHTML = `<h3>📈 Unos vs potrebe (7 dana)</h3>`;
    const box = el("div", "chartbox tall"); const cv = el("canvas", "chart"); box.append(cv);
    chartCard.append(box);
    row.append(chartCard);

    // tablica dana
    const tblCard = el("div", "card");
    tblCard.innerHTML = `<h3>📋 Dnevnik po danima</h3>`;
    const t = el("table", "tbl");
    t.innerHTML = `<thead><tr><th>Dan</th><th class="num">kcal</th><th class="num">CHO</th><th class="num">PRO</th><th class="num">FAT</th><th class="num">Voda</th><th class="num">jutarnja težina</th></tr></thead>`;
    const tb = el("tbody");
    const verdictCls = v => v === "višak" ? "b-amber" : v === "manjak" ? "b-red" : "b-gr";
    const verdictTxt = v => v === "višak" ? "▲ višak" : v === "manjak" ? "▼ manjak" : "● ravnoteža";
    for (const day of d.days.slice().reverse()) {
      tb.append(el("tr", "", `<td>${fmtD(day.date)}</td>
        <td class="num">${day.intake.kcal} <span class="badge ${verdictCls(day.eval.kcal.verdict)}">${verdictTxt(day.eval.kcal.verdict)}</span></td>
        <td class="num">${day.intake.cho}/${needs.cho_g} g</td>
        <td class="num">${day.intake.pro}/${needs.pro_g} g</td>
        <td class="num">${day.intake.fat}/${needs.fat_g} g</td>
        <td class="num">${(day.intake.water_ml / 1000).toFixed(1)} L</td>
        <td class="num">${day.weight ?? "—"} kg</td>`));
    }
    t.append(tb);
    tblCard.append(t);
    // preporuke
    tblCard.append(el("h3", "", "💡 Preporuke sustava").style ? (() => { const h = el("h3", "", "💡 Preporuke sustava"); h.style.marginTop = "14px"; return h; })() : el("h3"));
    for (const r of d.recommendations) {
      const div = el("div", "", `➤ ${esc(r)}`);
      div.style.cssText = "font-size:13px;padding:7px 0;border-bottom:1px solid #14203355;line-height:1.5";
      tblCard.append(div);
    }
    row.append(tblCard);
    cont.append(row);

    // novi unos
    const formCard = el("div", "card"); formCard.style.marginTop = "14px";
    formCard.innerHTML = `<h3>➕ Unesi današnji obrok / dan</h3>`;
    const form = el("div", "ctrl-row");
    const fields = [["kcal", "kcal", needs.tdee], ["cho", "CHO (g)", needs.cho_g], ["pro", "PRO (g)", needs.pro_g], ["fat", "FAT (g)", needs.fat_g], ["water_ml", "Voda (ml)", needs.water_ml]];
    const inputs = {};
    for (const [k2, lbl, def] of fields) {
      const l = el("label", "fld", lbl);
      const i = el("input"); i.type = "number"; i.value = def;
      l.append(i); inputs[k2] = i;
      form.append(l);
    }
    const addBtn = el("div", "btn gr", "💾 Spremi dan");
    addBtn.onclick = async () => {
      const body = { date: new Date().toISOString().slice(0, 10) };
      for (const [k2] of fields) body[k2] = +inputs[k2].value;
      const r = await API.post(`/api/athletes/${sub}/nutrition`, body);
      if (r.ok) { toast("Dan spremljen."); VIEWS.nutrition.render(cont, sub); }
      else toast(r.error || "Greška");
    };
    form.append(addBtn);
    formCard.append(form);
    cont.append(formCard);

    requestAnimationFrame(() => {
      lineChart(cv, {
        labels: d.days.map(x => fmtD(x.date).slice(0, 5)),
        series: [
          { name: "kcal unos", color: "#38d6f5", values: d.days.map(x => x.intake.kcal) },
          { name: "kcal potreba", color: "#a3e635", values: d.days.map(() => needs.tdee), dash: true },
          { name: "CHO×4 (g→kcal)", color: "#fbbf24", values: d.days.map(x => x.intake.cho * 4) },
        ],
        xEvery: 1
      });
    });
  }
};
