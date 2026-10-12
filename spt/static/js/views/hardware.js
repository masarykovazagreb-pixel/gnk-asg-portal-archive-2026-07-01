// SPT — Hardverski katalog: grudnjak, čip, sat, sidra, stroj, vaga (product page)
"use strict";
VIEWS.hardware = {
  title: "SPT hardver",
  sub: "Cijela obitelj SPT uređaja — grudnjak (muški/ženski), čip, sat, UWB sidra, rubni stroj, vaga, pojas",
  async render(cont) {
    const products = [
      {
        img: "/static/img/vest_front.png", name: "SPT Vest M1", tag: "Grudnjak za praćenje — muški",
        specs: [["Materijal", "kompresijski poliester + elastin (78/22)"], ["Džep za čip", "gornji dio leđa, T5 kralježak"], ["Veličine", "XS–3XL (EU)"], ["Praćenje", "GPS (vani) + UWB/M2M (dvorana)"], ["Težina", "148 g (M)"]],
        desc: "Anatomski krojen kompresijski grudnjak s neoprenskim džepom među lopaticama. Čip sjeda u 'slijepo gnijezdo' — ništa ne viri, ništa ne smeta pri skokovima, duelima i padovima. Upareni sustav s deals SPT Pod S1."
      },
      {
        img: "/static/img/vest_back.png", name: "SPT Vest W1", tag: "Grudnjak za praćenje — ženski",
        specs: [["Materijal", "kompresijska mreža s jačom potporom"], ["Džep za čip", "gornji dio leđa + opcija bočni"], ["Veličine", "XS–XL (EU)"], ["Praćenje", "GPS + UWB/M2M"], ["Težina", "132 g (M)"]],
        desc: "Ženski kroj s dodatnom potporom i ravnim šavovima bez trenja. Isto 'slijepo gnijezdo' za čip, prilagođen anatomiji; testirano s odbojkašicama, košarkašicama i nogometašicama."
      },
      {
        img: "/static/img/chip_pod.png", name: "SPT Pod S1", tag: "Čip (senzorska kapsula)",
        specs: [["Procesor", "nRF52840 (ARM Cortex-M4F, 64 MHz)"], ["Senzori", "IMU Bosch BNO086 (1000 Hz) + GNSS u-blox M10 (10–18 Hz) + UWB DW1000 (20 Hz)"], ["Baterija", "Li-Po 500 mAh — 8 h aktivnog praćenja"], ["Punjenje", "USB-C / docking 10-puta"], ["Memorija", "8 GB — cijeli dan raw podataka"], ["Težina", "34 g"], ["Otpornost", "IP67 (znoj, kiša, pranje džepa)"]],
        desc: "Srce sustava: čip koji ide u džep grudnjaka. Van koristi GNSS, u dvorani UWB/M2M mesh mrežu, a IMU kuca 1000 Hz za korake, skokove, udarce i doskoke. Na pločici piše SPT."
      },
      {
        img: "/static/img/watch.png", name: "SPT Watch A1", tag: "Amaterski sat (BYOD + trener)",
        specs: [["EKRAN", "AMOLED 1,4\" 454×454, always-on"], ["Senzori", "optički puls (PPG) + akcelerometar + SpO2 + barometar"], ["GNSS", "petosustavni (GPS/Galileo/GLONASS/BeiDou/QZSS)"], ["Baterija", "14 dana / 30 h GNSS"], ["Povezivanje", "BLE 5.3 + Wi-Fi + SPT Mesh"], ["Radnje", "trening, utrka, intervali, oporavak, spavanje"]],
        desc: "Sat za sportaše koji treniraju sami — i za klupske treninge kad nema grudnjaka. Puls, koraci, san, VO2max procjena; sve ide u isti SPT karton kao i podatci iz grudnjaka. Na kućištu i na zaslonu: SPT."
      },
      {
        img: "/static/img/uwb_anchor.png", name: "SPT Anchor A8", tag: "UWB sidro za dvorane",
        specs: [["Tehnologija", "UWB (3,5–6,5 GHz) + BLE"], ["Preciznost", "±10 cm, 20 Hz, latencija <20 ms"], ["Postavljanje", "8–16 komada po dvorani (kuglica)"], ["Napajanje", "PoE ili baterija (72 h)"], ["Kućište", "IP65, −20 do +50 °C"]],
        desc: "Sidra se postave po rubu dvorane i stvaraju M2M mrežu u kojoj svaki čip 'traži' svoju poziciju 20 puta u sekundi. Postavljanje traje 40 minuta; kalibracija automatska."
      },
      {
        img: "/static/img/edge_server.png", name: "SPT Edge One", tag: "Stroj za obradu (rubni poslužitelj)",
        specs: [["CPU", "12 jezgri, 32 GB RAM, NVMe 2 TB"], ["Ulazi", "UWB gateway ×4, GNSS stream, BLE most, video"], ["Obrada", "18 000 poruka/s (22 čipa × 20 Hz + rezerva)"], ["Softver", "SPT Core — live semafor, kartoni, SPT AI"], ["Izlaz", "lokalni klupski monitori + sinkronizacija u SPT Cloud"]],
        desc: "Stroj koji sjedi u strojarnici kluba i sabire sve: pozicije iz sidara, GPS tokove, pulseve, BioSenzor, vagu. Na njemu radi cijela SPT platforma čak i kad internet padne — podaci se sinkroniziraju kad se veza vrati."
      },
      {
        img: "/static/img/smart_scale.png", name: "SPT Scale B1", tag: "Pametna vaga (tjelesni sastav)",
        specs: [["Metoda", "BIA — 8 elektroda, dvo-frekvencijska"], ["Mjeri", "težinu, BMI, masnoću, mišiće, vodu, visceralnu mast, kosti, proteine, BMR, metaboličku dob"], ["Automatika", "prepozna sportaša i upiše u karton"], ["Povezivanje", "Wi-Fi + BLE"]],
        desc: "Sportaš ujutro stati na vagu, a SPT sve upiše u karton: trendovi težine, masnoće i mišića kroz cijelu sezonu. Podržava i uvoz iz Huawei/Xiaomi/Medisana vaga."
      },
      {
        img: "/static/img/strap_hr.png", name: "SPT Strap H2", tag: "Pojas za puls (profesionalni)",
        specs: [["Metoda", "ECG elektrode (zlatni kontakti)"], ["Točnost", "±1 bpm + RR intervali (HRV)"], ["Baterija", "400 h"], ["Povezivanje", "BLE + ANT+ + SPT Mesh"]],
        desc: "Profesionalni prsni pojas koji se nosi ispod grudnjaka za zlatni standard pulsa i HRV-a. Idealan uz SPT Vest tijekom utakmica."
      },
    ];

    cont.innerHTML = "";
    const hero = el("div", "hero-net");
    hero.innerHTML = `<div>
        <div style="font-size:22px;font-weight:900">🎽 SPT — obitelj uređaja</div>
        <div class="muted" style="font-size:13px;margin-top:4px">Jedan ekosustav: grudnjak + čip (van/dvorana) + sat + pojas + vaga + sidra + stroj. Na svakom uređaju stoji <b>SPT</b>.</div>
      </div>
      <div style="text-align:right">
        <div class="big">8 uređaja</div>
        <div class="lbl">KOMPATIBILNO SA 75+ SPORTOVA</div>
      </div>`;
    cont.append(hero);

    const grid = el("div", "grid g3"); grid.style.marginTop = "14px";
    for (const p of products) {
      const card = el("div", "card product-card");
      const img = el("img");
      img.src = p.img; img.alt = p.name; img.loading = "lazy";
      card.append(img);
      card.append(el("div", "pname", p.name));
      card.append(el("div", "badge b-cyan", p.tag));
      card.append(el("div", "pmeta", p.desc));
      const specs = el("div", "");
      for (const [k, v] of p.specs) {
        specs.append(el("div", "spec-row", `<span class="muted">${esc(k)}</span><b>${esc(v)}</b>`));
      }
      card.append(specs);
      grid.append(card);
    }
    cont.append(grid);

    // kako sve ide skupa
    const flow = el("div", "card"); flow.style.marginTop = "14px";
    flow.innerHTML = `<h3>🔄 Kako sustav diše</h3>
      <div class="dev-strip" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">
        ${["🎽 SPT Vest M1/W1", "⚙️ SPT Pod S1 (u džepu)", "📡 12× SPT Anchor A8 (dvorana)", "🛰️ GNSS (van)", "⌚ SPT Watch A1", "❤️ SPT Strap H2", "⚖️ SPT Scale B1", "🖥️ SPT Edge One", "☁️ SPT Cloud + AI"]
          .map(x => `<div class="it">${x}</div>`).join("")}
      </div>
      <p class="muted" style="font-size:12.5px;margin-top:12px;line-height:1.7">
      Tok: <b>SPT Pod S1</b> u grudnjaku šalje pozicije 20×/s → <b>SPT Anchor A8</b> sidra (dvorana) ili GNSS (van) →
      <b>SPT Edge One</b> obrađuje i prikazuje uživo na tabletu trenera → sinkronizacija u <b>SPT Cloud</b> gdje se kartoni,
      analize, usporedbe i SPT AI pokreću. Sportaš kod kuće doda <b>SPT Watch A1</b> i <b>SPT Scale B1</b> — sve završava u istom kartonu.</p>`;
    cont.append(flow);

    // ============ INVENTAR (SPT 2.3) ============
    const invCard = el("div", "card"); invCard.style.marginTop = "14px";
    invCard.innerHTML = `<h3>🎒 Inventar opreme <span class="faint" style="font-weight:400;float:right">tko ima koji uređaj · baterija · firmver</span></h3>`;
    cont.append(invCard);
    try {
      const inv = await API.get("/api/inventory");
      const staff = AUTH.user && ["trener", "kondicijski", "admin"].includes(AUTH.user.role);
      const t = el("table", "tbl");
      t.innerHTML = `<thead><tr><th>Uređaj</th><th>Serijski</th><th>Dodijeljeno</th><th>Status</th><th class="num">Baterija</th><th>Firmver</th>${staff ? "<th></th>" : ""}</tr></thead>`;
      const tb = el("tbody");
      for (const d of inv.items) {
        const tr = el("tr");
        const stCol = d.status === "aktivno" ? "b-gr" : d.status === "servis" ? "b-red" : "b-amber";
        tr.innerHTML = `<td><b>${esc(d.typ)}</b></td><td class="mono muted">${esc(d.serial)}</td>
          <td>${d.aname ? `<span class="link" data-aid="${d.athlete}">${esc(d.aname)}</span> <span class="faint">(${esc(d.club || "")})</span>` : '<span class="faint">— neraspoređeno —</span>'}</td>
          <td><span class="badge ${stCol}">${esc(d.status)}</span></td>
          <td class="num" style="color:${d.battery < 50 ? "var(--amber)" : "var(--good)"}">${Math.round(d.battery)}%</td>
          <td class="mono muted">${esc(d.firmware || "")}</td>`;
        if (staff) {
          const act = el("td");
          const bA = el("div", "btn ghost sm", "🔁");
          bA.title = "Dodijeli sportašu";
          bA.onclick = () => {
            const m = el("div");
            m.style.cssText = "position:fixed;inset:0;background:#04070ccc;z-index:70;display:flex;align-items:center;justify-content:center;padding:20px";
            const c = el("div", "card"); c.style.cssText = "max-width:440px;width:100%;background:#0d1522";
            c.innerHTML = `<h3>Dodijeli ${esc(d.serial)}</h3>`;
            c.append(athletePicker(async a => {
              const r = await API.post("/api/inventory/assign", { id: d.id, athlete: a.id });
              if (r.ok) { toast(`${d.serial} → ${a.name}`, "ok"); m.remove(); VIEWS.hardware.render(cont); }
            }));
            const cl = el("div", "btn ghost sm", "Odustani"); cl.style.cssText = "margin-top:10px;width:100%";
            cl.onclick = () => m.remove();
            c.append(cl); m.append(c);
            m.onclick = e => { if (e.target === m) m.remove(); };
            document.body.append(m);
          };
          act.append(bA);
          tr.append(act);
        }
        tb.append(tr);
      }
      t.append(tb);
      invCard.append(t);
      // dodaj uređaj (samo admin/trener)
      if (staff) {
        const dForm = el("details"); dForm.style.marginTop = "12px";
        dForm.innerHTML = `<summary style="cursor:pointer;font-size:13px;color:var(--accent)">➕ Novi uređaj u inventar</summary>`;
        const fr = el("div", "ctrl-row"); fr.style.cssText = "flex-wrap:wrap;gap:10px;margin-top:10px";
        const sTyp = el("select");
        for (const x of ["SPT Pod S1", "SPT Watch A1", "SPT Strap H2", "SPT Vest M1", "SPT Vest W1", "SPT Scale B1", "SPT Anchor A8", "SPT Edge One"]) {
          const o = el("option"); o.value = x; o.textContent = x; sTyp.append(o);
        }
        const iSer = el("input"); iSer.placeholder = "serijski broj";
        const add = el("div", "btn sm", "💾 Dodaj");
        add.onclick = async () => {
          const r = await API.post("/api/inventory/add", { typ: sTyp.value, serial: iSer.value.trim() });
          if (r.ok) { toast("Uređaj dodan", "ok"); VIEWS.hardware.render(cont); }
          else toast(r.error || "Greška", "err");
        };
        fr.append(sTyp, iSer, add);
        dForm.append(fr);
        invCard.append(dForm);
      }
    } catch (e) {
      invCard.append(el("div", "muted", "Inventar nedostupan."));
    }
  }
};
