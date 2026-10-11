// SPT — Sportovi i mjerenja (katalog)
"use strict";
VIEWS.sports = {
  title: "Sportovi i mjerenja",
  sub: "Popis svih sportova u sustavu i svih mjerenja koja SPT prati — od lokomotorike do tehnike",
  async render(cont) {
    cont.innerHTML = "";
    const tabs = el("div", "tabs");
    const t1 = el("div", "chip on", "🏟 Sportovi");
    const t2 = el("div", "chip", "📏 Sva mjerenja");
    tabs.append(t1, t2);
    cont.append(tabs);
    const body = el("div");
    cont.append(body);

    t1.onclick = () => { t1.classList.add("on"); t2.classList.remove("on"); tabSports(); };
    t2.onclick = () => { t2.classList.add("on"); t1.classList.remove("on"); tabMetrics(); };

    async function tabSports() {
      body.innerHTML = ""; body.append(spinner());
      const sports = await API.get("/api/sports");
      body.innerHTML = "";
      // kategorije
      const cats = [...new Set(sports.map(s => s.cat))];
      const catNames = { field: "Velika igrališta", court: "Dvoranski sportovi", racket: "Reket", combat: "Borilački", strength: "Snaga", endurance: "Izdržljivost", water: "Vodeni", winter: "Zimski", precision: "Precizni", motor: "Motorički", individual: "Individualni" };
      const ctrl = el("div", "ctrl-row");
      const all = el("div", "chip on gr", "sve kategorije");
      ctrl.append(all);
      for (const c of cats) {
        const ch = el("div", "chip", catNames[c] || c);
        ch.onclick = () => {
          ctrl.querySelectorAll(".chip").forEach(x => x.classList.remove("on", "gr"));
          ch.classList.add("on"); ch.classList.add("gr");
          grid.querySelectorAll(".sport-card").forEach(sc => {
            sc.style.display = (sc.dataset.cat === c) ? "" : "none";
          });
        };
        ctrl.append(ch);
      }
      all.onclick = () => {
        ctrl.querySelectorAll(".chip").forEach(x => x.classList.remove("on", "gr"));
        all.classList.add("on", "gr");
        grid.querySelectorAll(".sport-card").forEach(sc => sc.style.display = "");
      };
      body.append(ctrl);

      const grid = el("div", "grid g4");
      const modeNames = { gnss: "GPS", uwb: "UWB/M2M", optical: "optika", imu: "IMU", wearable: "nosivi", plate: "sile", vbt: "VBT", radar: "radar", telemetrija: "telemetrija" };
      for (const s of sports) {
        const card = el("div", "card sport-card");
        card.dataset.cat = s.cat;
        card.innerHTML = `
          <b style="font-size:14.5px">${esc(s.hr)}</b>
          <div class="faint" style="font-size:11px;margin-top:2px">${esc(s.en)}</div>
          <div class="muted" style="font-size:12px;margin-top:8px">
            ${s.nteam ? `${s.nteam} igrača po momčadi · ` : "individualni · "}
            ${s.field[0] ? `${s.field[0]}×${s.field[1]} m` : "staza/krajolik"}
          </div>
          <div class="pill-row" style="margin:8px 0 0">
            <span class="badge b-cyan">${s.count} sportaša</span>
            ${s.modes.slice(0, 3).map(m => `<span class="badge b-dim">${modeNames[m] || m}</span>`).join("")}
          </div>`;
        card.onclick = () => sportDetail(s);
        grid.append(card);
      }
      body.append(grid);
    }

    async function sportDetail(s) {
      const d = await API.get(`/api/sports/${s.id}`);
      const modal = el("div");
      modal.style.cssText = "position:fixed;inset:0;background:#04070ccc;z-index:60;display:flex;align-items:center;justify-content:center;padding:20px";
      const card = el("div", "card");
      card.style.cssText = "max-width:820px;width:100%;max-height:86vh;overflow-y:auto;background:#0d1522";
      let html = `<h3>${esc(d.hr)} <span class="faint" style="font-weight:400">/ ${esc(d.en)}</span></h3>
        <div class="pill-row">
          <span class="badge b-cyan">${d.count} sportaša</span>
          ${d.nteam ? `<span class="badge b-blue">${d.nteam} po momčadi</span>` : '<span class="badge b-blue">individualni</span>'}
          ${d.field[0] ? `<span class="badge b-dim">teren ${d.field[0]}×${d.field[1]} m</span>` : ""}
        </div>
        <hr class="sep">
        <h3 style="margin-bottom:8px">Pozicije</h3>
        <div class="pill-row">${d.positions.map(p => `<span class="chip" style="cursor:default">${esc(p)}</span>`).join("")}</div>
        <h3 style="margin:14px 0 8px">Načini praćenja</h3>
        <div class="pill-row">${d.modes.map(m => `<span class="chip on" style="cursor:default">${{ gnss: "🛰 GPS/GNSS", uwb: "📡 UWB / M2M indoor", optical: "🎥 optički AI", imu: "⚙️ IMU čip", wearable: "⌚ nosivi", plate: "🦶 ploče sile", vbt: "🏋 VBT", radar: "🎯 radar", telemetrija: "🏎 telemetrija" }[m] || m}</span>`).join("")}</div>
        <h3 style="margin:14px 0 8px">Standardna mjerenja</h3>
        <div class="pill-row">${d.common_metrics.map(m => `<span class="badge b-gr" title="${esc(m.hr)}">${esc(m.hr)}</span>`).join("") || '<span class="muted">—</span>'}</div>`;
      if (d.tech_metrics.length) {
        html += `<h3 style="margin:14px 0 8px">Tehnička mjerenja (specifična za sport)</h3>
        <div class="pill-row">${d.tech_metrics.map(m => `<span class="badge b-amber">${esc(m.hr)}${m.unit && m.unit !== "br." ? " (" + esc(m.unit) + ")" : ""}</span>`).join("")}</div>`;
      }
      if (d.devices.length) {
        html += `<h3 style="margin:14px 0 8px">Preporučeni uređaji</h3>
        <table class="tbl"><thead><tr><th>Uređaj</th><th>Proizvođač</th><th>Tip</th><th>Frekvencija</th></tr></thead><tbody>
        ${d.devices.map(x => `<tr><td><b>${esc(x.name)}</b></td><td class="muted">${esc(x.vendor)}</td><td>${esc(x.typ)}</td><td class="mono">${esc(x.freq)}</td></tr>`).join("")}
        </tbody></table>`;
      }
      card.innerHTML = html;
      const close = el("div", "btn ghost sm", "Zatvori");
      close.style.marginTop = "12px";
      close.onclick = () => modal.remove();
      card.append(close);
      modal.append(card);
      modal.onclick = e => { if (e.target === modal) modal.remove(); };
      document.body.append(modal);
    }

    async function tabMetrics() {
      body.innerHTML = ""; body.append(spinner());
      const groups = await API.get("/api/metrics");
      body.innerHTML = "";
      const search = el("input"); search.type = "search"; search.placeholder = "🔎 Filtriraj mjerenja...";
      search.style.width = "100%"; search.style.marginBottom = "14px";
      body.append(search);
      const wrap = el("div", "");
      body.append(wrap);
      function draw() {
        wrap.innerHTML = "";
        const q = search.value.toLowerCase();
        for (const g of groups) {
          const items = g.items.filter(m => !q || m.hr.toLowerCase().includes(q) || (m.desc || "").toLowerCase().includes(q));
          if (!items.length) continue;
          const card = el("div", "card");
          card.style.marginBottom = "12px";
          const groupDesc = {
            lokomotorija: "Pozicijski podaci (GPS/UWB) i IMU — udaljenosti, brzine, sprintevi, ubrzanja",
            kardio: "Puls, HRV, potrošnja kisika i energije",
            opterecenje: "Unutarnje/vanjsko opterećenje, ACWR, spremnost, san",
            neuromuskularni: "Skokovi, doskoci, asimetrije, vrijeme kontakta",
            tehnicki: "Specifične akcije sporta (čip + pametna lopta + video AI)",
            okolis: "Temperatura, vlažnost, visina",
            timske: "Momčadski agregati"
          }[g.id] || "";
          card.innerHTML = `<h3>${esc(g.hr)} <span class="faint" style="font-weight:400;text-transform:none;letter-spacing:0">— ${items.length} pokazatelja · ${esc(groupDesc)}</span></h3>`;
          const t = el("table", "tbl");
          t.innerHTML = `<thead><tr><th>Naziv</th><th>Jedinica</th><th>Opis</th></tr></thead>`;
          const tb = el("tbody");
          for (const m of items) {
            tb.append(el("tr", "", `<td><b>${esc(m.hr)}</b> <span class="faint mono" style="font-size:10.5px">${esc(m.id)}</span></td>
              <td class="muted">${esc(m.unit || "—")}</td><td class="muted" style="white-space:normal;max-width:520px">${esc(m.desc || "")}</td>`));
          }
          t.append(tb);
          card.append(t);
          wrap.append(card);
        }
      }
      search.addEventListener("input", debounce(draw, 150));
      draw();
    }

    tabSports();
  }
};
