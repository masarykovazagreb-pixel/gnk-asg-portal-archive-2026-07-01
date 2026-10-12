// SPT — Praćenje uživo (GPS / UWB-M2M / BLE)
"use strict";
VIEWS.live = {
  title: "Praćenje uživo",
  sub: "Pozicije igrača i lopte u realnom vremenu — čipovi preko M2M (UWB) mreže u dvorani ili GPS-a vani",
  render(cont) {
    const self = this;
    this.timers = [];
    this.pitch = null;
    this.sortKey = "dist"; this.sortDir = -1;
    this.mode = null;

    // ---------- raspored ----------
    const ctrl = el("div", "ctrl-row");
    const matchSel = el("select");
    matchSel.id = "liveMatchSel";
    const modeWrap = el("div");
    modeWrap.style.display = "flex"; modeWrap.style.gap = "7px"; modeWrap.style.flexWrap = "wrap";
    const modes = [
      { id: "auto", lbl: "AUTO (najbolja mreža)" },
      { id: "uwb", lbl: "UWB · M2M indoor" },
      { id: "gps", lbl: "GPS / GNSS" },
      { id: "ble", lbl: "Bluetooth" }
    ];
    for (const m of modes) {
      const c = el("div", "chip" + (m.id === "auto" ? " on" : ""), m.lbl);
      c.onclick = async () => {
        modeWrap.querySelectorAll(".chip").forEach(x => x.classList.remove("on"));
        c.classList.add("on");
        await API.post("/api/live/config", { mode: m.id });
        toast("Način povezivanja: " + m.lbl);
      };
      c.dataset.mode = m.id;
      modeWrap.append(c);
    }
    const speedWrap = el("div");
    speedWrap.style.display = "flex"; speedWrap.style.gap = "7px"; speedWrap.style.alignItems = "center";
    speedWrap.append(el("span", "faint", "brzina simulacije:"));
    for (const s of [1, 6, 10, 20]) {
      const c = el("div", "chip" + (s === 10 ? " on gr" : ""), s + "×");
      c.onclick = async () => {
        speedWrap.querySelectorAll(".chip").forEach(x => x.classList.remove("on"));
        c.classList.add("on");
        await API.post("/api/live/config", { speed: s });
      };
      speedWrap.append(c);
    }
    const rst = el("div", "btn ghost sm", "⟲ Od početka");
    rst.onclick = async () => { await API.post("/api/live/config", { reset: true }); };
    ctrl.append(matchSel, modeWrap, speedWrap, rst);
    cont.append(ctrl);

    const split = el("div", "split");
    const left = el("div", "split-l");
    const right = el("div", "split-r");

    // semafor
    const sbCard = el("div", "card scoreboard");
    sbCard.innerHTML = `
      <div class="team" style="color:${TEAM_COLORS[0].main}">DOMAĆINI</div>
      <div class="sc" id="lvScore">0 : 0</div>
      <div class="team" style="color:${TEAM_COLORS[1].main}">GOSTI</div>
      <div class="clock" id="lvClock">00:00</div>`;
    // canvas teren
    const pitchCard = el("div", "card");
    const cv = el("canvas", "pitch");
    cv.style.height = "auto";
    cv.style.aspectRatio = "105 / 78";
    pitchCard.append(cv);
    const zoneCard = el("div", "card");
    zoneCard.innerHTML = `<h3>❤️ Zone pulsa momčadi</h3><div id="lvZones" class="zone-wrap"></div>
      <hr class="sep"><h3>⚡ Najbrži sada</h3><div id="lvFast"></div>`;
    left.append(sbCard, pitchCard, zoneCard);

    // signal panel
    const sigCard = el("div", "card");
    sigCard.innerHTML = `<h3>📶 Veza s čipovima</h3><div class="sig-grid" id="lvSig"></div>
      <hr class="sep">
      <div style="font-size:12px" class="muted" id="lvSigNote"></div>`;
    // feed događaja
    const evCard = el("div", "card");
    evCard.innerHTML = `<h3>⚡ Događaji</h3><div class="event-feed" id="lvEvents"></div>`;
    const alertCard = el("div", "card");
    alertCard.innerHTML = `<h3>🚨 Alarmi uživo <span class="live-dot" style="margin-left:6px"></span></h3>
      <div id="lvAlerts" class="alert-feed"></div>`;
    right.append(alertCard, sigCard, evCard);

    // tablica statistike
    const statsCard = el("div", "card");
    statsCard.style.marginTop = "14px";
    statsCard.innerHTML = `<h3>📊 Metrike u realnom vremenu <span class="faint" style="float:right;font-weight:500">klikni zaglavlje za sortiranje</span></h3>`;
    const tblWrap = el("div", "scroll-x");
    const tbl = el("table", "tbl");
    tbl.innerHTML = `<thead><tr>
      <th>#</th><th>Igrač</th><th>T</th><th>Poz.</th>
      <th class="num" data-k="dist">km</th><th class="num" data-k="top">max km/h</th>
      <th class="num" data-k="speed">km/h sada</th><th class="num" data-k="sprints">sprint</th>
      <th class="num" data-k="hr">puls</th><th class="num" data-k="batt">baterija</th></tr></thead>`;
    const tb = el("tbody"); tb.id = "lvTb";
    tbl.append(tb);
    tblWrap.append(tbl);
    statsCard.append(tblWrap);
    tbl.querySelectorAll("th[data-k]").forEach(th => {
      th.style.cursor = "pointer";
      th.onclick = () => {
        const k = th.dataset.k;
        if (self.sortKey === k) self.sortDir *= -1; else { self.sortKey = k; self.sortDir = -1; }
        th.closest("tr").querySelectorAll("th").forEach(x => x.textContent = x.textContent.replace(/ [↓↑]/, ""));
        th.textContent += self.sortDir === -1 ? " ↓" : " ↑";
      };
    });
    split.append(left, right);
    cont.append(split, statsCard);

    // ---------- logika ----------
    async function init() {
      const st = await API.get("/api/live/status");
      matchSel.innerHTML = "";
      for (const m of st.matches) {
        const o = el("option");
        o.value = m.id;
        o.textContent = `${m.name} — ${sportName(m.sport)}`;
        matchSel.append(o);
      }
      matchSel.value = st.match;
      matchSel.onchange = async () => {
        await API.post("/api/live/config", { match: matchSel.value });
        toast("Prebacio sam prijenos na " + matchSel.value);
      };
    }

    async function poll() {
      let st, fr;
      try {
        [st, fr] = await Promise.all([API.get("/api/live/status"), API.get("/api/live/frame")]);
      } catch (e) { return; }
      if (!fr.players) return;
      // pitch
      if (!self.pitch || self.pitch.sport !== fr.sport) {
        self.pitch = new Pitch(cv, { L: fr.L, W: fr.W, sport: fr.sport, mode: "2d", padding: 30 });
        cv.style.aspectRatio = `${fr.L} / ${Math.round(fr.W + fr.L * 0.14)}`;
      } else { self.pitch.resize(); }
      const P = self.pitch;
      P.drawField();
      for (const p of fr.players) {
        P.drawPlayer(p.x, p.y, p.num, p.team, {
          gk: p.role === "GK",
          name: p.name,
          size: fr.sport === "kosarka" ? 15 : 13
        });
      }
      P.drawBall(fr.ball.x, fr.ball.y, fr.ball.z);

      // semafor + sat
      document.getElementById("lvScore").textContent = `${fr.score[0]} : ${fr.score[1]}`;
      document.getElementById("lvClock").textContent = matchMinute(fr.t, fr.sport);

      // signal
      const sig = st.signal;
      const sigEl = document.getElementById("lvSig");
      const rows = [];
      rows.push(["Tehnologija", sig.label]);
      rows.push(["Frekvencija", sig.hz + " Hz"]);
      if (sig.sats != null) rows.push(["Sateliti", sig.sats + " / 16"]);
      if (sig.anchors != null) rows.push(["UWB sidra (anchors)", sig.anchors]);
      rows.push(["Latencija", sig.latency + " ms", sig.latency < 60]);
      rows.push(["Gubitak paketa", sig.loss + " %", sig.loss < 1]);
      rows.push(["Točnost pozicije", sig.acc]);
      sigEl.innerHTML = rows.map(r =>
        `<div class="k">${r[0]}</div><div class="v${r[2] === false ? " warn" : ""}">${r[1]}</div>`).join("");
      document.getElementById("lvSigNote").innerHTML =
        (st.effective === "uwb"
          ? "M2M mreža: čipovi na dresovima komuniciraju sa <b>12 UWB sidara</b> po dvorani (mesh mreža, 20 Hz, ±10 cm). Podaci idu preko lokalnog gatewaya do SPT poslužitelja."
          : st.effective === "gps"
            ? "GNSS prijam: čipovi primaju signale <b>L1/L2 satelita</b> (10 Hz). Za indoor sportove preporučujemo UWB/M2M jer krov blokira satelite."
            : "BLE most: čipovi šalju preko Bluetooth veze do rubnog gatewaya (4 Hz, veća latencija).");

      // događaji
      const evEl = document.getElementById("lvEvents");
      evEl.innerHTML = (fr.events || []).map(e => {
        const cls = e.type === "goal" ? "goal" : (e.type === "score" ? "score" : "");
        const mn = Math.floor(e.t / 60) + 1;
        return `<div class="ev ${cls}"><span class="t">${mn}'</span><span>${esc(e.text)}</span></div>`;
      }).join("") || '<div class="muted" style="font-size:12px">Još bez događaja...</div>';

      // tablica
      const rows2 = [...fr.players];
      rows2.sort((a, b) => (a[self.sortKey] ?? 0) < (b[self.sortKey] ?? 0) ? self.sortDir : -self.sortDir);
      // zone pulsa + najbrži
      const zones = [0, 0, 0, 0, 0];
      for (const p of fr.players) zones[p.hr >= 180 ? 4 : p.hr >= 160 ? 3 : p.hr >= 140 ? 2 : p.hr >= 120 ? 1 : 0]++;
      const zc = ["#3aa0ff", "#38d6f5", "#a3e635", "#fbbf24", "#ff5a5f"];
      const zEl = document.getElementById("lvZones");
      if (zEl) zEl.innerHTML = zones.map((n, i) => `
        <div class="zone-bar"><span class="zlbl">Z${i + 1}</span>
          <div class="zb"><i style="width:${Math.round(100 * n / Math.max(1, fr.players.length))}%;background:${zc[i]}"></i></div>
          <b>${n}</b></div>`).join("");
      const fEl = document.getElementById("lvFast");
      if (fEl) {
        const top = [...fr.players].sort((a, b) => b.speed - a.speed).slice(0, 5);
        const mx = Math.max(1, top[0] ? top[0].speed : 1);
        fEl.innerHTML = top.map(p => `
          <div class="zone-bar"><span class="zlbl" style="width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.name)}</span>
            <div class="zb"><i style="width:${Math.round(100 * p.speed / mx)}%;background:var(--accent2)"></i></div>
            <b>${fmtN(p.speed)}</b></div>`).join("");
      }
      tb.innerHTML = rows2.map(p => `
        <tr>
          <td class="muted mono">${p.num}</td>
          <td><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${TEAM_COLORS[p.team].main};margin-right:7px"></span>${esc(p.name)}</td>
          <td>${p.team === 0 ? '<span class="badge b-red">DOM</span>' : '<span class="badge b-blue">GOST</span>'}</td>
          <td class="muted">${esc(p.role)}</td>
          <td class="num"><b>${fmtN(p.dist, 2)}</b></td>
          <td class="num">${fmtN(p.top)}</td>
          <td class="num" style="color:${p.speed > 25 ? "var(--accent2)" : p.speed > 19 ? "var(--amber)" : "inherit"}">${fmtN(p.speed)}</td>
          <td class="num">${p.sprints}</td>
          <td class="num" style="color:${p.hr > 175 ? "var(--red)" : p.hr > 160 ? "var(--amber)" : "var(--good)"}">${p.hr}</td>
          <td class="num ${p.batt < 50 ? "muted" : ""}">${Math.round(p.batt)}%</td>
        </tr>`).join("");
    }

    async function pollAlerts() {
      let a;
      try { a = await API.get("/api/live/alerts"); } catch (e) { return; }
      const elx = document.getElementById("lvAlerts");
      if (!elx) return;
      elx.innerHTML = (a.alerts || []).length
        ? a.alerts.map(x => `<div class="alert-item ${x.sev}"><span class="ai">${x.sev === "red" ? "🔴" : "🟡"}</span> ${esc(x.txt)}</div>`).join("")
        : '<div class="muted" style="font-size:12px">Nema aktivnih alarma — sve uredno ✓</div>';
    }

    init();
    this.timers.push(setInterval(poll, 500));
    this.timers.push(setInterval(pollAlerts, 1500));
    poll(); pollAlerts();
  },
  destroy() {
    this.timers.forEach(clearInterval);
    this.timers = [];
  }
};
