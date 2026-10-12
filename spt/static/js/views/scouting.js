// SPT 2.5 — Scouting: shortliste kandidata s ocjenama i usporedbom
"use strict";
VIEWS.scouting = {
  title: "Scouting",
  sub: "Shortliste kandidata · ocjene · usporedba s percentilima pozicije",
  async render(cont) {
    cont.innerHTML = "";
    const staff = AUTH.user && ["trener", "kondicijski", "skaut", "admin"].includes(AUTH.user.role);

    // ===== header: nove liste =====
    const bar = el("div", "ctrl-row");
    const inp = el("input"); inp.type = "text"; inp.placeholder = "Ime nove shortliste (npr. Kandidati U17)...";
    const add = el("div", "btn sm", "➕ Nova shortlista");
    add.onclick = async () => {
      if (!inp.value.trim()) { toast("Upiši ime shortliste."); return; }
      const r = await API.post("/api/shortlists", { name: inp.value });
      if (r.ok) { toast("Shortlista stvorena", "ok"); inp.value = ""; load(); }
      else toast(r.error || "Greška", "err");
    };
    bar.append(inp, add);
    cont.append(bar);

    const box = el("div"); box.style.marginTop = "12px";
    cont.append(box);

    async function load() {
      box.innerHTML = ""; box.append(spinner());
      const d = await API.get("/api/shortlists");
      box.innerHTML = "";
      if (!d.items.length) {
        box.append(el("div", "card muted", "Još nema shortlisti. " + (staff ? "Stvori prvu gore ↑" : "Prijavi se kao skaut/trener za stvaranje listi.")));
        return;
      }
      for (const L of d.items) box.append(renderList(L));
    }

    function renderList(L) {
      const card = el("div", "card");
      card.style.marginBottom = "14px";
      card.innerHTML = `<h3>📋 ${esc(L.name)} <span class="badge b-cyan">${L.items.length} kandidata</span>
        <span class="faint" style="font-weight:400;font-size:11px;float:right">autor: ${esc(L.author)} · ${fmtD(L.created)}</span></h3>`;
      if (L.items.length) {
        const t = el("table", "tbl");
        t.innerHTML = `<thead><tr><th>Sportaš</th><th>Sport</th><th>Klub</th><th>Poz.</th><th class="num">god.</th>
          <th>Ocjena</th><th>Bilješka</th><th></th></tr></thead>`;
        const tb = el("tbody");
        for (const it of L.items) {
          const tr = el("tr", "click");
          const stars = "★".repeat(it.rating) + "☆".repeat(5 - it.rating);
          tr.innerHTML = `<td><span class="flag">${flag(it.country)}</span> <b>${esc(it.name)}</b></td>
            <td class="muted">${esc(sportName(it.sport))}</td>
            <td class="mono muted">${esc(it.club || "")}</td><td class="muted">${esc(it.position || "")}</td>
            <td class="num">${it.age}</td>
            <td style="color:var(--amber);letter-spacing:1px">${stars}</td>
            <td class="muted" style="max-width:220px;font-size:12px">${esc(it.note || "")}</td>`;
          tr.onclick = () => nav("karton", it.athlete);
          const act = el("td");
          if (staff) {
            const del = el("div", "btn ghost sm", "✕");
            del.title = "Makni s liste";
            del.onclick = async e => {
              e.stopPropagation();
              await API.post("/api/shortlists/remove", { id: it.id });
              toast("Maknut s liste"); load();
            };
            act.append(del);
          }
          tr.append(act);
          tb.append(tr);
        }
        t.append(tb);
        card.append(t);
      } else {
        card.append(el("div", "muted", "Prazna lista — dodaj kandidate ispod."));
      }
      if (staff) {
        const row = el("div", "ctrl-row"); row.style.cssText = "flex-wrap:wrap;gap:8px;margin-top:10px";
        row.append(el("span", "faint", "➕ Dodaj kandidata:"));
        row.append(athletePicker(async a => {
          const r = await API.post("/api/shortlists/add", { lid: L.id, athlete: a.id, rating: 3, note: "" });
          if (r.ok) { toast(`${a.name} dodan na listu`, "ok"); load(); }
        }));
        const del = el("div", "btn ghost sm", "🗑 Izbriši listu");
        del.onclick = async () => {
          if (!confirm(`Izbrisati shortlistu "${L.name}"?`)) return;
          await API.post("/api/shortlists/delete", { id: L.id });
          toast("Lista izbrisana"); load();
        };
        row.append(del);
        card.append(row);
      }
      return card;
    }
    load();
  }
};
