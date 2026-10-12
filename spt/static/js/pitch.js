// SPT — teren: 2D i 3D prikaz s igračima (točkice), loptom, tragovima i heatmapom
"use strict";

const TEAM_COLORS = [
  { main: "#ff5a5f", dark: "#8f2a2e", rgb: [255, 90, 95], label: "Domaćini" },
  { main: "#4f8cff", dark: "#2a4f96", rgb: [79, 140, 255], label: "Gosti" }
];

class Pitch {
  constructor(canvas, opts = {}) {
    this.cv = canvas;
    this.ctx = canvas.getContext("2d");
    this.L = opts.L || 105; this.W = opts.W || 68;
    this.sport = opts.sport || "nogomet";
    this.mode = opts.mode || "2d";
    this.padding = opts.padding || 26;
    // 3D kamera
    this.cam = { yaw: -0.5, pitch: 0.62, zoom: 1.0 };
    this.showNames = opts.showNames !== false;
    this.dpr = window.devicePixelRatio || 1;
    this.resize();
    if (opts.interactive3d) this.bind3D();
  }
  resize() {
    const rect = this.cv.getBoundingClientRect();
    this.w = Math.max(120, rect.width);
    this.h = Math.max(100, rect.height || rect.width * 0.62);
    this.cv.width = Math.round(this.w * this.dpr);
    this.cv.height = Math.round(this.h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }
  bind3D() {
    let drag = null;
    this.cv.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: e.clientY }; this.cv.setPointerCapture(e.pointerId); });
    this.cv.addEventListener("pointermove", e => {
      if (!drag) return;
      this.cam.yaw += (e.clientX - drag.x) * 0.006;
      this.cam.pitch = Math.max(0.12, Math.min(1.45, this.cam.pitch + (e.clientY - drag.y) * 0.005));
      drag = { x: e.clientX, y: e.clientY };
      if (this.oncam) this.oncam();
    });
    this.cv.addEventListener("pointerup", () => drag = null);
    this.cv.addEventListener("wheel", e => {
      e.preventDefault();
      this.cam.zoom = Math.max(0.45, Math.min(2.6, this.cam.zoom * (e.deltaY < 0 ? 1.09 : 0.92)));
      if (this.oncam) this.oncam();
    }, { passive: false });
  }
  // projekcija točke (svijet u metrima) -> ekran
  project(x, y, z = 0) {
    if (this.mode === "2d") {
      const pad = this.padding;
      const sx = pad + x / this.L * (this.w - 2 * pad);
      const sy = this.h - pad - y / this.W * (this.h - 2 * pad);
      return { x: sx, y: sy, s: 1, d: 0 };
    }
    const cx = this.L / 2, cy = this.W / 2;
    const X = x - cx, Y = y - cy;
    const { yaw, pitch, zoom } = this.cam;
    const xr = Math.cos(yaw) * X + Math.sin(yaw) * Y;
    const yd = -Math.sin(yaw) * X + Math.cos(yaw) * Y;
    const D = Math.max(this.L, this.W) * 1.35 / zoom;
    const depth = yd * Math.cos(pitch) + z * Math.sin(pitch) + D;
    const up = -yd * Math.sin(pitch) + z * Math.cos(pitch);
    const f = (this.mode === "3d" ? 1 : 1) * Math.min(this.w, this.h * 1.6) * 1.15;
    return {
      x: this.w / 2 + f * xr / depth,
      y: this.h * 0.58 - f * up / depth,
      s: D / depth,
      d: depth
    };
  }
  line(x1, y1, x2, y2, color, lw) {
    const a = this.project(x1, y1), b = this.project(x2, y2);
    this.ctx.strokeStyle = color; this.ctx.lineWidth = lw;
    this.ctx.beginPath(); this.ctx.moveTo(a.x, a.y); this.ctx.lineTo(b.x, b.y); this.ctx.stroke();
  }
  poly(pts, color, fill) {
    const ctx = this.ctx;
    ctx.beginPath();
    pts.forEach((p, i) => {
      const q = this.project(p[0], p[1]);
      i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
    });
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (color) { ctx.strokeStyle = color; ctx.stroke(); }
  }
  drawField() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);
    const isBB = this.sport === "kosarka";
    const grass = isBB ? "#2e2417" : "#0f2b1d";
    const grass2 = isBB ? "#332919" : "#123323";
    // podloga (pravokutnik terena)
    this.poly([[0, 0], [this.L, 0], [this.L, this.W], [0, this.W]], null, grass);
    if (this.sport !== "kosarka") {
      // pruge košenja (samo 2D)
      if (this.mode === "2d") {
        const a = this.project(0, 0);
        const b = this.project(this.L, this.W);
        const stripeW = (b.x - a.x) / 12;
        for (let i = 0; i < 12; i += 2) {
          ctx.fillStyle = grass2;
          const p1 = this.project(i * this.L / 12, 0), p2 = this.project((i + 1) * this.L / 12, this.W);
          ctx.fillRect(Math.min(p1.x, p2.x), Math.min(p1.y, p2.y), Math.abs(p2.x - p1.x), Math.abs(p2.y - p1.y));
        }
      }
    }
    const ln = "rgba(255,255,255,0.55)", lnw = this.mode === "3d" ? 1.1 : 1.6;
    if (!isBB) {
      // rub + sredina
      this.poly([[0, 0], [this.L, 0], [this.L, this.W], [0, this.W]], ln);
      this.line(this.L / 2, 0, this.L / 2, this.W, ln, lnw);
      // središnji krug
      this.circle(this.L / 2, this.W / 2, 9.15, ln, lnw);
      this.dot(this.L / 2, this.W / 2, 2.4, "rgba(255,255,255,0.7)");
      // kazneni prostori
      const box = (x0, dir) => {
        this.line(x0, 13.84, x0 + dir * 16.5, 13.84, ln, lnw);
        this.line(x0, this.W - 13.84, x0 + dir * 16.5, this.W - 13.84, ln, lnw);
        this.line(x0 + dir * 16.5, 13.84, x0 + dir * 16.5, this.W - 13.84, ln, lnw);
        // golov prostor
        this.line(x0, 24.84, x0 + dir * 5.5, 24.84, ln, lnw * 0.8);
        this.line(x0, this.W - 24.84, x0 + dir * 5.5, this.W - 24.84, ln, lnw * 0.8);
        this.line(x0 + dir * 5.5, 24.84, x0 + dir * 5.5, this.W - 24.84, ln, lnw * 0.8);
        // kaznena točka + luk
        this.dot(x0 + dir * 11, this.W / 2, 2, "rgba(255,255,255,0.7)");
        this.arc(x0 + dir * 11, this.W / 2, 9.15, dir > 0 ? -0.93 : Math.PI - 0.93, dir > 0 ? 0.93 : Math.PI + 0.93, ln, lnw);
        // gol
        this.line(x0, 30.34, x0 - dir * 1.8, 30.34, "#ffd166", 2.4);
        this.line(x0, this.W - 30.34, x0 - dir * 1.8, this.W - 30.34, "#ffd166", 2.4);
        this.line(x0 - dir * 1.8, 30.34, x0 - dir * 1.8, this.W - 30.34, "#ffd166", 2.4);
      };
      box(0, 1); box(this.L, -1);
      // kutovi
      this.arc(0, 0, 1, 0, Math.PI / 2, ln, lnw * 0.8);
      this.arc(this.L, 0, 1, Math.PI / 2, Math.PI, ln, lnw * 0.8);
      this.arc(this.L, this.W, 1, Math.PI, 1.5 * Math.PI, ln, lnw * 0.8);
      this.arc(0, this.W, 1, 1.5 * Math.PI, 2 * Math.PI, ln, lnw * 0.8);
    } else {
      // košarkaški teren 28×15
      this.poly([[0, 0], [this.L, 0], [this.L, this.W], [0, this.W]], ln);
      this.line(this.L / 2, 0, this.L / 2, this.W, ln, lnw);
      this.circle(this.L / 2, this.W / 2, 1.8, ln, lnw);
      const hoop = (hx, dir) => {
        // reketa (paint) 5.8×4.9
        this.line(hx, this.W / 2 - 2.45, hx + dir * 5.8, this.W / 2 - 2.45, ln, lnw);
        this.line(hx, this.W / 2 + 2.45, hx + dir * 5.8, this.W / 2 + 2.45, ln, lnw);
        this.line(hx + dir * 5.8, this.W / 2 - 2.45, hx + dir * 5.8, this.W / 2 + 2.45, ln, lnw);
        // slobodna linija + polukrug
        this.line(hx + dir * 5.8, this.W / 2 - 1.8, hx + dir * 5.8, this.W / 2 + 1.8, ln, lnw);
        this.arc(hx + dir * 5.8, this.W / 2, 1.8, dir > 0 ? Math.PI / 2 : -Math.PI / 2, dir > 0 ? 1.5 * Math.PI : Math.PI / 2, ln, lnw);
        // koš
        this.dot(hx, this.W / 2, 2.4, "#ffd166");
        // linija za tri pinte (aproksimacija)
        ctx.save(); ctx.setLineDash([4, 4]);
        this.arc(hx, this.W / 2, 6.75, dir > 0 ? -1.35 : Math.PI - 1.35, dir > 0 ? 1.35 : Math.PI + 1.35, ln, lnw);
        ctx.restore();
      };
      hoop(1.575, 1); hoop(this.L - 1.575, -1);
    }
  }
  circle(cx, cy, r, color, lw) {
    const ctx = this.ctx;
    if (this.mode === "2d") {
      const c = this.project(cx, cy);
      const e = this.project(cx + r, cy);
      ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = lw;
      ctx.ellipse(c.x, c.y, Math.abs(e.x - c.x), Math.abs(e.x - c.x) * (this.h - 2 * this.padding) / (this.w - 2 * this.padding) * (this.L / this.W), 0, 0, 7);
      ctx.stroke(); return;
    }
    ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = lw;
    const N = 42;
    for (let i = 0; i <= N; i++) {
      const a = i / N * 2 * Math.PI;
      const p = this.project(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
    }
    ctx.stroke();
  }
  arc(cx, cy, r, a0, a1, color, lw) {
    const ctx = this.ctx;
    ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = lw;
    const N = 24;
    for (let i = 0; i <= N; i++) {
      const a = a0 + (a1 - a0) * i / N;
      const p = this.project(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
    }
    ctx.stroke();
  }
  dot(x, y, r, color) {
    const p = this.project(x, y);
    this.ctx.beginPath();
    this.ctx.arc(p.x, p.y, r * (p.s || 1), 0, 7);
    this.ctx.fillStyle = color; this.ctx.fill();
  }
  // igrač: točkica s brojem
  drawPlayer(x, y, num, team, opts = {}) {
    const ctx = this.ctx;
    const p = this.project(x, y);
    const r = (opts.size || 13) * (p.s || 1);
    const col = opts.color || TEAM_COLORS[team].main;
    if (this.mode === "3d") {
      // sjena
      const sh = this.project(x, y, 0);
      ctx.beginPath(); ctx.ellipse(sh.x, sh.y + 1, r * 0.8, r * 0.32, 0, 0, 7);
      ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fill();
    }
    if (opts.glow) {
      ctx.beginPath(); ctx.arc(p.x, p.y, r + 5, 0, 7);
      ctx.fillStyle = col + "44"; ctx.fill();
    }
    const g = ctx.createRadialGradient(p.x - r * 0.35, p.y - r * 0.4, r * 0.2, p.x, p.y, r);
    g.addColorStop(0, "#ffffffcc"); g.addColorStop(0.25, col); g.addColorStop(1, opts.dark || TEAM_COLORS[team].dark);
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7);
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 1.6; ctx.strokeStyle = opts.gk ? "#ffd166" : (opts.selected ? "#fff" : "rgba(0,0,0,0.45)");
    if (opts.gk || opts.selected) ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = `800 ${Math.max(8, r * 0.95)}px Segoe UI, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(String(num), p.x, p.y + 0.5);
    if (this.showNames && (opts.name || opts.showName)) {
      ctx.font = "700 10px Segoe UI, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillText((opts.name || "").split(" ").pop(), p.x, p.y - r - 7);
    }
    if (opts.speedVec) {
      const v = opts.speedVec;
      if (Math.hypot(v[0], v[1]) > 4) {
        const q = this.project(x + v[0] * 0.7, y + v[1] * 0.7);
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
        ctx.strokeStyle = "rgba(163,230,53,0.75)"; ctx.lineWidth = 2; ctx.stroke();
      }
    }
    return p;
  }
  drawBall(x, y, z) {
    const ctx = this.ctx;
    const p = this.project(x, y, z);
    const r = 6.5 * (p.s || 1);
    if (z > 0.6) {
      const g = this.project(x, y, 0);
      ctx.beginPath(); ctx.ellipse(g.x, g.y, r * 0.8, r * 0.35, 0, 0, 7);
      ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fill();
    }
    const g = ctx.createRadialGradient(p.x - 2, p.y - 2, 1, p.x, p.y, r);
    g.addColorStop(0, "#fff"); g.addColorStop(1, "#e0b93f");
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7);
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.4)"; ctx.lineWidth = 1; ctx.stroke();
  }
  drawTrail(trail, rgb) {
    const ctx = this.ctx;
    for (let i = 0; i < trail.length; i++) {
      const p = this.project(trail[i][0], trail[i][1], trail[i][2] || 0);
      const a = (i + 1) / trail.length * 0.38;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.8 * (p.s || 1), 0, 7);
      ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
      ctx.fill();
    }
  }
  // heatmap — heat: Float32Array središta ćelija (gx×gy), min/max
  drawHeat(heat, gx, gy) {
    if (!heat) return;
    const ctx = this.ctx;
    let mx = 0;
    for (let i = 0; i < heat.length; i++) mx = Math.max(mx, heat[i]);
    if (!mx) return;
    const cellL = this.L / gx, cellW = this.W / gy;
    for (let iy = 0; iy < gy; iy++) {
      for (let ix = 0; ix < gx; ix++) {
        const v = heat[iy * gx + ix] / mx;
        if (v < 0.06) continue;
        const t = Math.min(1, v * 1.5);
        const cxw = (ix + 0.5) * cellL, cyw = (iy + 0.5) * cellW;
        const p = this.project(cxw, cyw);
        const r = Math.max(cellL, cellW) / this.L * (this.w - 2 * this.padding) * 1.4;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, Math.max(6, r));
        // turbo paleta
        const rr = Math.min(255, Math.max(0, 255 * (t < 0.25 ? t * 2 : (t > 0.75 ? 1 : 1))));
        const gg = t < 0.4 ? t / 0.4 * 235 : (t < 0.75 ? 235 : 235 - (t - 0.75) * 4 * 235);
        const bb = t < 0.35 ? 255 - t / 0.35 * 255 * 0.9 : (t > 0.75 ? 40 : 60);
        g.addColorStop(0, `rgba(${Math.round(34 + 210 * t)},${Math.round(200 - 160 * t)},${Math.round(255 - 215 * t)},${0.16 + 0.30 * t})`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(6, r), 0, 7); ctx.fill();
      }
    }
  }
  nearestPlayer(wx, wy, players) {
    let best = null, bd = 1e9;
    for (const p of players) {
      const d = Math.hypot(p.x - wx, p.y - wy);
      if (d < bd) { bd = d; best = p; }
    }
    return bd < 4.5 ? best : null;
  }
  screenToWorld(sx, sy) {
    const pad = this.padding;
    return {
      x: (sx - pad) / (this.w - 2 * pad) * this.L,
      y: (this.h - pad - sy) / (this.h - 2 * pad) * this.W
    };
  }
}
