// SPT — Uvoz podataka: GPX/TCX/CSV/JSON + vaga + satovi + ogledne datoteke
"use strict";
VIEWS.import = {
  title: "Uvoz podataka",
  sub: "GPX · TCX · CSV (Garmin/Catapult/STATSports) · JSON (KINEXON) · izvozi pametnih vaga i satova",
  async render(cont) {
    cont.innerHTML = "";
    const row = el("div", "grid g2");

    // ---- upload kartica ----
    const upCard = el("div", "card");
    upCard.innerHTML = `<h3>📥 Učitaj datoteku</h3>
      <p class="muted" style="font-size:12.5px;line-height:1.6">Podržano: <b>.gpx</b> (Garmin/Strava), <b>.tcx</b>,
      <b>.csv</b> (Catapult, STATSports, Polar, Huawei Health, openScale/Xiaomi, Zepp), <b>.json</b> (KINEXON LPS tokovi).
      SPT sam prepozna format — ti samo bacaš datoteku.</p>`;
    const drop = el("div", "");
    drop.style.cssText = "border:2px dashed #27395a;border-radius:14px;padding:36px;text-align:center;cursor:pointer;transition:.2s";
    drop.innerHTML = `<div style="font-size:34px">📂</div>
      <div style="margin-top:8px;font-weight:700">Klikni ili ispusti datoteku ovdje</div>
      <div class="faint" style="font-size:11.5px;margin-top:4px">do 20 MB · obrada u pregledniku, ništa ne ide na internet</div>`;
    const fileInput = el("input"); fileInput.type = "file"; fileInput.hidden = true;
    drop.append(fileInput);
    drop.onclick = () => fileInput.click();
    drop.ondragover = e => { e.preventDefault(); drop.style.borderColor = "var(--accent)"; };
    drop.ondragleave = () => drop.style.borderColor = "#27395a";
    drop.ondrop = e => { e.preventDefault(); drop.style.borderColor = "#27395a"; if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); };
    fileInput.onchange = () => { if (fileInput.files[0]) handleFile(fileInput.files[0]); };
    upCard.append(drop, fileInput);
    const resultBox = el("div", "");
    resultBox.style.marginTop = "14px";
    upCard.append(resultBox);
    row.append(upCard);

    // ---- vaga + satovi kartica ----
    const devCard = el("div", "card");
    devCard.innerHTML = `<h3>⚖️ Vaga i ⌚ satovi — automatski uvoz</h3>
      <p class="muted" style="font-size:12.5px;line-height:1.65">
      <b>Vaga:</b> SPT prati mapu <code class="mono">spt/scale_inbox/</code> — ubaci CSV izvoz iz Huawei Health /
      Xiaomi (Zepp) / Medisana / Withings aplikacije i mjerenja se sama upisuju u kartone (težina, BMI, masnoća,
      mišići, voda, visceralna mast, kosti, proteini, BMR).<br><br>
      <b>Satovi (BYOD):</b> amaterski satovi (Xiaomi Smart Band/Mi Watch, Amazfit, Huawei Watch, Garmin) šalju
      puls/korake preko SPT mosta (UDP :1520) — ili uvezi dnevni CSV sažetak.</p>`;
    // status vage
    const scaleStatus = el("div", "");
    devCard.append(scaleStatus);
    API.get("/api/scale").then(s => {
      scaleStatus.innerHTML = `
        <div class="mini-stat"><span>Mapa vage</span><b class="mono">${esc(s.inbox_path)}</b></div>
        <div class="mini-stat"><span>Datoteke u redu čekanja</span><b>${s.inbox_files.length}</b></div>
        <div class="mini-stat"><span>Neraspoređenih mjerenja</span><b style="color:${s.unassigned.length ? "var(--amber)" : "var(--good)"}">${s.unassigned.length}</b></div>`;
      if (s.unassigned.length) {
        const btn = el("div", "btn sm", "🔍 Rasporedi neraspoređena mjerenja");
        btn.style.marginTop = "10px";
        btn.onclick = () => assignFlow(s.unassigned);
        devCard.append(btn);
      }
    }).catch(() => {});
    // status satova
    const watchBox = el("div", ""); watchBox.style.marginTop = "12px";
    devCard.append(watchBox);
    API.get("/api/watch/status").then(w => {
      watchBox.innerHTML = `<div class="mini-stat"><span>SPT watch most (UDP :1520)</span>
        <b style="color:${w.listening ? "var(--good)" : "var(--red)"}">${w.listening ? "AKTIVAN" : "UGAŠEN"}</b></div>
        ${w.watches.map(x => `<div class="mini-stat"><span>${esc(x.watch)}</span><b>${x.hr || "—"} bpm</b></div>`).join("")}`;
    }).catch(() => {});
    // default sportaš za vagu
    const mapBox = el("div", "ctrl-row"); mapBox.style.marginTop = "12px";
    const pickLbl = el("span", "faint", "Sva mjerenja s vage upisuj sportašu:");
    mapBox.append(pickLbl);
    mapBox.append(athletePicker(async a => {
      const r = await API.post("/api/scale/map", { athlete: a.id });
      if (r.ok) toast("Vaga sada automatski puni karton: " + a.name);
    }));
    devCard.append(el("div", "faint", "— klikni sportaša da postaviš zadanog primatelja"), mapBox);
    row.append(devCard);
    cont.append(row);

    // ---- ogledne datoteke ----
    const demoCard = el("div", "card"); demoCard.style.marginTop = "14px";
    demoCard.innerHTML = `<h3>🧪 Ogledne datoteke za testiranje</h3>
      <p class="muted" style="font-size:12.5px">Preuzmi ZIP sa 6 demo datoteka (GPX trening, TCX trčanje, Catapult CSV,
      KINEXON JSON, izvoz vage Huawei + openScale) pa ih isprobaj u uvozu.</p>`;
    const btn = el("div", "btn", "⬇ Preuzmi spt_ogledni_datoteke.zip");
    btn.onclick = () => window.open("/api/import/samples");
    demoCard.append(btn);
    cont.append(demoCard);

    // ---------- obrada ----------
    async function handleFile(f) {
      resultBox.innerHTML = "";
      resultBox.append(el("div", "muted", `⏳ Obradajem <b>${esc(f.name)}</b>…`));
      const fd = new FormData();
      fd.append("file", f);
      try {
        const r = await fetch("/api/import/upload", { method: "POST", body: fd });
        const d = await r.json();
        renderResult(d, f.name);
      } catch (e) {
        resultBox.innerHTML = `<div class="card" style="border-color:var(--red)">❌ Greška: ${esc(String(e))}</div>`;
      }
    }

    function renderResult(d, fname) {
      resultBox.innerHTML = `<h3>📄 Rezultat: ${esc(fname)}</h3>`;
      if (d.kind === "session") {
        const m = d.metrics || {};
        const card = el("div", "card");
        card.innerHTML = `<div class="pill-row">
            <span class="chip on">✅ prepoznato: SESIJA</span>
            ${m.dist_total ? `<span class="chip">${fmtN(m.dist_total, 2)} km</span>` : ""}
            ${m.top_speed ? `<span class="chip">max ${fmtN(m.top_speed)} km/h</span>` : ""}
            ${m.hr_avg ? `<span class="chip">puls ${m.hr_avg} bpm</span>` : ""}
            ${d.duration ? `<span class="chip">${d.duration} min</span>` : ""}
          </div>
          <p class="muted" style="font-size:12.5px;margin-top:8px">Kome da upišem sesiju?</p>`;
        const pick = athletePicker(async a => {
          const r = await API.post("/api/import/commit", { kind: "session", athlete: a.id, date: d.date, duration: d.duration, metrics: m, stype: "training" });
          if (r.ok) { toast(`Sesija upisana u karton: ${a.name}`); card.innerHTML = "<div class='badge b-gr'>✅ UPISANO U KARTON</div>"; }
          else toast(r.error || "Greška");
        });
        card.append(pick);
        resultBox.append(card);
      } else if (d.kind === "scale") {
        const card = el("div", "card");
        card.innerHTML = `<div class="pill-row"><span class="chip on">✅ prepoznato: IZVOZ VAGE (${d.entries.length} mjerenja)</span></div>
          <p class="muted" style="font-size:12.5px;margin-top:8px">Prvo mjerenje: težina ${fmtN(d.entries[0].weight, 1)} kg${d.entries[0].fat ? ", masnoća " + fmtN(d.entries[0].fat, 1) + "%" : ""}</p>`;
        const pick = athletePicker(async a => {
          const r = await API.post("/api/import/commit", { kind: "scale", athlete: a.id, entries: d.entries.map(e => ({ ...e, source: "import-" + fname })) });
          if (r.ok) { toast(`${r.imported} mjerenja upisano u karton: ${a.name}`); card.innerHTML = "<div class='badge b-gr'>✅ UPISANO U KARTON</div>"; }
        });
        card.append(pick);
        resultBox.append(card);
      } else {
        resultBox.append(el("div", "card", `❌ Nisam prepoznao format. ${esc(d.error || "")}`));
      }
    }

    function assignFlow(un) {
      toast(`${un.length} mjerenja čeka dodjelu — odaberi sportaša kojem pripadaju.`);
      const modal = el("div");
      modal.style.cssText = "position:fixed;inset:0;background:#04070ccc;z-index:70;display:flex;align-items:center;justify-content:center;padding:20px";
      const card = el("div", "card");
      card.style.cssText = "max-width:460px;width:100%;background:#0d1522";
      card.innerHTML = `<h3>⚖️ Rasporedi mjerenja s vage</h3>`;
      card.append(athletePicker(async a => {
        const r = await API.post("/api/scale/assign", { athlete: a.id, ids: un.map(x => x.id) });
        if (r.ok) { toast(`Upisano u karton: ${a.name}`); modal.remove(); VIEWS.import.render(cont); }
      }));
      const close = el("div", "btn ghost sm", "Odustani");
      close.style.marginTop = "10px"; close.style.width = "100%";
      close.onclick = () => modal.remove();
      card.append(close);
      modal.append(card);
      modal.onclick = e => { if (e.target === modal) modal.remove(); };
      document.body.append(modal);
    }
  }
};
