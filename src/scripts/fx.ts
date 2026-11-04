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
type Boid = { x: number; y: number; vx: number; vy: number; c: string; s: number; seed: number };
type Job = { el: HTMLElement; start: number; dur: number; revealed: boolean; built: boolean; bars: number[] };

const COLORS = ['#1E8BFF', '#1E8BFF', '#FFB224', '#FF4A4A', '#34D399', '#5FB0FF'];
const ease = (t: number) => { const x = Math.min(1, Math.max(0, t)); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const band = (t: number, a: number, b: number) => Math.min(1, Math.max(0, (t - a) / (b - a)));
const DRAG = [0, 0.26], BARS = [0.22, 0.55], REVEAL = [0.55, 0.88];
const JOB_MS = 2600;

function barsFor(el: HTMLElement) {
  // one placeholder bar per ~30px of height, with widths that look like lines of content
  const n = Math.max(2, Math.min(7, Math.round(el.getBoundingClientRect().height / 34)));
  return Array.from({ length: n }, (_, i) => (i === 0 ? 0.55 : i === n - 1 ? 0.4 : 0.7 + ((i * 37) % 25) / 100));
}

class Flock {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  boids: Boid[] = [];
  jobs: Job[] = [];
  mode: 'off' | 'orbit' | 'build' | 'leave' = 'off';
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
    for (let i = 0; i < n; i++) this.boids.push(this.spawn(i));
  }

  spawn(i: number): Boid {
    const edge = i % 4;
    const x = edge === 0 ? -20 : edge === 1 ? this.w + 20 : Math.random() * this.w;
    const y = edge === 2 ? -20 : edge === 3 ? this.h + 20 : Math.random() * this.h;
    return { x, y, vx: 0, vy: 0, c: COLORS[i % COLORS.length], s: 0.85 + Math.random() * 0.35, seed: Math.random() * Math.PI * 2 };
  }

  resize() {
    this.dpr = Math.min(2, devicePixelRatio || 1);
    this.w = innerWidth; this.h = innerHeight;
    this.canvas.width = this.w * this.dpr; this.canvas.height = this.h * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  setMode(m: Flock['mode']) {
    this.mode = m; this.modeStart = performance.now();
    if (m !== 'off' && !this.raf) this.raf = requestAnimationFrame(this.frame);
  }

  stop() {
    this.mode = 'off';
    this.jobs.forEach((j) => markBuilt(j.el, false));
    this.jobs = [];
    cancelAnimationFrame(this.raf); this.raf = 0;
    this.ctx.clearRect(0, 0, this.w, this.h);
  }

  /** Where a given role should be for a job at progress p. Roles: 0 = lead, 1..n = bar carriers, rest = crowd. */
  targetFor(r: DOMRect, p: number, role: number, bars: number[], i: number, t: number): [number, number] {
    const pad = Math.min(18, r.width * 0.06);
    if (role === 0) {
      if (p < DRAG[1]) { const d = ease(band(p, DRAG[0], DRAG[1])); return [r.left + r.width * d, r.top + r.height * d]; }
      if (p < REVEAL[0]) return [r.right + 6, r.bottom + 4];
      const v = ease(band(p, REVEAL[0], REVEAL[1]));
      return [r.left + r.width * v, r.top + r.height * (0.5 + 0.35 * Math.sin(t * 9))];
    }
    if (role <= bars.length) {
      const k = role - 1;
      const rowH = (r.height - pad * 2) / bars.length;
      const y = r.top + pad + rowH * k + rowH * 0.3;
      const bp = band(p, BARS[0] + k * 0.035, BARS[0] + 0.16 + k * 0.035);
      if (bp <= 0) return [r.left - 30 - k * 12, y - 20];
      return [r.left + pad + (r.width - pad * 2) * bars[k] * ease(bp), y + 6];
    }
    // crowd: hang around the edges of the box, drifting
    const per = 2 * (r.width + r.height);
    let d = (((i * 53) % 100) / 100 * per + t * 60) % per;
    if (d < r.width) return [r.left + d, r.top - 10];
    d -= r.width; if (d < r.height) return [r.right + 10, r.top + d];
    d -= r.height; if (d < r.width) return [r.right - d, r.bottom + 10];
    d -= r.width; return [r.left - 10, r.bottom - d];
  }

  frame = (now: number) => {
    this.raf = 0;
    const { ctx } = this;
    ctx.clearRect(0, 0, this.w, this.h);
    const t = (now - this.modeStart) / 1000;

    const live = this.jobs.map((j) => ({ j, r: j.el.getBoundingClientRect(), p: (now - j.start) / j.dur }));
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

    // steering: every live job gets a lead, its bar carriers and a crowd
    const active = live.filter((l) => l.p > -0.15 && l.p < 1);
    this.boids.forEach((b, i) => {
      let tx: number, ty: number;
      if (this.mode === 'orbit' || (this.mode === 'build' && !active.length && live.length)) {
        const next = live.find((l) => l.p <= -0.15);
        if (this.mode === 'build' && next) this.center = { x: next.r.left + next.r.width / 2, y: next.r.top + next.r.height / 2 };
        const a = b.seed + t * (1.3 + (i % 5) * 0.12) * (i % 2 ? 1 : -1);
        const rad = 60 + (i % 7) * 20 + Math.sin(t * 2 + i) * 14;
        [tx, ty] = [this.center.x + Math.cos(a) * rad, this.center.y + Math.sin(a) * rad * 0.7];
      } else if (this.mode === 'build' && active.length) {
        const L = active[i % active.length];
        const role = Math.floor(i / active.length);
        [tx, ty] = this.targetFor(L.r, Math.max(0, L.p), role, L.j.bars, i, t);
      } else {
        const ang = Math.atan2(b.vy || 0.1, b.vx || 0.1);
        [tx, ty] = [b.x + Math.cos(ang) * 600, b.y + Math.sin(ang) * 600 - 200];
      }
      const dx = tx - b.x, dy = ty - b.y;
      const dist = Math.hypot(dx, dy) || 1;
      const max = this.mode === 'leave' ? 18 : 14;
      const speed = Math.min(max, dist * 0.14);
      let ax = (dx / dist) * speed - b.vx, ay = (dy / dist) * speed - b.vy;
      for (let o = 0; o < this.boids.length; o += 3) {
        const n = this.boids[(i + o + 1) % this.boids.length];
        const sx = b.x - n.x, sy = b.y - n.y, sd = sx * sx + sy * sy;
        if (sd > 0 && sd < 200) { ax += (sx / sd) * 14; ay += (sy / sd) * 14; }
      }
      b.vx += ax * 0.22; b.vy += ay * 0.22;
      b.x += b.vx; b.y += b.vy;
      this.drawCursor(b);
    });

    if (this.mode === 'build' && this.jobs.length === 0) this.setMode('leave');
    if (this.mode === 'leave' && t > 1.2) {
      this.boids.forEach((b, i) => Object.assign(b, this.spawn(i), { c: b.c }));
      this.stop();
      runner.next();
      return;
    }
    this.raf = requestAnimationFrame(this.frame);
  };

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
    f.jobs.push({ el, start, dur: JOB_MS, revealed: false, built: false, bars: barsFor(el) });
  },
  push(el: HTMLElement) {
    if (el.classList.contains('is-built') || this.queue.includes(el) || this.flock?.jobs.some((j) => j.el === el)) return;
    const f = this.flock;
    // The flock is already on screen: queue the new block right after the last one.
    if (this.busy && f && (f.mode === 'build' || f.mode === 'leave')) {
      const last = f.jobs.reduce((m, j) => Math.max(m, j.start), performance.now() - STAGGER);
      // Scrolling fast: don't keep content hidden behind a long line of blocks.
      if (last + STAGGER - performance.now() > 2200) { markBuilt(el, false); return; }
      this.addJob(f, el, Math.max(performance.now() + 150, last + STAGGER));
      if (f.mode === 'leave') f.setMode('build');
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
