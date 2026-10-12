// SPT — Izvještaji: generiranje, pregled, odobravanje, ispis (2.1)
"use strict";
VIEWS.izvjestaji = {
  title: "Izvještaji",
  sub: "Generiraj · pregledaj · odobri · ispiši — 7 vrsta izvještaja sa sažecima, grafikonima i preporukama",
  async render(cont) {
    cont.innerHTML = "";
    const state = { kind: "athlete", athlete: null, club: "", match: "M-001", days: 90 };
    const staff = AUTH.user && ["trener", "kondicijski", "admin"].includes(AUTH.user.role);
    const approver = AUTH.user && ["trener", "admin"].includes(AUTH.user.role);

    const grid = el("div", "grid g2");

    // ================= GENERATOR =================
    const gen = el("div", "card");
    gen.innerHTML = `<h3>🧾 Novi izvještaj</h3>`;
    if (!staff) {
      gen.append(el("div", "muted", `🔒 Za generiranje izvještaja prijavi se kao <b>trener</b>, <b>kondicijski</b> ili <b>admin</b>.
        Pregled i ispis postojećih izvještaja dostupni su svima.`));
    }
    const kinds = (await API.get("/api/report/kinds")).kinds;
    const kindSel = el("select");
    for (const k of kinds) {
      const o = el("option"); o.value = k.id;
      o.textContent = k.hr;
      kindSel.append(o);
    }
    const descEl = el("div", "muted");
    descEl.style.cssText = "font-size:12px;margin-top:6px;min-height:18px";
    gen.append(el("label", "fld", "Vrsta izvještaja"), kindSel, descEl);

    const paramsBox = el("div");
    paramsBox.style.marginTop = "10px";
    gen.append(paramsBox);

    const go = el("div", "btn", "⚙ Generiraj izvještaj");
    go.style.marginTop = "12px";
    gen.append(go);
    const genErr = el("div", ""); genErr.style.cssText = "color:var(--red);font-size:12px;margin-top:8px;min-height:14px";
    gen.append(genErr);
    grid.append(gen);

    function buildParams() {
      const k = kinds.find(x => x.id === state.kind);
      descEl.textContent = "· " + (k ? k.desc : "");
      paramsBox.innerHTML = "";
      state.athlete = null;
      const needs = k ? k.params : [];
      if (needs.includes("athlete")) {
        const lbl = el("label", "fld", "Sportaš");
        const picked = el("div", "muted", "— niste odabrali —");
        picked.style.cssText = "font-size:12px;margin:4px 0 6px;color:var(--amber)";
        paramsBox.append(lbl, picked);
        paramsBox.append(athletePicker(a => { state.athlete = a.id; picked.innerHTML = `✅ <b>${esc(a.name)}</b> · ${esc(a.club)}`; picked.style.color = "var(--good)"; }));
      }
      if (needs.includes("club")) {
        const lbl = el("label", "fld", "Klub (šifra)");
        const cs = el("select");
        API.get("/api/clubs").then(cl => {
          const pool = cl.filter(c => c.featured).length ? cl.filter(c => c.featured) : cl.slice(0, 40);
          const oAny = el("option"); oAny.value = ""; oAny.textContent = "— svi / cijela baza —";
          cs.append(oAny);
          for (const c of pool) {
            const o = el("option"); o.value = c.code;
            o.textContent = `${c.code} — ${cname(c.country)} · ${sportName(c.sport)} (${c.n})`;
            cs.append(o);
          }
          if (state.club) cs.value = state.club;
        });
        cs.onchange = () => state.club = cs.value;
        paramsBox.append(lbl, cs);
      }
      if (needs.includes("match")) {
        const lbl = el("label", "fld", "Utakmica");
        const ms = el("select");
        API.get("/api/matches").then(mm => {
          for (const m of mm) {
            const o = el("option"); o.value = m.id;
            o.textContent = `${m.id} — ${sportName(m.sport)} · ${m.home} : ${m.away}`;
            ms.append(o);
          }
          ms.value = state.match;
        });
        ms.onchange = () => state.match = ms.value;
        paramsBox.append(lbl, ms);
      }
      if (needs.includes("days")) {
        const lbl = el("label", "fld", "Period");
        const ds = el("select");
        for (const d of [30, 60, 90, 180, 365]) {
          const o = el("option"); o.value = d; o.textContent = d + " dana";
          ds.append(o);
        }
        ds.value = state.days;
        ds.onchange = () => state.days = +ds.value;
        paramsBox.append(lbl, ds);
      }
    }
    kindSel.onchange = () => { state.kind = kindSel.value; buildParams(); };
    buildParams();

    go.onclick = async () => {
      genErr.textContent = "";
      const k = kinds.find(x => x.id === state.kind);
      if (k && k.params.includes("athlete") && !state.athlete) { genErr.textContent = "Odaberi sportaša."; return; }
      if (!staff) { genErr.textContent = "Nemaš ovlasti za generiranje (prijavi se)."; return; }
      go.textContent = "⏳ Generiram…";
      const params = {};
      if (k.params.includes("athlete")) params.athlete = state.athlete;
      if (k.params.includes("club") && state.club) params.club = state.club;
      if (k.params.includes("match")) params.match = state.match;
      if (k.params.includes("days")) params.days = state.days;
      const r = await API.post("/api/reports", { kind: state.kind, params });
      go.textContent = "⚙ Generiraj izvještaj";
      if (r.error) { genErr.textContent = r.error; return; }
      toast("Izvještaj spremljen kao skica — čeka odobrenje");
      openPreview(r.payload, r.id);
      loadList();
    };

    // ================= LISTA =================
    const listCard = el("div", "card");
    listCard.innerHTML = `<h3>📁 Arhiv izvještaja</h3>`;
    const frow = el("div", "ctrl-row");
    const stSel = el("select");
    for (const [v, l] of [["", "svi statusi"], ["skica", "✏️ skica (čeka odobrenje)"], ["odobren", "✅ odobren"], ["odbijen", "✖ odbijen"]]) {
      const o = el("option"); o.value = v; o.textContent = l; stSel.append(o);
    }
    const kdSel = el("select");
    const oAny = el("option"); oAny.value = ""; oAny.textContent = "sve vrste"; kdSel.append(oAny);
    for (const k of kinds) { const o = el("option"); o.value = k.id; o.textContent = k.hr; kdSel.append(o); }
    frow.append(stSel, kdSel);
    listCard.append(frow);
    const listBox = el("div", "scroll-x");
    listCard.append(listBox);
    grid.append(listCard);
    cont.append(grid);

    async function loadList() {
      listBox.innerHTML = "";
      listBox.append(spinner());
      const d = await API.get(`/api/reports?status=${stSel.value}&kind=${kdSel.value}`);
      listBox.innerHTML = "";
      if (!d.items.length) { listBox.append(el("div", "muted", "Nema izvještaja — generiraj prvi gore. 👆")); return; }
      const t = el("table", "tbl");
      t.innerHTML = `<thead><tr><th>Naslov</th><th>Vrsta</th><th>Status</th><th>Autor</th><th>Kreirano</th><th></th></tr></thead>`;
      const tb = el("tbody");
      for (const r of d.items) {
        const tr = el("tr");
        const stBadge = r.status === "odobren" ? '<span class="badge b-gr">✅ ODOBREN</span>'
          : r.status === "odbijen" ? '<span class="badge b-red">✖ ODBIJEN</span>'
          : '<span class="badge b-amber">✏️ SKICA</span>';
        tr.innerHTML = `<td><b>${esc(r.title)}</b>${r.decided_by ? `<div class="faint" style="font-size:10.5px">odobrio/odbio: ${esc(r.decided_by)} ${esc((r.decided_at || "").slice(0, 10))}</div>` : ""}</td>
          <td class="muted">${esc(r.kind)}</td><td>${stBadge}</td>
          <td class="muted">${esc(r.created_by || "")}</td><td class="muted mono">${esc((r.created_at || "").slice(0, 16).replace("T", " "))}</td>`;
        const act = el("td");
        act.style.whiteSpace = "nowrap";
        const bView = el("div", "btn ghost sm", "👁");
        bView.title = "Pregledaj";
        bView.onclick = async () => {
          const full = await API.get(`/api/reports/${r.id}`);
          if (full.payload) openPreview(full.payload, r.id);
        };
        act.append(bView);
        if (approver && r.status === "skica") {
          const bOk = el("div", "btn sm", "✅");
          bOk.title = "Odobri";
          bOk.style.marginLeft = "4px";
          bOk.onclick = async () => { await API.post("/api/reports/status", { id: r.id, status: "odobren" }); toast("Izvještaj odobren ✅"); loadList(); };
          const bNo = el("div", "btn ghost sm", "✖");
          bNo.title = "Odbij";
          bNo.onclick = async () => { await API.post("/api/reports/status", { id: r.id, status: "odbijen" }); toast("Izvještaj odbijen"); loadList(); };
          act.append(bOk, bNo);
        }
        if (staff) {
          const bDel = el("div", "btn ghost sm", "🗑");
          bDel.title = "Briši";
          bDel.style.marginLeft = "4px";
          bDel.onclick = async () => { await API.post("/api/reports/delete", { id: r.id }); toast("Izvještaj obrisan"); loadList(); };
          act.append(bDel);
        }
        tr.append(act);
        tb.append(tr);
      }
      t.append(tb);
      listBox.append(t);
    }
    stSel.onchange = loadList; kdSel.onchange = loadList;
    loadList();

    // ================= PREVIEW (printable) =================
    function openPreview(p, rid) {
      const modal = el("div", "modal-bg");
      const area = el("div", "print-area");
      // zaglavlje
      const head = el("div", "rep-head");
      head.innerHTML = `<div class="rep-brand">📡 <b>SPT</b> · Sports Performance Tracking · produced by GNK ASG</div>
        <h1>${esc(p.title)}</h1>
        <div class="rep-sub">${esc(p.subtitle)}</div>
        <div class="rep-gen">generirano: ${new Date().toLocaleString("hr-HR")}</div>`;
      area.append(head);
      // KPI
      if (p.kpis && p.kpis.length) {
        const kr = el("div", "rep-kpis");
        for (const [l, v] of p.kpis) kr.append(el("div", "rep-kpi", `<div class="v">${esc(String(v))}</div><div class="l">${esc(String(l))}</div>`));
        area.append(kr);
      }
      // sekcije
      for (const s of p.sections || []) {
        const sec = el("div", "rep-sec");
        sec.append(el("h3", "", s.h));
        if (s.chart) {
          const box = el("div", "chartbox");
          const cv = el("canvas", "chart");
          box.append(cv);
          sec.append(box);
          requestAnimationFrame(() => {
            if (s.chart.type === "bar") {
              hbarChart(cv, s.chart.labels.map((l, i) => ({ label: l, value: s.chart.series[0].values[i] })));
            } else {
              lineChart(cv, { labels: s.chart.labels, series: s.chart.series });
            }
          });
        }
        if (s.table && s.table.rows.length) {
          const t = el("table", "tbl rep-tbl");
          t.innerHTML = `<thead><tr>${s.table.cols.map(c => `<th>${esc(String(c))}</th>`).join("")}</tr></thead>`;
          const tb = el("tbody");
          for (const row of s.table.rows) {
            tb.append(el("tr", "", row.map(c => `<td>${esc(String(c))}</td>`).join("")));
          }
          t.append(tb);
          sec.append(t);
        }
        area.append(sec);
      }
      // preporuke
      if (p.recommendations && p.recommendations.length) {
        const rec = el("div", "rep-sec");
        rec.append(el("h3", "", "💡 Preporuke"));
        for (const r of p.recommendations) rec.append(el("div", "rep-rec", "✅ " + esc(r)));
        area.append(rec);
      }
      area.append(el("div", "rep-foot", esc(p.footer || "")));

      // gumbi (ne printaju se)
      const btns = el("div", "no-print rep-btns");
      const bPrint = el("div", "btn", "🖨 Ispiši / spremi kao PDF");
      bPrint.onclick = () => window.print();
      btns.append(bPrint);
      if (approver) {
        const bOk = el("div", "btn", "✅ Odobri");
        bOk.onclick = async () => { await API.post("/api/reports/status", { id: rid, status: "odobren" }); toast("Izvještaj odobren ✅"); modal.remove(); loadList(); };
        const bNo = el("div", "btn ghost", "✖ Odbij");
        bNo.onclick = async () => { await API.post("/api/reports/status", { id: rid, status: "odbijen" }); toast("Izvještaj odbijen"); modal.remove(); loadList(); };
        btns.append(bOk, bNo);
      }
      const bClose = el("div", "btn ghost", "Zatvori");
      bClose.onclick = () => modal.remove();
      btns.append(bClose);

      modal.append(area, btns);
      modal.onclick = e => { if (e.target === modal) modal.remove(); };
      document.body.append(modal);
    }
  }
};
