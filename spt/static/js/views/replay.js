// SPT — Reprodukcija utakmice: točkice u 2D i 3D, tragovi, heatmap, unatrag/unaprijed
"use strict";
VIEWS.replay = {
  title: "Reprodukcija utakmice",
  sub: "Kako se tko kretao po terenu — svaka sekunda, svaki igrač, u 2D i 3D",
  async render(cont) {
    const self = this;
    cont.append(spinner());
    this.raf = null; this.keys = null; this.resizeH = null;
    const matchesList = await API.get("/api/matches");
    this.matchId = matchesList[0].id;

    // ---------- kumulativni podatci ----------
    function precompute(fr) {
      fr._cum = fr.players.map(p => {
        const n = p.x.length;
        const dist = new Float64Array(n), top = new Float64Array(n), spr = new Uint16Array(n), spd = new Float64Array(n);
        let s = false;
        const thr = fr.meta.sport === "kosarka" ? 5.2 : 7.0;
        const off = fr.meta.sport === "kosarka" ? 4.6 : 6.5;
        for (let i = 1; i < n; i++) {
          const d = Math.hypot(p.x[i] - p.x[i - 1], p.y[i] - p.y[i - 1]);
          spd[i] = d;
          dist[i] = dist[i - 1] + d;
          top[i] = Math.max(top[i - 1], d * 3.6);
          if (d > thr && !s) { s = true; spr[i] = spr[i - 1] + 1; }
          else { if (d <= off) s = false; spr[i] = spr[i - 1]; }
        }
        return { dist, top, spr, spd };
      });
      // score vremenska linija
      fr._score = [];
      const sc = [0, 0];
      for (const ev of fr.events) {
        if (ev.type === "goal") { sc[ev.team]++; fr._score.push([ev.t, sc[0], sc[1]]); }
        if (ev.type === "score") {
          const m = ev.text.match(/(\d+):(\d+)/);
          if (m) { sc[0] = +m[1]; sc[1] = +m[2]; fr._score.push([ev.t, sc[0], sc[1]]); }
        }
      }
    }

    async function loadMatch(mid) {
      const fr = await API.get(`/api/matches/${mid}/replay`);
      precompute(fr);
      self.fr = fr;
      self.t = 0; self.dir = 1; self.playing = false;
      self.heat = null; self.heatIdx = 0;
      self.trails = fr.players.map(() => []);
      self.selected = -1;
      self.pitch = new Pitch(cv, { L: fr.meta.L, W: fr.meta.W, sport: fr.meta.sport, mode: "3d", padding: 26, interactive3d: true });
      cv.style.aspectRatio = `${fr.meta.L} / ${Math.round(fr.meta.W + fr.meta.L * 0.14)}`;
      buildTimeline();
      drawOnce();
      updateFocusPanel();
      matchInfoCard(mid);
    }

    cont.innerHTML = "";
    // ---------- kontrole ----------
    const ctrl = el("div", "ctrl-row");
    const matchSel = el("select");
    for (const m of matchesList) {
      const o = el("option"); o.value = m.id;
      o.textContent = `${m.id} · ${sportName(m.sport)} · ${m.home} ${m.score} ${m.away}`;
      matchSel.append(o);
    }
    matchSel.onchange = () => loadMatch(matchSel.value);
    const dimWrap = el("div");
    dimWrap.style.display = "flex"; dimWrap.style.gap = "7px";
    const c2d = el("div", "chip", "2D");
    const c3d = el("div", "chip on", "3D 🎥");
    c2d.onclick = () => { self.pitch.mode = "2d"; c2d.classList.add("on"); c3d.classList.remove("on"); };
    c3d.onclick = () => { self.pitch.mode = "3d"; c3d.classList.add("on"); c2d.classList.remove("on"); };
    dimWrap.append(c2d, c3d);
    const bPlay = el("div", "btn", "▶ Pokreni");
    const bRev = el("div", "btn ghost", "◀◀ Unatrag");
    const bFwd = el("div", "btn ghost", "Unaprijed ▶▶");
    bRev.onclick = () => { self.dir = -1; self.playing = true; bPlay.innerHTML = "⏸ Pauza"; };
    bFwd.onclick = () => { self.dir = 1; self.playing = true; bPlay.innerHTML = "⏸ Pauza"; };
    bPlay.onclick = () => {
      self.playing = !self.playing;
      if (self.playing && self.t >= self.fr.meta.duration - 1) self.t = 0;
      bPlay.innerHTML = self.playing ? "⏸ Pauza" : "▶ Pokreni";
    };
    const speedWrap = el("label", "fld", "brzina");
    const speedIn = el("input"); speedIn.type = "range"; speedIn.min = 0.25; speedIn.max = 8; speedIn.step = 0.25; speedIn.value = 2;
    const speedLbl = el("span", "", "2×");
    speedIn.oninput = () => speedLbl.textContent = (+speedIn.value) + "×";
    speedWrap.append(speedLbl, speedIn);
    speedWrap.style.minWidth = "150px";
    ctrl.append(matchSel, dimWrap, bRev, bPlay, bFwd, speedWrap);
    cont.append(ctrl);

    const split = el("div", "split");
    const left = el("div", "split-l");
    const right = el("div", "split-r");

    // semafor
    const sbCard = el("div", "card scoreboard");
    sbCard.innerHTML = `
      <div class="team" style="color:${TEAM_COLORS[0].main}" id="rpHome">DOM</div>
      <div class="sc" id="rpScore">0 : 0</div>
      <div class="team" style="color:${TEAM_COLORS[1].main}" id="rpAway">GOST</div>
      <div class="clock" id="rpClock">00:00</div>`;
    // teren
    const pitchCard = el("div", "card");
    const cv = el("canvas", "pitch");
    cv.style.aspectRatio = "105 / 78"; cv.style.height = "auto";
    pitchCard.append(cv);
    pitchCard.append(el("div", "faint", `<span class="kbd">SPACE</span> play/pauza · <span class="kbd">←</span><span class="kbd">→</span> korak · 3D: vuci za rotaciju, kotačić za zum`));
    left.append(sbCard, pitchCard);

    // timeline
    const tlCard = el("div", "card");
    this.tl = el("div", "timeline");
    tlCard.append(this.tl);
    const togWrap = el("div", "pill-row");
    const togs = [["tragovi", true], ["heatmap", false], ["imena", true], ["brzine", false]];
    this.opts = { tragovi: true, heatmap: false, imena: true, brzine: false };
    for (const [id, on] of togs) {
      const c = el("div", "chip" + (on ? " on gr" : ""), id.toUpperCase());
      c.onclick = () => { self.opts[id] = !self.opts[id]; c.classList.toggle("on"); c.classList.toggle("gr"); if (id === "heatmap" && !self.opts.heatmap) self.heat = null; };
      togWrap.append(c);
    }
    tlCard.append(togWrap);
    left.append(tlCard);

    // fokus panel
    const focusCard = el("div", "card focus-panel");
    focusCard.innerHTML = `<h3>🎯 Igrač u fokusu</h3><div class="muted" style="font-size:12.5px">Klikni na točkicu na terenu...</div>`;
    this.focusEl = focusCard;
    right.append(focusCard);

    // događaji
    const evCard = el("div", "card");
    evCard.innerHTML = `<h3>⚡ Ključni momenti <span class="faint" style="float:right;font-weight:500">(klik = skok)</span></h3>`;
    this.evEl = el("div", "event-feed");
    evCard.append(this.evEl);
    right.append(evCard);
    split.append(left, right);
    cont.append(split);

    // izvještaj
    const repCard = el("div", "card");
    repCard.style.marginTop = "14px";
    this.repEl = repCard;
    cont.append(repCard);

    async function matchInfoCard(mid) {
      const mi = await API.get(`/api/matches/${mid}`);
      document.getElementById("rpHome").textContent = mi.home;
      document.getElementById("rpAway").textContent = mi.away;
      // događaji
      self.evEl.innerHTML = "";
      for (const ev of self.fr.events) {
        const cls = ev.type === "goal" || ev.type === "score" ? ev.type : "";
        const d = el("div", "ev " + cls);
        d.style.cursor = "pointer";
        d.innerHTML = `<span class="t">${Math.floor(ev.t / 60) + 1}'</span><span>${esc(ev.text)}</span>`;
        d.onclick = () => { self.t = Math.max(0, ev.t - 4); self.playing = false; bPlay.innerHTML = "▶ Pokreni"; self.heat = null; self.heatIdx = 0; };
        self.evEl.append(d);
      }
      // izvještaj tablica
      const rep = mi.report;
      const techKeys = Object.keys(rep.players[0]?.tech || {});
      const techHead = self.fr.meta.sport === "nogomet"
        ? ["passes", "pass_ok", "shots", "goals", "assists"]
        : ["pts", "fga", "tpa", "reb", "ast"];
      const techName = { passes: "dodavanja", pass_ok: "uspj. dod.", shots: "udarci", goals: "golovi", assists: "asist.", pts: "poeni", fga: "šutevi", tpa: "za 3", reb: "skokovi", ast: "asist." };
      let html = `<h3>📋 Izvještaj — ${esc(sportName(mi.sport))} ${esc(mi.home)} ${esc(mi.score)} ${esc(mi.away)} · ${fmtD(mi.date)} · ${esc(mi.mode)}</h3>
      <div class="scroll-x"><table class="tbl"><thead><tr><th>Igrač</th><th>T</th><th>Poz.</th>
      <th class="num">km</th><th class="num">max km/h</th><th class="num">sprint</th><th class="num">ubrzanja</th><th class="num">puls</th><th class="num">optereć.</th>
      ${techHead.map(k => `<th class="num">${techName[k] || k}</th>`).join("")}
      </tr></thead><tbody>`;
      const sorted = [...rep.players].sort((a, b) => b.dist - a.dist);
      for (const p of sorted) {
        html += `<tr class="click" data-pi="${rep.players.indexOf(p)}">
          <td><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${TEAM_COLORS[p.team].main};margin-right:7px"></span>${esc(p.name)}</td>
          <td>${p.team === 0 ? '<span class="badge b-red">DOM</span>' : '<span class="badge b-blue">GOST</span>'}</td>
          <td class="muted">${esc(p.role)}</td>
          <td class="num"><b>${fmtN(p.dist, 2)}</b></td><td class="num">${fmtN(p.top_speed)}</td>
          <td class="num">${p.sprints}</td><td class="num">${p.acc}</td><td class="num">${p.hr_avg}</td><td class="num">${p.load}</td>
          ${techHead.map(k => `<td class="num">${p.tech[k] ?? "—"}</td>`).join("")}</tr>`;
      }
      html += `</tbody></table></div>
      <div class="muted" style="margin-top:10px;font-size:12px">Momčad DOM: ${fmtN(rep.teams[0].dist, 1)} km · ${rep.teams[0].sprints} sprinteva ${rep.possession ? "· posjed " + rep.possession[0] + "% : " + rep.possession[1] + "%" : ""} · Momčad GOST: ${fmtN(rep.teams[1].dist, 1)} km</div>`;
      repCard.innerHTML = html;
      repCard.querySelectorAll("tr.click").forEach(tr => {
        tr.onclick = () => { self.selected = +tr.dataset.pi; updateFocusPanel(); };
      });
    }

    function buildTimeline() {
      const tl = self.tl;
      tl.innerHTML = "";
      tl.append(el("div", "track"), el("div", "fill"));
      const knob = el("div", "knob"); tl.append(knob);
      for (const ev of self.fr.events) {
        if (ev.type === "half" || ev.type === "quarter" || ev.type === "rebound") continue;
        const mk = el("div", "mk " + (ev.type === "goal" ? "goal" : ev.type === "score" ? "score" : ""));
        mk.style.left = (ev.t / self.fr.meta.duration * 100) + "%";
        mk.title = `${Math.floor(ev.t / 60) + 1}' ${ev.text}`;
        mk.onclick = e => { e.stopPropagation(); self.t = Math.max(0, ev.t - 4); self.playing = false; bPlay.innerHTML = "▶ Pokreni"; self.heat = null; self.heatIdx = 0; };
        tl.append(mk);
      }
      function seek(e) {
        const r = tl.getBoundingClientRect();
        self.t = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * self.fr.meta.duration;
        self.heat = null; self.heatIdx = 0;
        for (const tr of self.trails) tr.length = 0;
      }
      let dragging = false;
      tl.addEventListener("pointerdown", e => { dragging = true; seek(e); tl.setPointerCapture(e.pointerId); });
      tl.addEventListener("pointermove", e => dragging && seek(e));
      tl.addEventListener("pointerup", () => dragging = false);
    }

    // ---------- heat ----------
    function ensureHeat() {
      if (!self.heat) {
        const gx = 42, gy = Math.max(10, Math.round(42 * self.fr.meta.W / self.fr.meta.L));
        self.heat = new Float32Array(gx * gy);
        self.heatG = [gx, gy];
        self.heatIdx = 0;
      }
      return self.heat;
    }
    function updateHeat(cur) {
      if (!self.opts.heatmap) return;
      const heat = ensureHeat();
      const [gx, gy] = self.heatG;
      const ci = Math.floor(cur);
      if (ci < self.heatIdx) { heat.fill(0); self.heatIdx = 0; }
      for (let s = self.heatIdx; s <= Math.min(ci, self.fr.meta.duration); s++) {
        for (const p of self.fr.players) {
          const ix = Math.min(gx - 1, Math.max(0, Math.floor(p.x[s] / self.fr.meta.L * gx)));
          const iy = Math.min(gy - 1, Math.max(0, Math.floor(p.y[s] / self.fr.meta.W * gy)));
          heat[iy * gx + ix] += 1;
        }
      }
      self.heatIdx = Math.max(self.heatIdx, ci);
    }

    // ---------- fokus ----------
    function updateFocusPanel() {
      const f = self.focusEl;
      if (self.selected < 0 || !self.fr) {
        f.innerHTML = `<h3>🎯 Igrač u fokusu</h3><div class="muted" style="font-size:12.5px">Klikni na točkicu na terenu...</div>`;
        return;
      }
      const p = self.fr.players[self.selected];
      const cum = self.fr._cum[self.selected];
      const i = Math.min(self.fr.meta.duration - 1, Math.floor(self.t));
      f.innerHTML = `<h3>🎯 Igrač u fokusu</h3>
        <div class="fp-head">
          <div class="player-dot-demo" style="background:${TEAM_COLORS[p.team].main}">${p.num}</div>
          <div><b style="font-size:15px">${esc(p.name)}</b><div class="muted" style="font-size:11.5px">${esc(p.role)} · ${p.team === 0 ? "domaćini" : "gosti"} · <span class="link" data-nav="1">profil →</span></div></div>
        </div>
        <div class="mini-stat"><span>Udaljenost do sada</span><b>${fmtN(cum.dist[i] / 1000, 2)} km</b></div>
        <div class="mini-stat"><span>Maks. brzina</span><b>${fmtN(cum.top[i])} km/h</b></div>
        <div class="mini-stat"><span>Sprinteva</span><b>${cum.spr[i]}</b></div>
        <div class="mini-stat"><span>Brzina sada</span><b>${fmtN(cum.spd[i] * 3.6)} km/h</b></div>
        <div class="chartbox" style="height:110px;margin-top:10px"><canvas class="chart" id="rpSpark"></canvas></div>
        <div class="faint" style="font-size:10.5px;margin-top:6px">brzina kroz utakmicu (km/h) — vertikalna linija = trenutak</div>`;
      f.querySelector("[data-nav]").onclick = () => nav("athlete", p.aid);
      const cvv = document.getElementById("rpSpark");
      const vals = [];
      for (let j = 0; j < cum.spd.length; j += 8) vals.push(cum.spd[j] * 3.6);
      sparkline(cvv, vals, TEAM_COLORS[p.team].main);
      // linija trenutka
      const ctx = cvv.getContext("2d");
      const wpx = cvv.clientWidth, hpx = cvv.clientHeight;
      const pos = self.t / self.fr.meta.duration * wpx;
      ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(pos, 0); ctx.lineTo(pos, hpx); ctx.stroke();
    }

    // ---------- render petlja ----------
    let lastT = performance.now();
    let lastFocusT = 0;
    function frame(now) {
      const dt = (now - lastT) / 1000; lastT = now;
      const fr = self.fr;
      if (fr) {
        if (self.playing) {
          self.t += self.dir * dt * (+speedIn.value) * 30;
          if (self.t >= fr.meta.duration) { self.t = fr.meta.duration; self.playing = false; bPlay.innerHTML = "▶ Pokreni"; }
          if (self.t < 0) { self.t = 0; self.playing = false; bPlay.innerHTML = "▶ Pokreni"; }
        }
        // crtanje
        if (!self.pitch || self.pitch.w !== cv.clientWidth) { if (!self.pitch) self.pitch = new Pitch(cv, { L: fr.meta.L, W: fr.meta.W, sport: fr.meta.sport, mode: "3d", padding: 26, interactive3d: true }); else self.pitch.resize(); }
        const P = self.pitch;
        P.showNames = self.opts.imena;
        P.drawField();
        if (self.opts.heatmap) { updateHeat(self.t); P.drawHeat(self.heat, self.heatG[0], self.heatG[1]); }
        const i = Math.max(0, Math.min(fr.meta.duration - 1, Math.floor(self.t)));
        const fpart = self.t - i;
        // tragovi
        if (self.playing && self.opts.tragi !== false && self.opts.tragovi) {
          for (let pi = 0; pi < fr.players.length; pi++) {
            const tr = self.trails[pi];
            const x = fr.players[pi].x[i], y = fr.players[pi].y[i];
            if (!tr.length || Math.hypot(x - tr[tr.length - 1][0], y - tr[tr.length - 1][1]) > 1.2) {
              tr.push([x, y]);
              if (tr.length > 14) tr.shift();
            }
          }
        }
        if (self.opts.tragovi) {
          for (let pi = 0; pi < fr.players.length; pi++) {
            P.drawTrail(self.trails[pi], TEAM_COLORS[fr.players[pi].team].main);
          }
        } else for (const tr of self.trails) tr.length = 0;
        // igrači (sortirano po dubini za 3D)
        const order = fr.players.map((p, pi) => {
          const x = p.x[i] + (p.x[i + 1] - p.x[i]) * fpart;
          const y = p.y[i] + (p.y[i + 1] - p.y[i]) * fpart;
          return { p, pi, x, y, vx: p.x[i + 1] - p.x[i], vy: p.y[i + 1] - p.y[i] };
        });
        if (P.mode === "3d") order.sort((a, b) => P.project(b.x, b.y).d - P.project(a.x, a.y).d);
        for (const o of order) {
          P.drawPlayer(o.x, o.y, o.p.num, o.p.team, {
            gk: o.p.role === "GK",
            name: o.p.name,
            selected: self.selected === o.pi,
            glow: self.selected === o.pi,
            size: fr.meta.sport === "kosarka" ? 16 : 13.5,
            speedVec: self.opts.brzine ? [o.vx, o.vy] : null
          });
        }
        const b = fr.ball;
        const bi = Math.min(b.x.length - 2, i);
        P.drawBall(b.x[bi] + (b.x[bi + 1] - b.x[bi]) * fpart,
          b.y[bi] + (b.y[bi + 1] - b.y[bi]) * fpart,
          b.z[bi] + (b.z[bi + 1] - b.z[bi]) * fpart);
        // semafor/sat/timeline
        let sc = [0, 0];
        for (const [et, s0, s1] of fr._score) { if (et <= self.t) sc = [s0, s1]; }
        document.getElementById("rpScore").textContent = `${sc[0]} : ${sc[1]}`;
        document.getElementById("rpClock").textContent = matchMinute(self.t, fr.meta.sport);
        const tlEl = self.tl;
        const pct = (self.t / fr.meta.duration * 100);
        tlEl.querySelector(".fill").style.width = pct + "%";
        tlEl.querySelector(".knob").style.left = pct + "%";
        if (now - lastFocusT > 500) { lastFocusT = now; updateFocusPanel(); }
      }
      self.raf = requestAnimationFrame(frame);
    }

    // klik na igrača
    cv.addEventListener("click", e => {
      const r = cv.getBoundingClientRect();
      const sx = e.clientX - r.left, sy = e.clientY - r.top;
      let best = -1, bd = 26;
      const i = Math.max(0, Math.min(self.fr.meta.duration - 1, Math.floor(self.t)));
      self.fr.players.forEach((p, pi) => {
        const pr = self.pitch.project(p.x[i], p.y[i]);
        const d = Math.hypot(pr.x - sx, pr.y - sy);
        if (d < bd) { bd = d; best = pi; }
      });
      self.selected = best;
      updateFocusPanel();
    });

    // tipkovnice
    this.keys = e => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
      if (e.code === "Space") { e.preventDefault(); bPlay.click(); }
      if (e.code === "ArrowLeft") { self.t = Math.max(0, self.t - 5); self.heat = null; }
      if (e.code === "ArrowRight") { self.t = Math.min(self.fr.meta.duration, self.t + 5); self.heat = null; }
    };
    document.addEventListener("keydown", this.keys);

    await loadMatch(this.matchId);
    this.raf = requestAnimationFrame(frame);
  },
  destroy() {
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this.keys) document.removeEventListener("keydown", this.keys);
  }
};
