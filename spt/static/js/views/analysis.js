// SPT — Analize: usporedba sportaša, ljestvice, distribucije
"use strict";
VIEWS.analysis = {
  title: "Analize i usporedbe",
  sub: "Uspoređuj sportaše iz bilo kojeg sporta i kluba — percentilne vrijednosti unutar pozicije i sporta",
  render(cont) {
    const self = this;
    this.timers = [];
    cont.innerHTML = "";

    const tabs = el("div", "tabs");
    const t1 = el("div", "chip on", "⚖️ Usporedba sportaša");
    const t2 = el("div", "chip", "🏆 Ljestvice");
    const t3 = el("div", "chip", "📊 Distribucije");
    tabs.append(t1, t2, t3);
    cont.append(tabs);

    const body = el("div");
    cont.append(body);

    t1.onclick = () => setTab(1);
    t2.onclick = () => setTab(2);
    t3.onclick = () => setTab(3);
    function setTab(n) {
      [t1, t2, t3].forEach((t, i) => t.classList.toggle("on", i === n - 1));
      body.innerHTML = "";
      if (n === 1) tabCompare(body);
      if (n === 2) tabLeaderboard(body);
      if (n === 3) tabHistogram(body);
    }

    // ---------------- TAB 1: usporedba ----------------
    function tabCompare(body) {
      const card = el("div", "card");
      card.append(el("h3", "", "Odaberi sportaše (do 4)"));
      const sel = el("div", "chipsel");
      const picker = athletePicker(a => {
        if (self.cmp.length >= 4) { toast("Maksimalno 4 sportaša za usporedbu."); return; }
        if (self.cmp.find(x => x.id === a.id)) return;
        self.cmp.push(a);
        drawSel();
        runCompare();
      });
      card.append(picker, sel);
      body.append(card);
      const outWrap = el("div", "grid g2"); outWrap.style.marginTop = "14px";
      body.append(outWrap);

      function drawSel() {
        sel.innerHTML = "";
        for (const a of self.cmp) {
          const s = el("div", "sel", `<span class="flag">${flag(a.country)}</span> ${esc(a.name)} <i>✕</i>`);
          s.querySelector("i").onclick = () => {
            self.cmp = self.cmp.filter(x => x.id !== a.id);
            drawSel(); runCompare();
          };
          sel.append(s);
        }
        if (!self.cmp.length) sel.append(el("span", "faint", "Još nitko nije odabran..."));
      }
      async function runCompare() {
        outWrap.innerHTML = "";
        if (self.cmp.length < 2) {
          outWrap.append(el("div", "card muted", "Odaberi barem 2 sportaša za usporedbu (radar prikazuje percentile — 50 = prosjek pozicije)."));
          return;
        }
        const data = await API.get("/api/compare?ids=" + self.cmp.map(a => a.id).join(","));
        if (!data.athletes.length) return;
        // radari
        const radarCard = el("div", "card");
        const axes = data.athletes[0].axes.map(a => a.hr);
        const series = data.athletes.map((a, i) => ({
          name: a.name, color: CHART_COLORS[i],
          values: a.axes.map(x => x.pct)
        }));
        radarCard.innerHTML = `<h3>Radar — percentili unutar pozicije</h3>`;
        const legend = legendRow(series);
        radarCard.append(legend);
        const rc = el("div", "chartbox tall");
        const rcv = el("canvas", "chart"); rc.append(rcv);
        radarCard.append(rc);
        // tablica
        const tblCard = el("div", "card");
        const metrics = data.athletes[0].axes;
        let html = `<h3>Detaljna usporedba</h3><div class="scroll-x"><table class="tbl"><thead><tr><th>Pokazatelj</th>`;
        for (const a of data.athletes) html += `<th class="num">${esc(a.name.split(" ").pop())}<div class="faint" style="font-weight:500;font-size:10px">${esc(a.position || "")}</div></th>`;
        html += `<th class="num">Raspon</th></tr></thead><tbody>`;
        metrics.forEach((m, mi) => {
          html += `<tr><td><b>${esc(m.hr)}</b> <span class="faint">(${esc(m.unit || "")})</span></td>`;
          let bestV = null, bestI = -1;
          const higher = true;
          for (const a of data.athletes) {
            const v = a.axes[mi].value;
            if (bestV === null || v > bestV) { bestV = v; bestI = data.athletes.indexOf(a); }
          }
          for (const a of data.athletes) {
            const ax = a.axes[mi] || { value: 0, pct: 0 };
            const isBest = data.athletes.indexOf(a) === bestI && data.athletes.length > 1;
            html += `<td class="num" style="${isBest ? "color:var(--accent2);font-weight:800" : ""}">${fmtN(ax.value, 2)} <span class="faint" style="font-size:10.5px">P${Math.round(ax.pct)}</span></td>`;
          }
          const vals = metrics[mi] && data.athletes.map(a => a.axes[mi].value);
          html += `<td class="num faint">${fmtN(Math.min(...vals), 1)} – ${fmtN(Math.max(...vals), 1)}</td></tr>`;
        });
        html += `</tbody></table></div><div class="faint" style="font-size:11.5px;margin-top:8px">P = percentil unutar vlastitog sporta i pozicije (P50 = prosjek). Zeleno = najbolji u usporedbi.</div>`;
        tblCard.innerHTML = html;
        outWrap.append(radarCard, tblCard);
        requestAnimationFrame(() => radarChart(rcv, axes, series));
      }
      self.cmp = self.cmp || [];
      drawSel();
      runCompare();
    }

    // ---------------- TAB 2: ljestvice ----------------
    async function tabLeaderboard(body) {
      const ctrl = el("div", "ctrl-row");
      const sports = await API.get("/api/sports");
      const spSel = el("select");
      for (const s of sports) {
        const o = el("option"); o.value = s.id; o.textContent = `${s.hr} (${s.count})`;
        spSel.append(o);
      }
      const mSel = el("select"); mSel.style.minWidth = "230px";
      const countrySel = el("select");
      countrySel.append(el("option", "", "🌍 sve zemlje"));
      const cs = await API.get("/api/countries");
      for (const c of cs) { const o = el("option"); o.value = c.code; o.textContent = c.flag + " " + c.name; countrySel.append(o); }
      const limSel = el("select");
      [10, 15, 25, 30].forEach(n => { const o = el("option"); o.value = n; o.textContent = "top " + n; limSel.append(o); });
      limSel.value = 15;
      ctrl.append(spSel, mSel, countrySel, limSel);
      body.append(ctrl);
      const out = el("div", "card");
      body.append(out);

      async function loadMetrics() {
        const ms = await API.get(`/api/metrics_for_sport?sport=${spSel.value}`);
        mSel.innerHTML = "";
        for (const m of ms) {
          const o = el("option"); o.value = m.id;
          o.textContent = `${m.hr}${m.unit && m.unit !== "br." ? " (" + m.unit + ")" : ""}`;
          mSel.append(o);
        }
      }
      async function run() {
        out.innerHTML = "";
        out.append(spinner());
        const d = await API.get(`/api/leaderboard?sport=${spSel.value}&metric=${mSel.value}&limit=${limSel.value}&country=${countrySel.value}`);
        out.innerHTML = `<h3>🏆 ${esc(d.name || mSel.value)} — top ${d.items.length}</h3>`;
        if (!d.items.length) { out.append(el("div", "muted", "Nema podataka.")); return; }
        const t = el("table", "tbl");
        t.innerHTML = `<thead><tr><th>#</th><th>Sportaš</th><th>Zemlja</th><th>Klub</th><th>Pozicija</th><th style="width:30%">Vrijednost</th><th class="num">Percentil</th></tr></thead>`;
        const tb = el("tbody");
        d.items.forEach((it, i) => {
          const tr = el("tr", "click");
          const mx = d.items[0].value || 1;
          tr.innerHTML = `<td class="mono muted">${i + 1}</td>
            <td><b>${esc(it.name)}</b></td><td><span class="flag">${flag(it.country)}</span> ${esc(cname(it.country))}</td>
            <td class="muted mono">${esc(it.club)}</td><td class="muted">${esc(it.position)}</td>
            <td><div class="progress"><i style="width:${Math.max(4, it.value / mx * 100)}%"></i></div></td>
            <td class="num"><b>${fmtN(it.value)}</b> <span class="faint" style="font-size:10.5px">${esc(d.unit || "")}</span><div class="faint" style="font-size:10.5px">P${Math.round(it.pct)}</div></td>`;
          tr.onclick = () => nav("athlete", it.id);
          tb.append(tr);
        });
        t.append(tb);
        out.append(t);
      }
      spSel.onchange = async () => { await loadMetrics(); run(); };
      mSel.onchange = run; countrySel.onchange = run; limSel.onchange = run;
      await loadMetrics();
      run();
    }

    // ---------------- TAB 3: distribucija ----------------
    async function tabHistogram(body) {
      const ctrl = el("div", "ctrl-row");
      const sports = await API.get("/api/sports");
      const spSel = el("select");
      for (const s of sports) { const o = el("option"); o.value = s.id; o.textContent = s.hr; spSel.append(o); }
      const mSel = el("select"); mSel.style.minWidth = "230px";
      ctrl.append(spSel, mSel);
      body.append(ctrl);
      const out = el("div", "card");
      body.append(out);
      async function loadMetrics() {
        const ms = await API.get(`/api/metrics_for_sport?sport=${spSel.value}`);
        mSel.innerHTML = "";
        for (const m of ms) { const o = el("option"); o.value = m.id; o.textContent = `${m.hr}${m.unit && m.unit !== "br." ? " (" + m.unit + ")" : ""}`; mSel.append(o); }
      }
      async function run() {
        out.innerHTML = ""; out.append(spinner());
        const d = await API.get(`/api/histogram?sport=${spSel.value}&metric=${mSel.value}`);
        out.innerHTML = `<h3>📊 Distribucija — ${esc(sportName(spSel.value))}</h3>
          <div class="pill-row muted" style="font-size:12.5px">
            <span class="chip on">n = ${d.n}</span>
            <span class="chip">prosjek <b>&nbsp;${fmtN(d.mean)}</b></span>
            <span class="chip" style="border-color:#5a4a10;color:#ffd97a">P10 ${fmtN(d.p10)}</span>
            <span class="chip" style="border-color:#3a5a10;color:#c9f2a0">P50 ${fmtN(d.p50)}</span>
            <span class="chip" style="border-color:#5a2020;color:#ff9d9f">P90 ${fmtN(d.p90)}</span>
          </div>`;
        const box = el("div", "chartbox tall");
        const cv = el("canvas", "chart");
        box.append(cv);
        out.append(box);
        requestAnimationFrame(() => histogram(cv, d.buckets, d));
      }
      spSel.onchange = async () => { await loadMetrics(); run(); };
      mSel.onchange = run;
      await loadMetrics();
      run();
    }

    setTab(1);
  }
};
