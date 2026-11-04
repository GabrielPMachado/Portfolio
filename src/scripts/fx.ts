// Page effects: cursor flock that "assembles" each block, scrambled titles,
// hover selection boxes, the effects toggle, the local clock and the mobile menu.
// Everything here is decorative; the page is complete without it.

declare global {
  interface Window { __fx?: boolean }
}
window.__fx = true;

const root = document.documentElement;
const lang = root.lang.startsWith('en') ? 'en-US' : 'pt-BR';
const reducedMq = window.matchMedia('(prefers-reduced-motion: reduce)');

/* ---------- clock (Brasília time) ---------- */
const clockFmt = new Intl.DateTimeFormat(lang, { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Sao_Paulo' });
function tickClock() {
  const s = clockFmt.format(new Date()) + ' BRT';
  document.querySelectorAll<HTMLElement>('[data-clock]').forEach((el) => { el.textContent = s; });
}
tickClock();
setInterval(tickClock, 15000);

/* ---------- mobile menu ---------- */
const menuBtn = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
const menu = document.getElementById('menu-mobile');
menuBtn?.addEventListener('click', () => {
  const open = menuBtn.getAttribute('aria-expanded') === 'true';
  menuBtn.setAttribute('aria-expanded', String(!open));
  menu?.toggleAttribute('hidden', open);
});
menu?.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => {
  menuBtn?.setAttribute('aria-expanded', 'false');
  menu.setAttribute('hidden', '');
}));

/* ---------- hover selection boxes with real measurements ---------- */
document.querySelectorAll<HTMLElement>('.sel-host').forEach((host) => {
  const label = host.querySelector<HTMLElement>('.sel-box b');
  const update = () => { if (label) label.textContent = `${Math.round(host.offsetWidth)} × ${Math.round(host.offsetHeight)}`; };
  host.addEventListener('mouseenter', update);
  host.addEventListener('focusin', update);
});

/* ---------- text scramble ---------- */
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&/<>=+*';
function scramble(el: HTMLElement, duration = 650) {
  const original = el.dataset.text ?? el.textContent ?? '';
  el.dataset.text = original;
  const start = performance.now();
  const step = (now: number) => {
    const p = Math.min(1, (now - start) / duration);
    const reveal = Math.floor(p * original.length);
    let out = '';
    for (let i = 0; i < original.length; i++) {
      const ch = original[i];
      out += i < reveal || ch === ' ' ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
    }
    el.textContent = out;
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = original;
  };
  requestAnimationFrame(step);
}

function markBuilt(el: HTMLElement, animate: boolean) {
  if (el.classList.contains('is-built')) return;
  el.classList.remove('is-revealing');
  el.style.removeProperty('clip-path');
  el.classList.add('is-built');
  if (!animate) return;
}

function scrambleIn(el: HTMLElement) {
  const targets = el.matches('[data-scramble]') ? [el] : Array.from(el.querySelectorAll<HTMLElement>('[data-scramble]'));
  targets.forEach((t, i) => setTimeout(() => scramble(t, 800), i * 120));
}

/* ---------- the flock ----------
 * Each block is built like someone working live in a design tool:
 *  1. drag:   one cursor drags a selection box from the top-left corner to the bottom-right,
 *             with the measurement label counting up and guides following it;
 *  2. blocks: helper cursors drag grey placeholder bars into the box, one per line;
 *  3. reveal: a cursor sweeps left to right and the real content appears behind it
 *             while the placeholders it passes disappear and the title scrambles in;
 *  4. done:   handles flash, guides fade, the cursors move on to the next block. */
type Kind = 'frame' | 'sweep' | 'bar' | 'guide' | 'measure' | 'type' | 'inspect';
type Boid = {
  x: number; y: number; vx: number; vy: number; c: string; s: number; seed: number;
  kind: Kind; q: number;            // job in the team and index within that job
  spd: number; gain: number; lag: number; // personality: top speed, reaction, delay
  enterAt: number; ex: number; ey: number; // when it flies in, where it flies out
  hx: number; hy: number; hopUntil: number; insp: boolean; clicked: boolean; clickAt: number; cx: number; cy: number;
};
type Job = { el: HTMLElement; title: HTMLElement | null; start: number; dur: number; revealed: boolean; built: boolean; bars: number[] };
type Live = { j: Job; r: DOMRect; p: number; tr: DOMRect | null };

const COLORS = ['#1E8BFF', '#1E8BFF', '#FFB224', '#FF4A4A', '#34D399', '#5FB0FF'];
const ease = (t: number) => { const x = Math.min(1, Math.max(0, t)); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const band = (t: number, a: number, b: number) => Math.min(1, Math.max(0, (t - a) / (b - a)));
const DRAG = [0, 0.26], BARS = [0.22, 0.55], REVEAL = [0.55, 0.88];
const JOB_MS = 2600;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

function barsFor(el: HTMLElement) {
  // one placeholder bar per ~30px of height, with widths that look like lines of content
  const n = Math.max(2, Math.min(7, Math.round(el.getBoundingClientRect().height / 34)));
  return Array.from({ length: n }, (_, i) => (i === 0 ? 0.55 : i === n - 1 ? 0.4 : 0.7 + ((i * 37) % 25) / 100));
}

/** The team: every cursor has one job for the whole visit (shares are per 64 cursors). */
function teamFor(n: number): Kind[] {
  const share: [Kind, number][] = [['frame', 7], ['sweep', 7], ['bar', 16], ['guide', 6], ['measure', 4], ['type', 6]];
  const out: Kind[] = [];
  for (const [k, c] of share) for (let i = 0; i < Math.max(1, Math.round((c * n) / 64)); i++) out.push(k);
  while (out.length < n) out.push('inspect');
  out.length = n;
  for (let i = out.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

class Flock {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  boids: Boid[] = [];
  jobs: Job[] = [];
  mode: 'off' | 'orbit' | 'build' | 'wait' | 'leave' = 'off';
  modeStart = 0;
  raf = 0;
  w = 0; h = 0; dpr = 1;
  center = { x: 0, y: 0 };

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.setAttribute('aria-hidden', 'true');
    Object.assign(this.canvas.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '60' });
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;
    this.resize();
    addEventListener('resize', () => this.resize());
    const n = innerWidth < 720 ? 32 : 64;
    const team = teamFor(n);
    const seen: Partial<Record<Kind, number>> = {};
    team.forEach((kind, i) => {
      const q = (seen[kind] = (seen[kind] ?? -1) + 1);
      const b: Boid = {
        x: 0, y: 0, vx: 0, vy: 0, c: COLORS[i % COLORS.length], s: rnd(0.85, 1.2), seed: Math.random() * Math.PI * 2,
        kind, q, spd: rnd(0.75, 1.3), gain: rnd(0.65, 1.35), lag: rnd(0, 0.05),
        enterAt: 0, ex: 0, ey: 0, hx: 0.5, hy: 0.5, hopUntil: 0, insp: false, clicked: true, clickAt: -1e9, cx: 0, cy: 0,
      };
      this.place(b);
      this.boids.push(b);
    });
  }

  /** A point just outside one screen edge (0 left, 1 right, 2 top, 3 bottom), f along that edge. */
  outside(edge: number, f: number): [number, number] {
    const m = rnd(40, 140);
    if (edge === 0) return [-m, f * this.h];
    if (edge === 1) return [this.w + m, f * this.h];
    if (edge === 2) return [f * this.w, -m];
    return [f * this.w, this.h + m];
  }

  /** Put a cursor somewhere random off screen, ready to fly in. */
  place(b: Boid) {
    [b.x, b.y] = this.outside((Math.random() * 4) | 0, Math.random());
    b.vx = 0; b.vy = 0;
  }

  offscreen(b: Boid) { return b.x < -24 || b.y < -24 || b.x > this.w + 24 || b.y > this.h + 24; }

  resize() {
    this.dpr = Math.min(2, devicePixelRatio || 1);
    this.w = innerWidth; this.h = innerHeight;
    this.canvas.width = this.w * this.dpr; this.canvas.height = this.h * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  setMode(m: Flock['mode']) {
    const was = this.mode;
    this.mode = m; this.modeStart = performance.now();
    // Arriving: everyone comes in from where they are (off screen), each at its own moment.
    if (was === 'off' && m !== 'off') this.boids.forEach((b) => { b.enterAt = this.modeStart + rnd(0, 900); });
    // Leaving: each cursor picks its own way out, usually the closest edge.
    if (m === 'leave') this.boids.forEach((b) => {
      const near = [b.x, this.w - b.x, b.y, this.h - b.y];
      const edge = Math.random() < 0.65 ? near.indexOf(Math.min(...near)) : (Math.random() * 4) | 0;
      const along = edge < 2 ? b.y / this.h : b.x / this.w;
      [b.ex, b.ey] = this.outside(edge, Math.min(1.1, Math.max(-0.1, along + rnd(-0.25, 0.25))));
    });
    if (m !== 'off' && !this.raf) this.raf = requestAnimationFrame(this.frame);
  }

  stop() {
    this.mode = 'off';
    this.jobs.forEach((j) => markBuilt(j.el, false));
    this.jobs = [];
    cancelAnimationFrame(this.raf); this.raf = 0;
    this.ctx.clearRect(0, 0, this.w, this.h);
  }

  /** Reviewer: hops between spots of the block, pauses and clicks, at its own pace. */
  inspect(b: Boid, r: DOMRect, now: number): [number, number] {
    b.insp = true;
    if (now > b.hopUntil) {
      b.hx = rnd(-0.05, 1.05); b.hy = rnd(-0.05, 1.05);
      b.hopUntil = now + rnd(450, 1300); b.clicked = false;
    }
    return [r.left + r.width * b.hx, r.top + r.height * b.hy];
  }

  /** Where a cursor should be, given its job in the team and the block it is working on. */
  targetFor(b: Boid, L: Live, sub: number, now: number, t: number): [number, number] {
    const { r } = L;
    const p = Math.max(0, L.p);
    const pl = Math.max(0, L.p - b.lag);
    const d = ease(band(p, DRAG[0], DRAG[1]));
    const wob = Math.sin(t * 2.2 + b.seed);
    switch (b.kind) {
      case 'frame': // drags the selection box out, then keeps holding the corner handle
        if (sub > 0) break;
        if (p < DRAG[1]) return [r.left + r.width * d, r.top + r.height * d];
        if (p < REVEAL[1]) return [r.right + 5 + wob * 3, r.bottom + 4];
        break;
      case 'sweep': { // waits at the left edge, then sweeps the real content in
        if (sub > 0 || p > REVEAL[1] + 0.05) break;
        if (p < REVEAL[0]) return [r.left - 18, r.top + r.height * 0.5 + wob * 10];
        const v = ease(band(p, REVEAL[0], REVEAL[1]));
        return [r.left + r.width * v, r.top + r.height * (0.5 + 0.32 * Math.sin(t * 8 + b.seed))];
      }
      case 'bar': { // drags one grey placeholder line into the box
        const bars = L.j.bars;
        if (sub >= bars.length || p > REVEAL[0] + 0.1) break;
        const pad = Math.min(18, r.width * 0.06);
        const rowH = (r.height - pad * 2) / bars.length;
        const y = r.top + pad + rowH * sub + rowH * 0.3;
        const bp = band(pl, BARS[0] + sub * 0.035, BARS[0] + 0.16 + sub * 0.035);
        if (bp <= 0) return [r.left - 30 - sub * 12, y - 20];
        return [r.left + pad + (r.width - pad * 2) * bars[sub] * ease(bp), y + 6];
      }
      case 'guide': { // holds the guide lines: blue ones out to the sides, the red one from above
        if (p > 0.9) break;
        const reach = 30 + 70 * (0.5 + 0.5 * wob);
        if (sub % 3 === 0) return [r.left - reach, r.top + r.height * d];
        if (sub % 3 === 1) return [r.left + r.width * d + reach, r.top];
        return [r.left + r.width * d, r.top - reach * 0.7];
      }
      case 'measure': // checks the size label while the box grows
        if (p > REVEAL[0] + 0.15) break;
        return [r.left + (r.width * d) / 2 + 36 + sub * 16, r.top + r.height * d + 22 + wob * 3];
      case 'type': { // clicks along the title while it scrambles in
        if (p > REVEAL[1] + 0.06) break;
        const tr = L.tr ?? new DOMRect(r.left, r.top, r.width, Math.min(56, r.height));
        if (pl < REVEAL[0] - 0.04) return [tr.left + tr.width * ((0.15 + 0.3 * sub) % 1), tr.top - 20 + wob * 4];
        const step = Math.floor(t * (2.5 + b.spd) + b.seed * 3);
        return [tr.left + tr.width * ((step * 0.37 + sub * 0.23 + b.seed) % 1), tr.top + tr.height * 0.6];
      }
    }
    return this.inspect(b, r, now);
  }

  frame = (now: number) => {
    this.raf = 0;
    const { ctx } = this;
    ctx.clearRect(0, 0, this.w, this.h);
    const t = (now - this.modeStart) / 1000;

    const live: Live[] = this.jobs.map((j) => ({ j, r: j.el.getBoundingClientRect(), p: (now - j.start) / j.dur, tr: j.title?.getBoundingClientRect() ?? null }));
    for (const { j, p } of live) {
      if (p >= REVEAL[0] && !j.revealed) { j.revealed = true; j.el.classList.add('is-revealing'); scrambleIn(j.el); }
      if (j.revealed && !j.built) {
        const v = ease(band(p, REVEAL[0], REVEAL[1]));
        j.el.style.clipPath = `inset(-12px ${((1 - v) * 100).toFixed(2)}% -12px -12px)`;
        if (p >= REVEAL[1]) { j.built = true; markBuilt(j.el, false); }
      }
    }
    this.jobs = live.filter(({ p }) => p < 1.25).map(({ j }) => j);
    for (const L of live) this.drawJob(L.r, L.p, L.j.bars);

    // steering: each cursor does its own job on one of the live blocks
    const active = live.filter((l) => l.p > -0.15 && l.p < 1);
    this.boids.forEach((b, i) => {
      if (now < b.enterAt) return; // still waiting off screen for its turn to come in
      b.insp = false;
      let tx: number, ty: number;
      if (this.mode === 'orbit' || this.mode === 'wait' || (this.mode === 'build' && !active.length && live.length)) {
        if (this.mode === 'wait') this.center = { x: this.w / 2, y: this.h * 0.62 };
        const next = live.find((l) => l.p <= -0.15);
        if (this.mode === 'build' && next) this.center = { x: next.r.left + next.r.width / 2, y: next.r.top + next.r.height / 2 };
        const a = b.seed + t * (1.1 + b.spd * 0.4) * (i % 2 ? 1 : -1);
        const rad = 60 + (i % 7) * 20 + Math.sin(t * 2 + i) * 14;
        [tx, ty] = [this.center.x + Math.cos(a) * rad, this.center.y + Math.sin(a) * rad * 0.7];
      } else if (this.mode === 'build' && active.length) {
        const L = active[b.q % active.length];
        [tx, ty] = this.targetFor(b, L, Math.floor(b.q / active.length), now, t);
      } else {
        [tx, ty] = [b.ex, b.ey];
      }
      const dx = tx - b.x, dy = ty - b.y;
      const dist = Math.hypot(dx, dy) || 1;
      const max = (this.mode === 'leave' ? 12 + t * 8 : 14) * b.spd;
      const speed = Math.min(max, dist * 0.14);
      let ax = (dx / dist) * speed - b.vx, ay = (dy / dist) * speed - b.vy;
      for (let o = 0; o < this.boids.length; o += 3) {
        const n = this.boids[(i + o + 1) % this.boids.length];
        const sx = b.x - n.x, sy = b.y - n.y, sd = sx * sx + sy * sy;
        if (sd > 0 && sd < 200) { ax += (sx / sd) * 14; ay += (sy / sd) * 14; }
      }
      const g = 0.22 * b.gain;
      b.vx += ax * g; b.vy += ay * g;
      b.x += b.vx; b.y += b.vy;
      if (b.insp && !b.clicked && dist < 6) { b.clicked = true; b.clickAt = now; b.cx = b.x; b.cy = b.y; }
      this.drawClick(b, now);
      this.drawCursor(b);
    });

    // While the page is touring by itself the flock hangs around for the next block instead of leaving.
    if (this.mode === 'build' && this.jobs.length === 0) this.setMode(touring ? 'wait' : 'leave');
    if (this.mode === 'wait' && !touring) this.setMode('leave');
    // Only stop once every cursor has actually flown off the screen.
    if (this.mode === 'leave' && (this.boids.every((b) => this.offscreen(b)) || t > 8)) {
      this.boids.forEach((b) => this.place(b));
      this.stop();
      runner.next();
      return;
    }
    this.raf = requestAnimationFrame(this.frame);
  };

  drawClick(b: Boid, now: number) {
    const k = (now - b.clickAt) / 380;
    if (k < 0 || k > 1) return;
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = 1 - k;
    ctx.strokeStyle = b.c; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(b.cx, b.cy, 3 + k * 11, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  drawCursor(b: Boid) {
    // Real cursors never rotate: they always point up-left, like in a design tool.
    const { ctx } = this;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.scale(b.s, b.s);
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(0, 13); ctx.lineTo(3.6, 9.6); ctx.lineTo(6.4, 15); ctx.lineTo(8.2, 14.1); ctx.lineTo(5.5, 8.9); ctx.lineTo(10, 8.9);
    ctx.closePath();
    ctx.fillStyle = b.c; ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.stroke();
    ctx.restore();
  }

  drawJob(r: DOMRect, p: number, bars: number[]) {
    const { ctx } = this;
    if (p < 0 || r.bottom < -40 || r.top > this.h + 40) return;
    const fade = p > 1 ? 1 - band(p, 1, 1.25) : 1;
    const d = ease(band(p, DRAG[0], DRAG[1]));
    const w = r.width * d, h = r.height * d;
    const revealX = r.left + r.width * ease(band(p, REVEAL[0], REVEAL[1]));
    ctx.save();
    ctx.globalAlpha = fade;

    // guides follow the box while it is dragged
    const g = band(p, 0, 0.08) * (1 - band(p, 0.9, 1.05));
    if (g > 0) {
      ctx.globalAlpha = fade * g * 0.6;
      ctx.fillStyle = '#1E8BFF';
      ctx.fillRect(0, Math.round(r.top), this.w, 1);
      ctx.fillRect(0, Math.round(r.top + h), this.w, 1);
      ctx.fillStyle = '#FF4A4A';
      ctx.fillRect(Math.round(r.left + w), 0, 1, this.h);
      ctx.globalAlpha = fade;
    }

    // the box being dragged out, with a faint fill
    ctx.fillStyle = 'rgba(30,139,255,0.06)';
    if (p < REVEAL[1]) ctx.fillRect(Math.max(r.left, revealX), r.top, Math.max(0, r.left + w - Math.max(r.left, revealX)), h);
    ctx.strokeStyle = '#1E8BFF'; ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(r.left) + 0.5, Math.round(r.top) + 0.5, Math.round(w), Math.round(h));

    // placeholder bars dragged in by helpers, wiped away by the reveal
    const pad = Math.min(18, r.width * 0.06);
    const rowH = (r.height - pad * 2) / bars.length;
    bars.forEach((bw, k) => {
      const bp = ease(band(p, BARS[0] + k * 0.035, BARS[0] + 0.16 + k * 0.035));
      if (bp <= 0) return;
      const x0 = r.left + pad, y0 = r.top + pad + rowH * k + rowH * 0.15;
      const full = (r.width - pad * 2) * bw * bp;
      const from = Math.max(x0, revealX);
      const len = x0 + full - from;
      if (len <= 0) return;
      ctx.fillStyle = k === 0 ? 'rgba(80,86,96,0.85)' : 'rgba(46,49,55,0.9)';
      ctx.fillRect(from, y0, len, Math.max(6, Math.min(rowH * 0.55, k === 0 ? 26 : 14)));
    });

    // reveal edge
    if (p > REVEAL[0] && p < REVEAL[1]) {
      ctx.fillStyle = '#1E8BFF';
      ctx.fillRect(Math.round(revealX), r.top - 6, 1, r.height + 12);
    }

    // handles + live measurement
    if (d > 0.02) {
      ctx.fillStyle = '#fff';
      const corners: [number, number][] = [[r.left, r.top], [r.left + w, r.top], [r.left, r.top + h], [r.left + w, r.top + h]];
      for (const [hx, hy] of corners) { ctx.fillRect(hx - 3.5, hy - 3.5, 7, 7); ctx.strokeRect(hx - 3.5, hy - 3.5, 7, 7); }
      const label = `${Math.round(w)} × ${Math.round(h)}`;
      ctx.font = '500 10px "Geist Mono", ui-monospace, monospace';
      const tw = ctx.measureText(label).width + 12;
      const lx = r.left + w / 2 - tw / 2, ly = r.top + h + 8;
      ctx.fillStyle = '#1E8BFF'; ctx.beginPath(); ctx.roundRect(lx, ly, tw, 16, 3); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillText(label, lx + 6, ly + 11.5);
    }

    // row of + markers while the bars come in
    const plus = band(p, 0.2, 0.35) * (1 - band(p, 0.75, 0.9));
    if (plus > 0) {
      ctx.globalAlpha = fade * plus;
      ctx.fillStyle = '#5FB0FF'; ctx.font = '12px "Geist Mono", monospace';
      const count = Math.min(16, Math.floor(r.width / 16));
      for (let i = 0; i < count; i++) ctx.fillText('+', r.left + i * 16, r.bottom + 40);
    }
    ctx.restore();
  }
}

/* ---------- runner: queue blocks as they enter the screen ---------- */
const STAGGER = 420;
const runner = {
  flock: null as Flock | null,
  queue: [] as HTMLElement[],
  busy: false,
  intro: true,
  addJob(f: Flock, el: HTMLElement, start: number) {
    f.jobs.push({ el, title: el.matches('[data-scramble]') ? el : el.querySelector<HTMLElement>('[data-scramble]'), start, dur: JOB_MS, revealed: false, built: false, bars: barsFor(el) });
  },
  push(el: HTMLElement) {
    if (el.classList.contains('is-built') || this.queue.includes(el) || this.flock?.jobs.some((j) => j.el === el)) return;
    const f = this.flock;
    // The flock is already on screen: queue the new block right after the last one.
    if (this.busy && f && (f.mode === 'build' || f.mode === 'wait' || f.mode === 'leave')) {
      const last = f.jobs.reduce((m, j) => Math.max(m, j.start), performance.now() - STAGGER);
      // Scrolling fast: don't keep content hidden behind a long line of blocks.
      if (last + STAGGER - performance.now() > 2200) { markBuilt(el, false); return; }
      this.addJob(f, el, Math.max(performance.now() + 150, last + STAGGER));
      if (f.mode === 'leave' || f.mode === 'wait') f.setMode('build');
      return;
    }
    this.queue.push(el);
    if (!this.busy) setTimeout(() => this.next(), 60);
  },
  next() {
    if (!fxOn()) return;
    const batch = this.queue.splice(0).filter((el) => !el.classList.contains('is-built'));
    if (!batch.length) { this.busy = false; return; }
    this.busy = true;
    const f = (this.flock ??= new Flock());
    const now = performance.now();
    const visible = batch.filter((el) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; });
    batch.filter((el) => !visible.includes(el)).forEach((el) => markBuilt(el, false));
    if (!visible.length) { this.next(); return; }
    const delay = this.intro ? 1100 : 200;
    visible.forEach((el, i) => this.addJob(f, el, now + delay + i * STAGGER));
    if (this.intro) {
      this.intro = false;
      const hero = document.querySelector('[data-hero-center]')?.getBoundingClientRect();
      f.center = hero ? { x: hero.left + hero.width / 2, y: hero.top + hero.height / 2 } : { x: innerWidth / 2, y: innerHeight / 2 };
      f.setMode('orbit');
      setTimeout(() => f.mode === 'orbit' && f.setMode('build'), delay);
    } else {
      f.setMode('build');
    }
  },
};

function fxOn() {
  return root.classList.contains('fx-run') && !root.classList.contains('no-fx');
}

function finishAll() {
  document.querySelectorAll<HTMLElement>('[data-build]').forEach((el) => markBuilt(el, false));
  runner.queue = [];
  runner.busy = false;
  runner.flock?.stop();
  root.classList.remove('fx-run');
}

let io: IntersectionObserver | null = null;
function start() {
  if (!fxOn()) { finishAll(); return; }
  io = new IntersectionObserver((entries) => {
    entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      .forEach((e) => { io?.unobserve(e.target); runner.push(e.target as HTMLElement); });
  }, { threshold: 0.2 });
  document.querySelectorAll<HTMLElement>('[data-build]').forEach((el) => io!.observe(el));
  // Skip the opening if the visitor clicks or types: they want the content.
  const skip = () => { if (runner.flock?.mode === 'orbit') runner.flock.setMode('build'); };
  addEventListener('pointerdown', skip, { once: true });
  addEventListener('keydown', skip, { once: true });
  // Each block is built once. Anything the visitor already scrolled past (a jump from the menu,
  // a fast scroll) just appears, so going back up never brings the cursors back.
  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      document.querySelectorAll<HTMLElement>('[data-build]:not(.is-built)').forEach((el) => {
        if (el.getBoundingClientRect().bottom < 0 && !runner.flock?.jobs.some((j) => j.el === el)) { io?.unobserve(el); markBuilt(el, false); }
      });
    });
  }, { passive: true });
  autoScroll();
}

/* ---------- auto tour: if the visitor stays still, the page glides down by itself ----------
 * After a few idle seconds the page starts a slow, continuous scroll. It eases in, slows down while the
 * cursors are building a block and speeds back up after. Any wheel, touch, key or click hands control back
 * (it starts again after another idle spell); it stops for good at the end of the page. */
const IDLE_MS = 4500;
const CRUISE = 120, WORKING = 48; // px per second
let touring = false;
function autoScroll() {
  let last = performance.now();
  let speed = 0, pos = -1, prev = 0, done = false;
  const poke = () => { last = performance.now(); speed = 0; pos = -1; touring = false; };
  ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach((e) => addEventListener(e, poke, { passive: true }));
  const step = (now: number) => {
    if (done) return;
    const dt = Math.min(0.05, (now - prev) / 1000 || 0);
    prev = now;
    if (fxOn() && now - last > IDLE_MS) {
      touring = true;
      const working = runner.flock?.mode === 'build' || runner.flock?.mode === 'orbit';
      const want = working ? WORKING : CRUISE;
      speed += (want - speed) * Math.min(1, dt * 1.5); // ease toward the target speed
      if (pos < 0) pos = scrollY;
      pos += speed * dt;
      const max = document.documentElement.scrollHeight - innerHeight;
      if (pos >= max) { pos = max; done = true; touring = false; }
      scrollTo({ top: pos, behavior: 'instant' });
    }
    requestAnimationFrame(step);
  };
  requestAnimationFrame((t) => { prev = t; requestAnimationFrame(step); });
}

/* ---------- effects toggle ---------- */
const toggle = document.querySelectorAll<HTMLButtonElement>('[data-fx-toggle]');
function paintToggle() {
  const on = !root.classList.contains('no-fx');
  toggle.forEach((b) => {
    b.setAttribute('aria-pressed', String(on));
    const l = b.querySelector('[data-fx-label]');
    if (l) l.textContent = on ? b.dataset.on ?? 'on' : b.dataset.off ?? 'off';
  });
}
toggle.forEach((b) => b.addEventListener('click', () => {
  const turnOn = root.classList.contains('no-fx');
  try { localStorage.setItem('fx', turnOn ? 'on' : 'off'); } catch { /* storage blocked */ }
  root.classList.toggle('no-fx', !turnOn);
  if (!turnOn) finishAll();
  paintToggle();
  document.dispatchEvent(new CustomEvent('fx-change', { detail: { on: turnOn } }));
}));
paintToggle();

reducedMq.addEventListener('change', () => { if (reducedMq.matches) { root.classList.add('no-fx'); finishAll(); paintToggle(); } });

start();

export {};
