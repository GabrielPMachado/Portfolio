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
  el.classList.add('is-built');
  if (!animate) return;
  const targets = el.matches('[data-scramble]') ? [el] : Array.from(el.querySelectorAll<HTMLElement>('[data-scramble]'));
  targets.forEach((t, i) => setTimeout(() => scramble(t), i * 90));
}

/* ---------- the flock ---------- */
type Boid = { x: number; y: number; vx: number; vy: number; c: string; s: number; seed: number };
type Job = { el: HTMLElement; start: number; dur: number; built: boolean };

const COLORS = ['#1E8BFF', '#1E8BFF', '#FFB224', '#FF4A4A', '#34D399', '#5FB0FF'];
const ease = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
const band = (t: number, a: number, b: number) => Math.min(1, Math.max(0, (t - a) / (b - a)));

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
    const n = innerWidth < 720 ? 30 : 68;
    for (let i = 0; i < n; i++) this.boids.push(this.spawn(i));
  }

  spawn(i: number): Boid {
    const edge = i % 4;
    const x = edge === 0 ? -20 : edge === 1 ? this.w + 20 : Math.random() * this.w;
    const y = edge === 2 ? -20 : edge === 3 ? this.h + 20 : Math.random() * this.h;
    return { x, y, vx: 0, vy: 0, c: COLORS[i % COLORS.length], s: 0.8 + Math.random() * 0.45, seed: Math.random() * Math.PI * 2 };
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
    this.mode = 'off'; this.jobs = [];
    cancelAnimationFrame(this.raf); this.raf = 0;
    this.ctx.clearRect(0, 0, this.w, this.h);
  }

  frame = (now: number) => {
    this.raf = 0;
    const { ctx } = this;
    ctx.clearRect(0, 0, this.w, this.h);
    const t = (now - this.modeStart) / 1000;

    // live jobs and their geometry
    const live = this.jobs.map((j) => ({ j, r: j.el.getBoundingClientRect(), p: (now - j.start) / j.dur }));
    for (const { j, p } of live) {
      if (!j.built && p >= 0.55) { j.built = true; markBuilt(j.el, true); }
    }
    this.jobs = live.filter(({ p }) => p < 1.35).map(({ j }) => j);
    for (const L of live) this.drawJob(L.r, L.p);

    // steering
    const active = live.filter((l) => l.p < 1);
    this.boids.forEach((b, i) => {
      let tx: number, ty: number;
      if (this.mode === 'orbit') {
        const a = b.seed + t * (1.4 + (i % 5) * 0.12) * (i % 2 ? 1 : -1);
        const rad = 70 + (i % 7) * 18 + Math.sin(t * 2 + i) * 14;
        tx = this.center.x + Math.cos(a) * rad; ty = this.center.y + Math.sin(a) * rad * 0.7;
      } else if (this.mode === 'build' && active.length) {
        const { r, p } = active[i % active.length];
        const k = Math.floor(i / active.length);
        const per = 2 * (r.width + r.height);
        let d = ((k * 37) % 100) / 100 * per + ease(p) * per * 0.35;
        d %= per;
        if (d < r.width) { tx = r.left + d; ty = r.top; }
        else if (d < r.width + r.height) { tx = r.right; ty = r.top + d - r.width; }
        else if (d < 2 * r.width + r.height) { tx = r.right - (d - r.width - r.height); ty = r.bottom; }
        else { tx = r.left; ty = r.bottom - (d - 2 * r.width - r.height); }
      } else {
        // leave: fly off in the direction each one is already heading
        const ang = Math.atan2(b.vy || 0.1, b.vx || 0.1);
        tx = b.x + Math.cos(ang) * 600; ty = b.y + Math.sin(ang) * 600 - 200;
      }
      const dx = tx - b.x, dy = ty - b.y;
      const dist = Math.hypot(dx, dy) || 1;
      const max = this.mode === 'leave' ? 16 : 11;
      const speed = Math.min(max, dist * 0.09);
      let ax = (dx / dist) * speed - b.vx, ay = (dy / dist) * speed - b.vy;
      // separation keeps the flock from collapsing into one point
      for (let o = 0; o < this.boids.length; o += 3) {
        const n = this.boids[(i + o + 1) % this.boids.length];
        const sx = b.x - n.x, sy = b.y - n.y, sd = sx * sx + sy * sy;
        if (sd > 0 && sd < 260) { ax += (sx / sd) * 18; ay += (sy / sd) * 18; }
      }
      b.vx += ax * 0.16; b.vy += ay * 0.16;
      b.x += b.vx; b.y += b.vy;
      this.drawCursor(b);
    });

    // lifecycle
    if (this.mode === 'build' && active.length === 0 && this.jobs.length === 0) this.setMode('leave');
    if (this.mode === 'leave' && t > 1.4) {
      this.boids.forEach((b, i) => Object.assign(b, this.spawn(i), { c: b.c }));
      this.stop();
      runner.next();
      return;
    }
    this.raf = requestAnimationFrame(this.frame);
  };

  drawCursor(b: Boid) {
    const { ctx } = this;
    // Real cursors never rotate: they always point up-left, like in a design tool.
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.scale(b.s, b.s);
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(0, 13); ctx.lineTo(3.6, 9.6); ctx.lineTo(6.4, 15); ctx.lineTo(8.2, 14.1); ctx.lineTo(5.5, 8.9); ctx.lineTo(10, 8.9);
    ctx.closePath();
    ctx.fillStyle = b.c; ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.stroke();
    ctx.restore();
  }

  drawJob(r: DOMRect, p: number) {
    const { ctx } = this;
    if (r.bottom < -40 || r.top > this.h + 40) return;
    const fade = p > 1 ? 1 - band(p, 1, 1.35) : 1;
    ctx.save();
    ctx.globalAlpha = fade;
    // grey placeholder that the real content replaces
    const ph = 1 - band(p, 0.45, 0.75);
    if (ph > 0) { ctx.fillStyle = `rgba(46,49,55,${0.55 * ph})`; ctx.fillRect(r.left, r.top, r.width, r.height); }
    // guides
    const g = band(p, 0.05, 0.25) * (1 - band(p, 0.8, 1));
    if (g > 0) {
      ctx.globalAlpha = fade * g * 0.55;
      ctx.fillStyle = '#1E8BFF'; ctx.fillRect(0, r.top, this.w, 1);
      ctx.fillStyle = '#FF4A4A'; ctx.fillRect(r.right, 0, 1, this.h);
      ctx.globalAlpha = fade;
    }
    // traced outline
    const per = 2 * (r.width + r.height);
    const drawn = ease(band(p, 0.05, 0.55)) * per;
    ctx.strokeStyle = '#1E8BFF'; ctx.lineWidth = 1;
    ctx.beginPath();
    const pts: [number, number][] = [[r.left, r.top], [r.right, r.top], [r.right, r.bottom], [r.left, r.bottom], [r.left, r.top]];
    let left = drawn;
    ctx.moveTo(r.left + 0.5, r.top + 0.5);
    for (let i = 1; i < pts.length && left > 0; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
      const seg = Math.hypot(bx - ax, by - ay);
      const f = Math.min(1, left / seg);
      ctx.lineTo(ax + (bx - ax) * f + 0.5, ay + (by - ay) * f + 0.5);
      left -= seg;
    }
    ctx.stroke();
    // handles and measurement
    if (p > 0.5) {
      for (const [hx, hy] of pts.slice(0, 4)) {
        ctx.fillStyle = '#fff'; ctx.fillRect(hx - 3.5, hy - 3.5, 7, 7);
        ctx.strokeRect(hx - 3.5, hy - 3.5, 7, 7);
      }
      const label = `${Math.round(r.width)} × ${Math.round(r.height)}`;
      ctx.font = '500 10px "Geist Mono", ui-monospace, monospace';
      const tw = ctx.measureText(label).width + 12;
      const lx = r.left + r.width / 2 - tw / 2, ly = r.bottom + 8;
      ctx.fillStyle = '#1E8BFF'; ctx.beginPath(); ctx.roundRect(lx, ly, tw, 16, 3); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillText(label, lx + 6, ly + 11.5);
    }
    // row of + markers
    const plus = band(p, 0.25, 0.5) * (1 - band(p, 0.85, 1));
    if (plus > 0) {
      ctx.globalAlpha = fade * plus;
      ctx.fillStyle = '#5FB0FF'; ctx.font = '12px "Geist Mono", monospace';
      const count = Math.min(14, Math.floor(r.width / 16));
      for (let i = 0; i < count; i++) ctx.fillText('+', r.left + i * 16, r.bottom + 40);
    }
    ctx.restore();
  }
}

/* ---------- runner: queue blocks as they enter the screen ---------- */
const runner = {
  flock: null as Flock | null,
  queue: [] as HTMLElement[],
  busy: false,
  intro: true,
  push(el: HTMLElement) {
    if (el.classList.contains('is-built') || this.queue.includes(el)) return;
    const f = this.flock;
    // The flock is already on screen: send part of it to the new block right away.
    if (this.busy && f && (f.mode === 'build' || f.mode === 'leave')) {
      f.jobs.push({ el, start: performance.now() + 120 + (f.jobs.length % 6) * 120, dur: 1150, built: false });
      if (f.mode === 'leave') f.setMode('build');
      return;
    }
    this.queue.push(el);
    if (!this.busy) setTimeout(() => this.next(), 60);
  },
  next() {
    if (!fxOn()) return;
    const batch = this.queue.splice(0, 6).filter((el) => !el.classList.contains('is-built'));
    if (!batch.length) { this.busy = false; return; }
    this.busy = true;
    const f = (this.flock ??= new Flock());
    const now = performance.now();
    const visible = batch.filter((el) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; });
    batch.filter((el) => !visible.includes(el)).forEach((el) => markBuilt(el, false));
    if (!visible.length) { this.next(); return; }
    const delay = this.intro ? 950 : 250;
    visible.forEach((el, i) => f.jobs.push({ el, start: now + delay + i * 140, dur: 1150, built: false }));
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
  const skip = () => { if (runner.flock?.mode === 'orbit') { runner.flock.setMode('build'); runner.flock.jobs.forEach((j) => (j.start = performance.now() - j.dur * 0.6)); } };
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
