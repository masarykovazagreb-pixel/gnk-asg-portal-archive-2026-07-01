// SPT 2.2 — KONTROLNA SOBA: više live ploča na jednom ekranu, biraj što gledaš
"use strict";
VIEWS.soba = {
  title: "Kontrolna soba",
  sub: "Do 9 live ploča odjednom — teren, praćenje igrača, heatmap, usporedba dva igrača, puls zone, alarmi…",
  render(cont) {
    const self = this;
    this.dead = false;
    this.trails = {};          // key -> [{x,y}]
    this.heat = null;          // heatmap grid
    this.lastRed = 0;

    // ---------- stanje (persist) ----------
    let cfg;
    try { cfg = JSON.parse(localStorage.getItem("spt_soba_v1") || "null"); } catch (e) { cfg = null; }
    if (!cfg || !cfg.tiles || !cfg.tiles.length) {
      cfg = { layout: "g4", snd: false, tiles: [
        { type: "pitch" }, { type: "zones" }, { type: "alerts" }, { type: "fast" }
      ] };
    }
    const LAYOUTS = { g4: "2 × 2 (4 ploče)", g6: "3 × 2 (6 ploča)", g9: "3 × 3 (9 ploča)" };
    const save = () => localStorage.setItem("spt_soba_v1", JSON.stringify(cfg));

    // ---------- zaglavlje ----------
    const bar = el("div", "ctrl-row");
    bar.style.flexWrap = "wrap";
    const layWrap = el("div");
    layWrap.style.display = "flex"; layWrap.style.gap = "6px";
    for (const [id, lbl] of Object.entries(LAYOUTS)) {
      const c = el("div", "chip" + (cfg.layout === id ? " on" : ""), lbl);
      c.onclick = () => {
        cfg.layout = id; save();
        layWrap.querySelectorAll(".chip").forEach(x => x.classList.remove("on"));
        c.classList.add("on");
        grid.className = "soba-grid " + id;
      };
      layWrap.append(c);
    }
    // preseti
    const preWrap = el("div");
    preWrap.style.display = "flex"; preWrap.style.gap = "6px"; preWrap.style.flexWrap = "wrap";
    const PRESETS = {
      "🧢 Trener": [{ type: "pitch" }, { type: "score" }, { type: "events" }, { type: "zones" }],
      "💪 Kondicijski": [{ type: "compare" }, { type: "zones" }, { type: "alerts" }, { type: "heat" }],
      "🩹 Fizioterapeut": [{ type: "follow" }, { type: "alerts" }, { type: "zones" }, { type: "events" }],
      "📊 Analitičar": [{ type: "heat" }, { type: "fast" }, { type: "team0" }, { type: "team1" }, { type: "zones" }, { type: "score" }]
    };
    for (const [nm, tiles] of Object.entries(PRESETS)) {
      const c = el("div", "chip", nm);
      c.title = tiles.length + " ploča";
      c.onclick = () => {
        cfg.layout = tiles.length > 4 ? "g6" : "g4";
        cfg.tiles = tiles.map(t => ({ ...t }));
        save();
        layWrap.querySelectorAll(".chip").forEach(x => x.classList.toggle("on", x.textContent.endsWith(cfg.layout === "g4" ? "2 × 2 (4 ploče)" : "3 × 2 (6 ploča)")));
        grid.className = "soba-grid " + cfg.layout;
        buildGrid();
        toast("Preset: " + nm, "ok");
      };
      preWrap.append(c);
    }
    const addBtn = el("div", "btn sm", "➕ Dodaj ploču");
    const maxTiles = { g4: 4, g6: 6, g9: 9 }[cfg.layout];
    addBtn.onclick = () => {
      if (cfg.tiles.length >= maxTiles) { toast("Maksimalan broj ploča za ovaj raspored: " + maxTiles); return; }
      cfg.tiles.push({ type: "pitch" });
      save(); buildGrid();
    };
    const sndBtn = el("div", "btn ghost sm", cfg.snd ? "🔊 Zvuk: ON" : "🔇 Zvuk: OFF");
    sndBtn.onclick = () => { cfg.snd = !cfg.snd; save(); sndBtn.textContent = cfg.snd ? "🔊 Zvuk: ON" : "🔇 Zvuk: OFF"; };
    const fsBtn = el("div", "btn ghost sm", "⛶ Cijeli ekran");
    fsBtn.onclick = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
    bar.append(layWrap, preWrap, addBtn, sndBtn, fsBtn);
    cont.append(bar);

    const grid = el("div", "soba-grid " + cfg.layout);
    cont.append(grid);

    // ---------- definicije ploča ----------
    const TYPES = [
      ["pitch", "⚽ Teren (sve)"],
      ["follow", "🎯 Praćenje igrača"],
      ["team0", "🔵 Samo domaći"],
      ["team1", "🔴 Samo gosti"],
      ["heat", "🔥 Heatmap"],
      ["compare", "⚖️ Usporedba 2 igrača"],
      ["zones", "❤️ Puls zone"],
      ["fast", "⚡ Najbrži sada"],
      ["alerts", "🚨 Alarmi"],
      ["events", "📣 Događaji"],
      ["score", "🖥 Semafor"]
    ];

    function buildGrid() {
      grid.innerHTML = "";
      for (let i = 0; i < cfg.tiles.length; i++) grid.append(makeTile(i));
    }

    function makeTile(i) {
      const t = cfg.tiles[i];
      const tile = el("div", "card soba-tile");
      // header
      const head = el("div", "soba-head");
      const sel = el("select");
      for (const [v, l] of TYPES) {
        const o = el("option"); o.value = v; o.textContent = l;
        if (v === t.type) o.selected = true;
        sel.append(o);
      }
      sel.onchange = () => { t.type = sel.value; t.a = t.b = null; save(); rebuild(); };
      const x = el("div", "soba-x", "✕");
      x.title = "Ukloni ploču";
      x.onclick = () => {
        if (cfg.tiles.length <= 1) { toast("Mora ostati barem jedna ploča."); return; }
        cfg.tiles.splice(i, 1); save(); buildGrid();
      };
      head.append(sel, x);
      tile.append(head);
      const body = el("div", "soba-body");
      tile.append(body);

      function rebuild() {
        body.innerHTML = "";
        self.trails = {};
        buildBody();
      }

      function buildBody() {
        const type = t.type;
        if (type === "pitch" || type === "follow" || type === "team0" || type === "team1" || type === "compare" || type === "heat") {
          if (type === "follow" || type === "compare") {
            const pbar = el("div", "soba-pick");
            if (type === "follow") {
              const ps = el("select");
              ps.innerHTML = '<option value="">— odaberi igrača —</option>';
              t._roster && fillPlayers(ps, t.a);
              ps.onchange = () => { t.a = +ps.value || null; self.trails = {}; };
              pbar.append(ps);
              t._psel = ps;
            } else {
              const pa = el("select"); const pb = el("select");
              pa.innerHTML = pb.innerHTML = '<option value="">— igrač —</option>';
              t._pselA = pa; t._pselB = pb;
              pa.onchange = () => { t.a = +pa.value || null; self.trails = {}; };
              pb.onchange = () => { t.b = +pb.value || null; self.trails = {}; };
              pbar.append(el("span", "faint", "A:"), pa, el("span", "faint", "B:"), pb);
            }
            body.append(pbar);
          }
          const cvs = type === "compare"
            ? [el("canvas", "soba-cv"), el("canvas", "soba-cv")]
            : [el("canvas", "soba-cv")];
          const wrap = el("div", "soba-cvwrap");
          for (const c of cvs) wrap.append(c);
          body.append(wrap);
          t._cvs = cvs;
          t._pitches = [null, null];
          if (type === "compare") {
            const cmp = el("div", "soba-cmp");
            t._cmp = cmp;
            body.append(cmp);
          }
          if (type === "heat") {
            self.heat = new Map();
            body.append(el("div", "muted soba-note", "Gustoća boravka igrača po zonama — nakuplja se dok gledaš."));
          }
        } else if (type === "zones") {
          t._zbox = el("div", "zone-wrap");
          body.append(t._zbox);
        } else if (type === "fast") {
          t._fbox = el("div", "zone-wrap");
          body.append(t._fbox);
        } else if (type === "alerts") {
          t._abox = el("div", "alert-feed");
          body.append(t._abox);
        } else if (type === "events") {
          t._ebox = el("div", "event-feed");
          body.append(t._ebox);
        } else if (type === "score") {
          t._sbox = el("div", "soba-score");
          body.append(t._sbox);
        }
      }

      function fillPlayers(ps, cur) {
        for (const p of (self._roster || [])) {
          const o = el("option"); o.value = p.aid; o.textContent = `#${p.num} ${p.name}`;
          if (cur === p.aid) o.selected = true;
          ps.append(o);
        }
      }

      buildBody();
      tile._update = (fr, alerts) => updateTile(t, fr, alerts);
      // drag & drop preslagivanje
      tile.draggable = true;
      tile.addEventListener("dragstart", e => { tile.classList.add("dragging"); e.dataTransfer.setData("text/plain", String(i)); });
      tile.addEventListener("dragend", () => tile.classList.remove("dragging"));
      tile.addEventListener("dragover", e => e.preventDefault());
      tile.addEventListener("drop", e => {
        e.preventDefault();
        const from = +e.dataTransfer.getData("text/plain");
        if (isNaN(from) || from === i) return;
        const [mv] = cfg.tiles.splice(from, 1);
        cfg.tiles.splice(i, 0, mv);
        save(); buildGrid();
      });
      return tile;
    }

    // ---------- crtanje ploča ----------
    function ensurePitch(t, idx, fr) {
      const cv = t._cvs[idx];
      if (!t._pitches[idx] || t._pitches[idx].sport !== fr.sport) {
        t._pitches[idx] = new Pitch(cv, { L: fr.L, W: fr.W, sport: fr.sport, mode: "2d", padding: 16 });
        t._pitches[idx].sport = fr.sport;
      } else {
        t._pitches[idx].resize();
      }
      return t._pitches[idx];
    }

    function drawTrail(P, key, p, color) {
      const tr = (self.trails[key] = self.trails[key] || []);
      tr.push({ x: p.x, y: p.y });
      if (tr.length > 90) tr.shift();
      if (tr.length > 2) {
        const ctx = P.ctx;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        let first = true;
        for (const q of tr) {
          const s = P.project(q.x, q.y);
          if (first) { ctx.moveTo(s.x, s.y); first = false; } else ctx.lineTo(s.x, s.y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      // strelica smjera (brzina)
      if (tr.length > 3) {
        const a = tr[tr.length - 4], b = tr[tr.length - 1];
        const sa = P.project(a.x, a.y), sb = P.project(b.x, b.y);
        const ang = Math.atan2(sb.y - sa.y, sb.x - sa.x);
        const ctx = P.ctx;
        ctx.save();
        ctx.translate(sb.x, sb.y); ctx.rotate(ang);
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-4, -5); ctx.lineTo(-4, 5); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    }

    function dimPlayer(P, p) {
      const s = P.project(p.x, p.y);
      const ctx = P.ctx;
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = TEAM_COLORS[p.team].main;
      ctx.beginPath(); ctx.arc(s.x, s.y, 4.5, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    }

    function heatCell(fr) {
      if (!self.heat) self.heat = new Map();
      const gx = Math.round(fr.ball ? fr.L : 100) ; // noop guard
      for (const p of fr.players) {
        const key = Math.round(p.x / 4) + "," + Math.round(p.y / 4);
        self.heat.set(key, (self.heat.get(key) || 0) + 1);
      }
    }

    function drawHeat(P, fr) {
      const ctx = P.ctx;
      for (const [k, c] of self.heat) {
        const [gx, gy] = k.split(",").map(Number);
        const s = P.project(gx * 4, gy * 4);
        const a = Math.min(0.4, 0.03 + c * 0.012);
        const r = Math.min(26, 8 + c * 0.8);
        const grd = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
        const col = c > 25 ? "255,90,95" : c > 12 ? "251,191,36" : "56,214,245";
        grd.addColorStop(0, `rgba(${col},${a})`);
        grd.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, 7); ctx.fill();
      }
    }

    function updateTile(t, fr, alerts) {
      const type = t.type;
      // roster za pickere (jednom)
      if ((type === "follow" || type === "compare") && !self._roster && fr.players) {
        self._roster = fr.players.map(p => ({ aid: p.aid, num: p.num, name: p.name }));
        if (t._psel) { const cur = t.a; t._psel.innerHTML = ""; fillPlayers(t._psel, cur); }
        if (t._pselA) { const ca = t.a; t._pselA.innerHTML = ""; fillPlayers(t._pselA, ca); }
        if (t._pselB) { const cb = t.b; t._pselB.innerHTML = ""; fillPlayers(t._pselB, cb); }
      }

      if (type === "pitch" || type === "team0" || type === "team1") {
        const P = ensurePitch(t, 0, fr);
        P.drawField();
        const teamF = type === "team0" ? 0 : type === "team1" ? 1 : null;
        for (const p of fr.players) {
          if (teamF === null || p.team === teamF)
            P.drawPlayer(p.x, p.y, p.num, p.team, { gk: p.role === "GK", size: fr.sport === "kosarka" ? 13 : 11 });
        }
        P.drawBall(fr.ball.x, fr.ball.y, fr.ball.z);
      }

      else if (type === "follow") {
        const P = ensurePitch(t, 0, fr);
        P.drawField();
        for (const p of fr.players) if (p.aid !== t.a) dimPlayer(P, p);
        const me = fr.players.find(p => p.aid === t.a);
        if (me) {
          drawTrail(P, "f" + t.a, me, "#a3e635");
          P.drawPlayer(me.x, me.y, me.num, me.team, { gk: me.role === "GK", name: me.name, size: 14 });
          // info kutija
          const ctx = P.ctx;
          ctx.fillStyle = "#0d1522dd";
          ctx.fillRect(6, 6, 150, 46);
          ctx.fillStyle = "#e8eef8"; ctx.font = "bold 12px Segoe UI";
          ctx.fillText(me.name, 14, 22);
          ctx.font = "11px Segoe UI"; ctx.fillStyle = "#8ea0b8";
          ctx.fillText(`⚡ ${me.speed} km/h   ❤️ ${me.hr} bpm`, 14, 38);
          ctx.fillText(`🏁 ${me.dist} km   🔃 ${me.sprints}`, 14, 50);
        } else {
          const ctx = P.ctx; ctx.fillStyle = "#8ea0b8"; ctx.font = "12px Segoe UI";
          ctx.fillText("Odaberi igrača u izborniku ↑", 12, 20);
        }
        P.drawBall(fr.ball.x, fr.ball.y, fr.ball.z);
      }

      else if (type === "heat") {
        heatCell(fr);
        const P = ensurePitch(t, 0, fr);
        P.drawField();
        drawHeat(P, fr);
      }

      else if (type === "compare") {
        const A = fr.players.find(p => p.aid === t.a);
        const B = fr.players.find(p => p.aid === t.b);
        // lijeva polovica: igrač A ; desna: igrač B
        const P1 = ensurePitch(t, 0, fr);
        P1.drawField();
        const P2 = ensurePitch(t, 1, fr);
        P2.drawField();
        if (A) { drawTrail(P1, "c" + t.a, A, "#a3e635"); P1.drawPlayer(A.x, A.y, A.num, A.team, { gk: A.role === "GK", name: A.name, size: 14 }); }
        if (B) { drawTrail(P2, "c" + t.b, B, "#38d6f5"); P2.drawPlayer(B.x, B.y, B.num, B.team, { gk: B.role === "GK", name: B.name, size: 14 }); }
        P1.drawBall(fr.ball.x, fr.ball.y, fr.ball.z);
        P2.drawBall(fr.ball.x, fr.ball.y, fr.ball.z);
        if (!A || !B) {
          P1.ctx.fillStyle = P2.ctx.fillStyle = "#8ea0b8";
          P1.ctx.font = P2.ctx.font = "12px Segoe UI";
          if (!A) P1.ctx.fillText("Odaberi igrača A ↑", 12, 20);
          if (!B) P2.ctx.fillText("Odaberi igrača B ↑", 12, 20);
        }
        // usporedna statistika
        if (A && B && t._cmp) {
          const rows = [
            ["⚡ km/h sada", A.speed, B.speed, 1],
            ["❤️ puls", A.hr, B.hr, -1],
            ["🏁 km", A.dist, B.dist, 1],
            ["🔁 sprintevi", A.sprints, B.sprints, 1],
            ["🚀 max km/h", A.top, B.top, 1]
          ];
          t._cmp.innerHTML = rows.map(([lbl, va, vb, better]) => {
            const mx = Math.max(va, vb, 0.001);
            const aWins = better > 0 ? va >= vb : va <= vb;
            const bWins = better > 0 ? vb >= va : vb <= va;
            return `<div class="cmp-row">
              <b class="${aWins ? "win" : ""}">${fmtN(va)}</b>
              <div class="cmp-mid">
                <div class="cmp-lbl">${lbl}</div>
                <div class="cmp-bars">
                  <div class="cmp-bar a"><i style="width:${Math.round(100 * va / mx)}%"></i></div>
                  <div class="cmp-bar b"><i style="width:${Math.round(100 * vb / mx)}%"></i></div>
                </div>
              </div>
              <b class="${bWins ? "win" : ""}">${fmtN(vb)}</b>
            </div>`;
          }).join("") + `<div class="cmp-names"><span style="color:var(--accent2)">🟢 A: ${esc(A.name)}</span>
             <span style="color:var(--accent)">🔵 B: ${esc(B.name)}</span></div>`;
        } else if (t._cmp) {
          t._cmp.innerHTML = '<div class="muted" style="font-size:12px">Odaberi oba igrača za usporedbu.</div>';
        }
      }

      else if (type === "zones") {
        const zones = [0, 0, 0, 0, 0];
        for (const p of fr.players) zones[p.hr >= 180 ? 4 : p.hr >= 160 ? 3 : p.hr >= 140 ? 2 : p.hr >= 120 ? 1 : 0]++;
        const zc = ["#3aa0ff", "#38d6f5", "#a3e635", "#fbbf24", "#ff5a5f"];
        t._zbox.innerHTML = zones.map((n, i) => `
          <div class="zone-bar"><span class="zlbl">Z${i + 1}</span>
            <div class="zb"><i style="width:${Math.round(100 * n / Math.max(1, fr.players.length))}%;background:${zc[i]}"></i></div>
            <b>${n}</b></div>`).join("");
      }

      else if (type === "fast") {
        const top = [...fr.players].sort((a, b) => b.speed - a.speed).slice(0, 6);
        const mx = Math.max(1, top[0] ? top[0].speed : 1);
        t._fbox.innerHTML = top.map(p => `
          <div class="zone-bar"><span class="zlbl" style="width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.name)}</span>
            <div class="zb"><i style="width:${Math.round(100 * p.speed / mx)}%;background:${p.speed > 25 ? "var(--red)" : "var(--accent2)"}"></i></div>
            <b>${fmtN(p.speed)}</b></div>`).join("");
      }

      else if (type === "alerts") {
        const reds = (alerts || []).filter(a => a.sev === "red").length;
        t._abox.innerHTML = (alerts || []).length
          ? alerts.map(x => `<div class="alert-item ${x.sev}"><span class="ai">${x.sev === "red" ? "🔴" : "🟡"}</span> ${esc(x.txt)}</div>`).join("")
          : '<div class="muted" style="font-size:12px">Nema alarma ✓</div>';
      }

      else if (type === "events") {
        t._ebox.innerHTML = (fr.events || []).map(e => {
          const cls = e.type === "goal" ? "goal" : (e.type === "score" ? "score" : "");
          const mn = Math.floor(e.t / 60) + 1;
          return `<div class="ev ${cls}"><span class="t">${mn}'</span><span>${esc(e.text)}</span></div>`;
        }).join("") || '<div class="muted" style="font-size:12px">Još bez događaja…</div>';
      }

      else if (type === "score") {
        const mn = Math.floor(fr.t / 60), sec = Math.floor(fr.t % 60);
        t._sbox.innerHTML = `
          <div class="sc-big">
            <div class="sc-team" style="color:${TEAM_COLORS[0].main}">DOMAĆINI</div>
            <div class="sc-num">${fr.score[0]} : ${fr.score[1]}</div>
            <div class="sc-team" style="color:${TEAM_COLORS[1].main}">GOSTI</div>
          </div>
          <div class="sc-clock mono">${String(mn).padStart(2, "0")}:${String(sec).padStart(2, "0")}</div>
          <div class="sc-sport faint">${esc(sportName(fr.sport))}</div>`;
      }
    }

    // ---------- jedna petlja za sve ploče ----------
    let roster = null;
    async function loop() {
      let alerts = [];
      let tick = 0;
      while (!self.dead) {
        let fr;
        try {
          [fr, alerts] = await Promise.all([
            API.get("/api/live/frame"),
            (tick % 2 === 0 ? API.get("/api/live/alerts") : Promise.resolve(alerts))
          ]);
        } catch (e) { await new Promise(r => setTimeout(r, 900)); continue; }
        if (self.dead || !fr.players) { await new Promise(r => setTimeout(r, 700)); continue; }
        // beep na novi crveni alarm
        const reds = (alerts || []).filter(a => a.sev === "red").length;
        if (reds > self.lastRed && cfg.snd) beep(880);
        self.lastRed = reds;
        grid.querySelectorAll(".soba-tile").forEach(tile => { if (tile._update) tile._update(fr, alerts); });
        tick++;
        await new Promise(r => setTimeout(r, 650));
      }
    }

    buildGrid();
    loop();
  },
  destroy() { this.dead = true; }
};

// kratki zvučni signal (WebAudio)
function beep(freq = 880) {
  try {
    const a = new (window.AudioContext || window.webkitAudioContext)();
    const o = a.createOscillator(); const g = a.createGain();
    o.connect(g); g.connect(a.destination);
    o.frequency.value = freq; g.gain.value = 0.07;
    o.start();
    setTimeout(() => { o.stop(); a.close(); }, 160);
  } catch (e) {}
}
