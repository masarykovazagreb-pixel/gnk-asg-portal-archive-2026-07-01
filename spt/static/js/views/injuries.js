// SPT — Ozljede: evidencija, unos, matrica po tijelu, aktivne
"use strict";
VIEWS.injuries = {
  title: "Ozljede",
  sub: "Evidencija ozljeda — ručni unos (trener/liječnik), povijest, matrica po dijelovima tijela, RTP",
  async render(cont) {
    cont.innerHTML = "";
    const ctrl = el("div", "ctrl-row");
    const statusSel = el("select");
    statusSel.innerHTML = `<option value="">sve ozljede</option><option value="aktivna">🔴 aktivne</option><option value="oporavak">🟡 u oporavku</option><option value="oporavljeno">🟢 oporavljene</option>`;
    const clubIn = el("input"); clubIn.type = "search"; clubIn.placeholder = "🗑 Klub (KLB-XXXX)...";
    ctrl.append(statusSel, clubIn);
    const addBtn = el("div", "btn", "➕ Nova ozljeda");
    addBtn.onclick = () => showForm(null);
    ctrl.append(addBtn);
    cont.append(ctrl);

    const grid = el("div", "grid g2"); grid.style.marginTop = "12px";
    const listCard = el("div", "card");
    const matrixCard = el("div", "card");
    matrixCard.innerHTML = `<h3>🫀 Anatomija — ozljede po dijelu tijela</h3>`;
    grid.append(listCard, matrixCard);
    cont.append(grid);

    async function load() {
      const p = new URLSearchParams();
      if (statusSel.value) p.set("status", statusSel.value);
      if (clubIn.value.trim()) p.set("club", clubIn.value.trim().toUpperCase());
      listCard.innerHTML = ""; listCard.append(spinner());
      const d = await API.get("/api/injuries?" + p.toString());
      listCard.innerHTML = `<h3>🏥 Popis ozljeda (${d.items.length})</h3>`;
      // matrica
      const mx = d.matrix || {};
      const parts = [...new Set([...Object.keys(mx), "koljeno", "gležanj", "zadnja loža", "prednja loža", "prepone", "ahil", "leđa", "glava", "natkoljenica", "potkoljenica", "ramena", "ruka"])].slice(0, 12);
      const mxMax = Math.max(1, ...Object.values(mx));
      matrixCard.innerHTML = `<h3>🫀 Ozljede po dijelu tijela (ukupno)</h3>`;
      for (const part of parts) {
        const v = mx[part] || 0;
        const rowEl = el("div", "", `
          <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:3px">
            <span class="muted">${esc(part)}</span><b class="mono">${v}</b></div>
          <div class="progress" style="margin-bottom:8px"><i class="${v > mxMax * 0.66 ? "r" : ""}" style="width:${Math.max(3, v / mxMax * 100)}%"></i></div>`);
        matrixCard.append(rowEl);
      }
      if (!d.items.length) { listCard.append(el("div", "muted", "Nema ozljeda za te filtere.")); return; }
      const t = el("table", "tbl");
      t.innerHTML = `<thead><tr><th>Sportaš</th><th>Ozljeda</th><th>Dio</th><th>Datum</th><th class="num">Dana izvan</th><th>Status</th><th></th></tr></thead>`;
      const tb = el("tbody");
      for (const i of d.items) {
        const tr = el("tr", "click");
        tr.innerHTML = `<td><b>${esc(i.name)}</b><div class="faint" style="font-size:10.5px">${esc(i.club)} · ${esc(sportName(i.sport))}</div></td>
          <td>${esc(i.itype)}</td><td class="muted">${esc(i.body_part)}</td><td>${fmtD(i.idate)}</td>
          <td class="num">${i.days_out}</td>
          <td>${i.status === "aktivna" ? '<span class="badge b-red">AKTIVNA</span>' : i.status === "oporavak" ? '<span class="badge b-amber">OPORAVAK</span>' : '<span class="badge b-gr">OPORAVLJENO</span>'}</td>
          <td></td>`;
        tr.onclick = () => nav("karton", i.athlete);
        if (i.status !== "oporavljeno") {
          const doneBtn = el("div", "btn ghost sm", "✓");
          doneBtn.title = "Označi oporavljenim";
          doneBtn.onclick = async e => {
            e.stopPropagation();
            await API.post("/api/injuries/status", { id: i.id, status: "oporavljeno" });
            toast("Ozljeda označena oporavljenom.");
            load();
          };
          tr.lastElementChild.append(doneBtn);
        }
        tb.append(tr);
      }
      t.append(tb);
      listCard.append(t);
    }

    function showForm() {
      const modal = el("div");
      modal.style.cssText = "position:fixed;inset:0;background:#04070ccc;z-index:70;display:flex;align-items:center;justify-content:center;padding:20px";
      const card = el("div", "card");
      card.style.cssText = "max-width:520px;width:100%;max-height:88vh;overflow-y:auto;background:#0d1522";
      card.innerHTML = `<h3>➕ Nova ozljeda (ručni unos)</h3>`;
      const pick = athletePicker(a => { modal.dataset.aid = a.id; card.querySelector("[data-selname]").innerHTML = `<b>${esc(a.name)}</b> (${esc(sportName(a.sport))} · ${esc(a.club)})`; });
      card.append(pick);
      card.append(el("div", "muted", `<span data-selname>Sportaš nije odabran…</span>`));
      const f1 = el("label", "fld", "Vrsta ozljede");
      const s1 = el("select");
      for (const t2 of ["Mišićna ozljeda (zadnja loža)", "Mišićna ozljeda (prednja loža)", "Uganuće gležnja", "Uganuće koljena (MCL)", "Puknuće ligamenta (ACL)", "Prijelom kosti", "Potres mozga", "Upala Ahilove tetive", "Upala koljena (skakačko)", "Preopterećenje prepona", "Udarac (kontuzija)", "Bol u leđima", "Ostalo"]) s1.append(el("option", "", t2));
      f1.append(s1);
      const f2 = el("label", "fld", "Dio tijela");
      const s2 = el("select");
      for (const p of ["koljeno", "gležanj", "zadnja loža", "prednja loža", "prepone", "ahil", "leđa", "glava", "natkoljenica", "potkoljenica", "ramena", "ruka", "trbuh", "ostalo"]) s2.append(el("option", "", p));
      f2.append(s2);
      const f3 = el("label", "fld", "Procjena dana izvan");
      const i3 = el("input"); i3.type = "number"; i3.value = 14;
      f3.append(i3);
      const f4 = el("label", "fld", "Uzrok");
      const s4 = el("select");
      for (const c of ["utakmica", "trening", "kontakt s igračem", "postepeno preopterećenje", "treniranje bez zagrijavanja", "nepoznato"]) s4.append(el("option", "", c));
      f4.append(s4);
      [f1, f2, f3, f4].forEach((f, i2) => { f.style.marginTop = "12px"; card.append(f); });
      const err = el("div", ""); err.style.cssText = "color:var(--red);font-size:12px;margin-top:8px;min-height:15px";
      const ok = el("div", "btn", "💾 Spremi");
      ok.style.marginTop = "12px";
      ok.onclick = async () => {
        if (!modal.dataset.aid) { err.textContent = "Odaberi sportaša iz gornjeg pretraživača."; return; }
        const r = await API.post("/api/injuries", { athlete: +modal.dataset.aid, itype: s1.value, body_part: s2.value, days_out: +i3.value, cause: s4.value, status: "aktivna" });
        if (r.ok) { modal.remove(); toast("Ozljeda zabilježena."); load(); }
        else err.textContent = r.error || "Greška";
      };
      card.append(err, ok);
      const close = el("div", "btn ghost sm", "Zatvori");
      close.style.cssText = "margin-top:8px;width:100%";
      close.onclick = () => modal.remove();
      card.append(close);
      modal.append(card);
      modal.onclick = e => { if (e.target === modal) modal.remove(); };
      document.body.append(modal);
    }

    statusSel.onchange = load;
    clubIn.addEventListener("input", debounce(load, 300));
    load();
  }
};
