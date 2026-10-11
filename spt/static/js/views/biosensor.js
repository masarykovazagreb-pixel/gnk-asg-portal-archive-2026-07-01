// SPT — BioSenzor: analiza glasa (mikrofon), disanja i ritma srca
"use strict";
VIEWS.biosensor = {
  title: "BioSenzor",
  sub: "Glas (stres, umor) · disanje (ritam, pravilnost) · srce (RR intervali, HRV) — crveno ističe anomalije",
  render(cont) {
    cont.innerHTML = "";
    const row = el("div", "grid g3");

    // ---------- GLAS ----------
    const voiceCard = el("div", "card");
    voiceCard.innerHTML = `<h3>🎙️ Analiza glasa (8 sekundi)</h3>
      <p class="muted" style="font-size:12px;line-height:1.6">Reci nešto prirodno u mikrofon (npr. kako se osjećaš danas).
      SPT mjeri ton, drhtanje, tempo i energiju → indeks stresa glasa. Podaci ostaju lokalno.</p>`;
    const mic = el("div", "mic-btn", "🎙️");
    voiceCard.append(mic);
    const vStatus = el("div", "muted", "Klikni mikrofon za početak");
    vStatus.style.cssText = "text-align:center;font-size:12.5px";
    voiceCard.append(vStatus);
    const vResult = el("div", ""); vResult.style.marginTop = "10px";
    voiceCard.append(vResult);
    let recording = false;

    mic.onclick = async () => {
      if (recording) return;
      recording = true;
      mic.classList.add("rec");
      vStatus.textContent = "🔴 Snimam… govori normalno (8 s)";
      try {
        const feats = await recordVoice(8000);
        mic.classList.remove("rec");
        recording = false;
        vStatus.textContent = "Šaljem u analizu…";
        const d = await API.post("/api/voice/analyze", feats);
        vStatus.textContent = "Analiza završena";
        renderVoice(d, feats);
      } catch (e) {
        mic.classList.remove("rec");
        recording = false;
        vStatus.textContent = "Mikrofon nije dostupan ili je odbijen. (" + e + ")";
      }
    };
    function renderVoice(d, feats) {
      const col = d.stress_index > 65 ? "var(--red)" : d.stress_index > 35 ? "var(--amber)" : "var(--good)";
      vResult.innerHTML = `
        <div style="text-align:center;margin-bottom:10px">
          <div style="font-size:34px;font-weight:900;color:${col}">${fmtN(d.stress_index, 0)}<span style="font-size:14px;color:var(--dim)">/100</span></div>
          <div class="muted" style="font-size:12px">indeks stresa glasa — <b>${esc(d.stress_label)}</b></div>
        </div>
        <div class="mini-stat"><span>Osnovni ton</span><b>${fmtN(d.pitch_hz, 0)} Hz</b></div>
        <div class="mini-stat"><span>Tempo govora</span><b>${fmtN(d.speech_tempo, 1)} slog/s</b></div>
        <div class="mini-stat"><span>Disanje</span><b>${d.breathing_rate ? fmtN(d.breathing_rate, 0) + " /min (pravilnost " + fmtN(d.breathing_regularity * 100, 0) + "%)" : "—"}</b></div>
        <div class="mini-stat"><span>Umor u glasu</span><b>${fmtN(d.voice_fatigue, 0)}/100</b></div>
        ${d.flags.map(f => `<div style="margin-top:8px" class="badge b-red">${esc(f)}</div>`).join("")}`;
      // spremi (odabir sportaša)
      const saveRow = el("div", "ctrl-row"); saveRow.style.marginTop = "10px";
      saveRow.append(el("span", "faint", "Spremi u karton:"));
      saveRow.append(athletePicker(async a => {
        const r = await API.post("/api/voice/save", { athlete: a.id, stress: d.stress_index, ...feats, ...d, flags: d.flags });
        if (r.ok) toast("BioSenzor zapis spremljen: " + a.name);
      }));
      vResult.append(saveRow);
    }
    row.append(voiceCard);

    // ---------- SRCE ----------
    const heartCard = el("div", "card");
    heartCard.innerHTML = `<h3>❤️ Ritam srca (RR intervali)</h3>
      <p class="muted" style="font-size:12px;line-height:1.6">Poveži SPT Strap H2 (BLE) ili ručno zalijepi RR intervale (ms, razmaknute zarezom).
      Bez pojasa prikazujemo modelirani referentni niz (označeno kao demo).</p>`;
    const rrInput = el("input"); rrInput.type = "text";
    rrInput.placeholder = "npr. 812, 826, 801, 845, 790…";
    heartCard.append(rrInput);
    const hb = el("div", "btn", "📈 Analiziraj");
    hb.style.marginTop = "10px";
    heartCard.append(hb);
    const demoChk = el("label", "", `<input type="checkbox" checked> koristi demo niz`);
    demoChk.style.cssText = "display:flex;gap:8px;align-items:center;font-size:12px;color:var(--dim);margin-top:8px";
    heartCard.append(demoChk);
    const hResult = el("div", ""); hResult.style.marginTop = "12px";
    heartCard.append(hResult);
    hb.onclick = async () => {
      const rr = rrInput.value.split(/[,\s]+/).map(parseFloat).filter(x => x > 300 && x < 2000);
      const d = await API.post("/api/voice/heart", rr.length >= 5 ? { rr } : { demo: true, seed: Math.floor(Math.random() * 99) });
      const col = d.flags.length ? "var(--amber)" : "var(--good)";
      hResult.innerHTML = `
        <div style="text-align:center;margin-bottom:10px">
          <div style="font-size:34px;font-weight:900;color:${col}">${Math.round(d.hr)}<span style="font-size:14px;color:var(--dim)"> bpm</span></div>
          ${d.demo ? '<div class="badge b-dim">DEMO NIZ (bez pojasa)</div>' : '<div class="badge b-gr">STVARNI PODACI</div>'}
        </div>
        <div class="mini-stat"><span>RMSSD (HRV)</span><b>${d.rmssd ?? "—"} ms</b></div>
        <div class="mini-stat"><span>SDNN</span><b>${d.sdnn ?? "—"} ms</b></div>
        ${d.flags.map(f => `<div style="margin-top:8px" class="badge ${f.includes("liječni") ? "b-red" : "b-amber"}">${esc(f)}</div>`).join("") || '<div style="margin-top:8px" class="badge b-gr">✅ ritam uredan</div>'}`;
      if (d.series) {
        const box = el("div", "chartbox"); box.style.height = "120px";
        const cv = el("canvas", "chart"); box.append(cv);
        hResult.append(box);
        requestAnimationFrame(() => sparkline(cv, d.series, "#ff5a5f"));
      }
    };
    row.append(heartCard);

    // ---------- POVijest ----------
    const histCard = el("div", "card");
    histCard.innerHTML = `<h3>📜 Zadnji zapisi u bazi</h3>`;
    const feed = el("div", "event-feed");
    histCard.append(feed);
    API.get("/api/athletes?size=1").then(async () => {
      // uzmi par zapisa preko kartona prvog featured sportaša? jednostavnije: bez toga
      feed.append(el("div", "muted", "Zapisi se prikazuju u kartonima sportaša (kronologija)."));
    });
    row.append(histCard);

    cont.append(row);
    setTimeout(() => hb.click(), 400); // odmah pokaži demo analizu
  }
};

// ---------- snimanje glasa (Web Audio) ----------
async function recordVoice(ms) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const src = ctx.createMediaStreamSource(stream);
  const proc = ctx.createScriptProcessor(4096, 1, 1);
  const samples = [];
  src.connect(proc);
  proc.connect(ctx.destination);
  await new Promise(res => {
    proc.onaudioprocess = e => {
      samples.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      if (samples.length * 4096 / ctx.sampleRate * 1000 >= ms) res();
    };
    setTimeout(res, ms + 500);
  });
  stream.getTracks().forEach(t => t.stop());
  ctx.close();
  // spoji u jedan niz
  const all = new Float32Array(samples.length * 4096);
  samples.forEach((s, i) => all.set(s, i * 4096));
  const sr = 44100; // aproksimacija
  // ---- obilježja ----
  // RMS
  let sum = 0;
  for (const v of all) sum += v * v;
  const rms = Math.sqrt(sum / all.length);
  // pitch (autokorelacija na središnjem segmentu)
  const seg = all.slice(Math.floor(all.length / 2), Math.floor(all.length / 2) + 8192);
  let bestLag = 0, bestCorr = 0;
  for (let lag = 60; lag < 500; lag++) {
    let c = 0;
    for (let i = 0; i < seg.length - lag; i += 4) c += seg[i] * seg[i + lag];
    if (c > bestCorr) { bestCorr = c; bestLag = lag; }
  }
  const pitch = bestLag ? 44100 / bestLag : 0;
  // varijabilnost pitcha (drhtanje) — std više procjena
  const pitches = [];
  for (let w = 0; w < 6; w++) {
    const s2 = all.slice(w * 8000, w * 8000 + 8192);
    let bl = 0, bc = 0;
    for (let lag = 60; lag < 500; lag++) {
      let c = 0;
      for (let i = 0; i < s2.length - lag; i += 4) c += s2[i] * s2[i + lag];
      if (c > bc) { bc = c; bl = lag; }
    }
    if (bl) pitches.push(44100 / bl);
  }
  const pm = pitches.reduce((a, b) => a + b, 0) / (pitches.length || 1);
  const pitchVar = Math.sqrt(pitches.reduce((a, b) => a + (b - pm) ** 2, 0) / (pitches.length || 1)) / (pm || 1);
  // tempo: broj energetskih skokova (približno slogovi)
  let env = [];
  for (let i = 0; i < all.length; i += 1024) {
    let e = 0;
    for (let j = i; j < Math.min(i + 1024, all.length); j += 8) e += all[j] * all[j];
    env.push(e);
  }
  let jumps = 0;
  for (let i = 1; i < env.length - 1; i++) {
    if (env[i] > env[i - 1] * 1.8 && env[i] > env[i + 1] * 1.4) jumps++;
  }
  const durS = all.length / 44100;
  const tempo = jumps / Math.max(1, durS);
  // disanje: niska frekvencija omotnice (0.1–0.7 Hz) — iz korijena env niza
  const envNorm = env.map(x => Math.sqrt(x));
  const em = envNorm.reduce((a, b) => a + b, 0) / envNorm.length;
  let bestRate = 0, bestAmp = 0, bestReg = 0;
  for (let f = 0.1; f < 0.7; f += 0.02) {
    let re = 0, im = 0;
    for (let i = 0; i < envNorm.length; i++) {
      const ph = 2 * Math.PI * f * (i * 1024 / 44100);
      re += (envNorm[i] - em) * Math.cos(ph);
      im += (envNorm[i] - em) * Math.sin(ph);
    }
    const amp = Math.hypot(re, im) / envNorm.length;
    if (amp > bestAmp) { bestAmp = amp; bestRate = f; }
  }
  // pravilnost: korelacija s idealnom sinusomom na bestRate
  let corr = 0, corrNorm = 0;
  for (let i = 0; i < envNorm.length; i++) {
    const ph = 2 * Math.PI * bestRate * (i * 1024 / 44100);
    corr += (envNorm[i] - em) * Math.sin(ph);
    corrNorm += Math.abs(envNorm[i] - em);
  }
  const reg = Math.max(0, Math.min(1, Math.abs(corr) / (corrNorm || 1) * 2));
  return {
    rms: +rms.toFixed(4), pitch: +pitch.toFixed(1), pitch_var: +pitchVar.toFixed(3),
    tempo: +tempo.toFixed(2), env_rate: +bestRate.toFixed(3), env_reg: +reg.toFixed(2), dur: +durS.toFixed(1)
  };
}
