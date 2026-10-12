// SPT — grafikoni na canvasu (bez vanjskih biblioteka, radi offline)
"use strict";

function setupCanvas(cv, h) {
  const dpr = window.devicePixelRatio || 1;
  const w = cv.clientWidth || cv.parentElement.clientWidth || 300;
  const height = h || cv.clientHeight || 220;
  cv.width = Math.round(w * dpr);
  cv.height = Math.round(height * dpr);
  const ctx = cv.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h: height };
}

const CHART_COLORS = ["#38d6f5", "#a3e635", "#ff5a5f", "#fbbf24", "#7c8cff", "#f472b6"];

// ---------- RADAR ----------
function radarChart(cv, axes, series) {
  const { ctx, w, h } = setupCanvas(cv);
  const cx = w / 2, cy = h / 2 + 4, R = Math.min(w, h) / 2 - 46;
  const n = axes.length;
  const ang = i => -Math.PI / 2 + i * 2 * Math.PI / n;
  ctx.clearRect(0, 0, w, h);
  // mreža
  for (let ring = 1; ring <= 4; ring++) {
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = ang(i % n), r = R * ring / 4;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.strokeStyle = ring === 4 ? "#27395a" : "#16233a";
    ctx.stroke();
  }
  for (let i = 0; i < n; i++) {
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(ang(i)) * R, cy + Math.sin(ang(i)) * R);
    ctx.strokeStyle = "#16233a"; ctx.stroke();
  }
  // osi — kratki nazivi
  ctx.font = "600 10.5px Segoe UI, sans-serif";
  ctx.fillStyle = "#8ea0b8";
  for (let i = 0; i < n; i++) {
    const a = ang(i);
    const lx = cx + Math.cos(a) * (R + 26), ly = cy + Math.sin(a) * (R + 18);
    const label = axes[i].length > 15 ? axes[i].slice(0, 14) + "…" : axes[i];
    ctx.textAlign = Math.abs(Math.cos(a)) < 0.3 ? "center" : (Math.cos(a) > 0 ? "left" : "right");
    ctx.fillText(label, lx, ly + 3);
  }
  // serije
  for (const s of series) {
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = ang(i % n);
      const v = Math.max(2, Math.min(100, s.values[i % n])) / 100;
      const x = cx + Math.cos(a) * R * v, y = cy + Math.sin(a) * R * v;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = s.color; ctx.lineWidth = 2.2; ctx.stroke();
    ctx.globalAlpha = 0.13; ctx.fillStyle = s.color; ctx.fill(); ctx.globalAlpha = 1;
    for (let i = 0; i < n; i++) {
      const a = ang(i);
      const v = Math.max(2, Math.min(100, s.values[i])) / 100;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * R * v, cy + Math.sin(a) * R * v, 2.6, 0, 7);
      ctx.fillStyle = s.color; ctx.fill();
    }
  }
}

// ---------- VODORAVNE TRAKE ----------
function hbarChart(cv, items, opts = {}) {
  const { ctx, w, h } = setupCanvas(cv);
  ctx.clearRect(0, 0, w, h);
  if (!items.length) { ctx.fillStyle = "#5b6c85"; ctx.font = "13px Segoe UI"; ctx.fillText("Nema podataka", 14, 30); return; }
  const rowH = Math.min(30, (h - 8) / items.length);
  const labelW = Math.min(170, w * 0.34);
  const max = Math.max(...items.map(i => i.value), 0.0001);
  items.forEach((it, i) => {
    const y = 6 + i * rowH;
    ctx.font = "600 12px Segoe UI, sans-serif";
    ctx.fillStyle = "#c9d6e8"; ctx.textAlign = "left";
    const lbl = it.label.length > 24 ? it.label.slice(0, 23) + "…" : it.label;
    ctx.fillText(lbl, 4, y + rowH / 2 + 2, labelW - 10);
    const bx = labelW, bw = w - labelW - 64;
    ctx.fillStyle = "#0a1322";
    roundRect(ctx, bx, y + rowH / 2 - 6, bw, 12, 6); ctx.fill();
    const fw = Math.max(4, bw * it.value / max);
    const grad = ctx.createLinearGradient(bx, 0, bx + fw, 0);
    grad.addColorStop(0, it.color || "#0e7490"); grad.addColorStop(1, it.color2 || "#38d6f5");
    ctx.fillStyle = grad;
    roundRect(ctx, bx, y + rowH / 2 - 6, fw, 12, 6); ctx.fill();
    ctx.fillStyle = "#e8eef8"; ctx.font = "700 12px Segoe UI";
    ctx.textAlign = "left";
    ctx.fillText(opts.fmt ? opts.fmt(it.value) : fmtN(it.value), bx + fw + 8, y + rowH / 2 + 4);
  });
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

// ---------- LINIJSKI (s pojasom) ----------
function lineChart(cv, cfg) {
  // cfg: {labels:[], series:[{name,color,values,lo?,hi?,dash?}], yLabel, xEvery, y2?:{series:[...]}}
  const { ctx, w, h } = setupCanvas(cv);
  ctx.clearRect(0, 0, w, h);
  const padL = 46, padR = cfg.y2 ? 46 : 14, padT = 14, padB = 26;
  const iw = w - padL - padR, ih = h - padT - padB;
  const all = [];
  cfg.series.forEach(s => {
    all.push(...s.values.filter(v => v != null));
    if (s.lo) all.push(...s.lo.filter(v => v != null));
    if (s.hi) all.push(...s.hi.filter(v => v != null));
  });
  if (cfg.y2) cfg.y2.series.forEach(s => all.push(...s.values.filter(v => v != null).map(v => v * cfg.y2.scale)));
  const mn = cfg.yMin !== undefined ? cfg.yMin : (all.length ? Math.min(...all) * 0.92 : 0);
  const mx = cfg.yMax !== undefined ? cfg.yMax : (all.length ? Math.max(...all) * 1.06 : 1);
  const X = i => padL + (cfg.labels.length < 2 ? 0 : i * iw / (cfg.labels.length - 1));
  const Y = v => padT + ih - (v - mn) / (mx - mn || 1) * ih;
  ctx.strokeStyle = "#16233a"; ctx.fillStyle = "#5b6c85"; ctx.font = "10.5px Segoe UI";
  for (let g = 0; g <= 4; g++) {
    const yv = mn + (mx - mn) * g / 4, y = Y(yv);
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke();
    ctx.textAlign = "right"; ctx.fillText(fmtN(yv, Math.abs(mx) < 20 ? 1 : 0), padL - 6, y + 3);
  }
  const every = cfg.xEvery || Math.ceil(cfg.labels.length / 8);
  ctx.textAlign = "center";
  cfg.labels.forEach((l, i) => { if (i % every === 0) ctx.fillText(l, X(i), h - 8); });
  for (const s of cfg.series) {
    if (s.lo && s.hi) {
      ctx.beginPath();
      let started = false;
      s.values.forEach((v, i) => {
        if (v == null) return;
        const y1 = started ? ctx.lineTo(X(i), Y(s.hi[i])) : ctx.moveTo(X(i), Y(s.hi[i]));
        started = true;
      });
      started = false;
      for (let i = s.values.length - 1; i >= 0; i--) {
        if (s.values[i] == null) continue;
        if (!started) { ctx.lineTo(X(i), Y(s.lo[i])); started = true; }
        else ctx.lineTo(X(i), Y(s.lo[i]));
      }
      ctx.closePath();
      ctx.fillStyle = s.color + "22"; ctx.fill();
    }
    ctx.beginPath();
    let pen = false;
    s.values.forEach((v, i) => {
      if (v == null) { pen = false; return; }
      if (!pen) { ctx.moveTo(X(i), Y(v)); pen = true; } else ctx.lineTo(X(i), Y(v));
    });
    ctx.strokeStyle = s.color; ctx.lineWidth = 2.4;
    ctx.setLineDash(s.dash ? [5, 4] : []);
    ctx.stroke(); ctx.setLineDash([]);
    s.values.forEach((v, i) => {
      if (v == null) return;
      if (i === s.values.length - 1 || i === 0) { ctx.beginPath(); ctx.arc(X(i), Y(v), 3, 0, 7); ctx.fillStyle = s.color; ctx.fill(); }
    });
  }
  if (cfg.y2) {
    for (const s of cfg.y2.series) {
      ctx.beginPath();
      s.values.forEach((v, i) => i ? ctx.lineTo(X(i), Y(v * cfg.y2.scale)) : ctx.moveTo(X(i), Y(v * cfg.y2.scale)));
      ctx.strokeStyle = s.color; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
    }
  }
  // legenda
  if (cfg.legend !== false) {
    let lx = padL + 4;
    ctx.font = "700 11px Segoe UI";
    const draw = (name, color) => {
      ctx.fillStyle = color; ctx.fillRect(lx, 2, 10, 10);
      ctx.fillStyle = "#c9d6e8"; ctx.fillText(name, lx + 15, 11);
      lx += ctx.measureText(name).width + 34;
    };
    cfg.series.forEach(s => draw(s.name, s.color));
    if (cfg.y2) cfg.y2.series.forEach(s => draw(s.name, s.color));
  }
}

// ---------- HISTOGRAM ----------
function histogram(cv, buckets, stats) {
  const { ctx, w, h } = setupCanvas(cv);
  ctx.clearRect(0, 0, w, h);
  const padL = 40, padB = 26, padT = 10;
  const iw = w - padL - 10, ih = h - padB - padT;
  const max = Math.max(...buckets.map(b => b.n), 1);
  const bw = iw / buckets.length;
  buckets.forEach((b, i) => {
    const bh = ih * b.n / max;
    const x = padL + i * bw;
    const g = ctx.createLinearGradient(0, padT + ih - bh, 0, padT + ih);
    g.addColorStop(0, "#38d6f5"); g.addColorStop(1, "#0e7490");
    ctx.fillStyle = g;
    roundRect(ctx, x + 1, padT + ih - bh, Math.max(2, bw - 2), bh, 3); ctx.fill();
  });
  ctx.strokeStyle = "#16233a"; ctx.fillStyle = "#5b6c85"; ctx.font = "10.5px Segoe UI";
  for (let g = 0; g <= 3; g++) {
    const y = padT + ih - ih * g / 3;
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - 10, y); ctx.stroke();
    ctx.textAlign = "right"; ctx.fillText(Math.round(max * g / 3), padL - 5, y + 3);
  }
  ctx.textAlign = "center";
  [0, Math.floor(buckets.length / 2), buckets.length - 1].forEach(i => {
    ctx.fillText(fmtN(buckets[i].x0, 0), padL + i * bw + bw / 2, h - 8);
  });
  if (stats) {
    const xr = v => padL + (v - buckets[0].x0) / (buckets[buckets.length - 1].x1 - buckets[0].x0) * iw;
    for (const [v, c, t] of [[stats.p10, "#fbbf24", "P10"], [stats.p50, "#a3e635", "P50"], [stats.p90, "#f87171", "P90"]]) {
      if (v == null) continue;
      const x = xr(v);
      ctx.strokeStyle = c; ctx.setLineDash([4, 3]); ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, padT + ih); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = c; ctx.textAlign = "center"; ctx.font = "700 10px Segoe UI";
      ctx.fillText(t, x, padT - 1);
    }
  }
}

// ---------- SPARKLINE ----------
function sparkline(cv, values, color) {
  const { ctx, w, h } = setupCanvas(cv);
  ctx.clearRect(0, 0, w, h);
  if (!values.length) return;
  const mn = Math.min(...values), mx = Math.max(...values);
  ctx.beginPath();
  values.forEach((v, i) => {
    const x = i * w / Math.max(1, values.length - 1);
    const y = h - 4 - (v - mn) / (mx - mn || 1) * (h - 8);
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  });
  ctx.strokeStyle = color || "#38d6f5"; ctx.lineWidth = 2; ctx.stroke();
}

function legendRow(items) {
  const d = el("div", "pill-row");
  for (const it of items) {
    d.append(el("span", "", `<span style="display:inline-block;width:11px;height:11px;border-radius:3px;background:${it.color};margin-right:7px;vertical-align:-1px"></span>${esc(it.name)}`));
  }
  return d;
}
