// SPT — Uređaji za praćenje performansi
"use strict";
VIEWS.devices = {
  title: "Uređaji",
  sub: "Katalog opreme: GPS trackeri, UWB/M2M čipovi, IMU, optički sustavi, fiziološki senzori...",
  async render(cont) {
    cont.append(spinner());
    const devs = await API.get("/api/devices");
    cont.innerHTML = "";
    const types = [...new Set(devs.map(d => d.typ))];
    const typeIcon = t => t.includes("GNSS") ? "🛰" : t.includes("UWB") ? "📡" : t.includes("Optički") ? "🎥" :
      t.includes("IMU") ? "⚙️" : t.includes("HR") ? "❤️" : t.includes("Nosivi") ? "⌚" : t.includes("Force") || t.includes("plate") ? "🦶" :
      t.includes("VBT") ? "🏋️" : t.includes("lopt") ? "⚽" : t.includes("EMG") ? "💪" : t.includes("NIRS") ? "🩸" :
      t.includes("CGM") ? "🍬" : t.includes("Temp") ? "🌡️" : t.includes("naočale") ? "🥽" : t.includes("mocap") ? "🦿" : "🔌";
    const ctrl = el("div", "ctrl-row");
    const all = el("div", "chip on gr", `svi (${devs.length})`);
    ctrl.append(all);
    for (const t of types) {
      const c = el("div", "chip", t);
      c.onclick = () => {
        ctrl.querySelectorAll(".chip").forEach(x => x.classList.remove("on", "gr"));
        c.classList.add("on"); c.classList.add("gr");
        grid.querySelectorAll(".dev-card").forEach(dc => dc.style.display = dc.dataset.typ === t ? "" : "none");
      };
      ctrl.append(c);
    }
    all.onclick = () => {
      ctrl.querySelectorAll(".chip").forEach(x => x.classList.remove("on", "gr"));
      all.classList.add("on"); all.classList.add("gr");
      grid.querySelectorAll(".dev-card").forEach(dc => dc.style.display = "");
    };
    cont.append(ctrl);

    const grid = el("div", "grid g3");
    for (const d of devs) {
      const card = el("div", "card dev-card");
      card.dataset.typ = d.typ;
      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:start;gap:8px">
          <div><b style="font-size:14.5px">${typeIcon(d.typ)} ${esc(d.name)}</b>
          <div class="faint" style="font-size:11.5px;margin-top:2px">${esc(d.vendor)}</div></div>
          <span class="badge b-cyan">${esc(d.typ)}</span>
        </div>
        <div class="pill-row" style="margin:4px 0">
          <span class="badge ${d.indoor ? "b-gr" : "b-dim"}">dvorana</span>
          <span class="badge ${d.outdoor ? "b-gr" : "b-dim"}">van</span>
          ${d.freq !== "—" ? `<span class="badge b-amber">${esc(d.freq)}</span>` : ""}
        </div>
        <div class="muted" style="font-size:12.5px;line-height:1.55">${esc(d.desc)}</div>
        ${d.acc !== "—" ? `<div style="font-size:11.5px;margin-top:6px" class="faint">točnost: <b>${esc(d.acc)}</b></div>` : ""}`;
      grid.append(card);
    }
    cont.append(grid);
  }
};
