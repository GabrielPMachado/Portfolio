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

function cleanAtom(a: HTMLElement) {
  a.classList.remove('atom-wait', 'atom-glitch');
  ['clip-path', 'opacity', '--gx', '--gy'].forEach((p) => a.style.removeProperty(p));
}

/** A block is done: every piece of it is shown as it really is. */
function markBuilt(el: HTMLElement, _animate = false) {
  if (el.classList.contains('is-built')) return;
  el.querySelectorAll<HTMLElement>('.atom-wait, .atom-glitch, [style*="clip-path"]').forEach(cleanAtom);
  cleanAtom(el);
  el.classList.remove('is-revealing');
  el.classList.add('is-built');
}

/* ---------- the flock ----------
 * Like the reference reel: a swarm of small cursors builds the page piece by piece, as if a team
 * were laying it out live in a design tool. Each piece of a block (tag, title line, paragraph,
 * button, image) gets its own job:
 *  - a cursor drags a selection box over it, with guides and a live W × H badge;
 *  - titles glitch in (ghost copies that settle), paragraphs are typed line by line behind a caret,
 *    images start as a grey placeholder with a grid that dissolves, small items get a quick red box;
 *  - the rest of the swarm holds guides, checks the badge, and clicks around the work. */
type Kind = 'frame' | 'sweep' | 'bar' | 'guide' | 'measure' | 'type' | 'inspect';
type AtomKind = 'title' | 'text' | 'visual' | 'small';
type Boid = {
  x: number; y: number; vx: number; vy: number; c: string; s: number; seed: number; rot: number;
  kind: Kind; q: number; crew: number; // job in the team, index within that job in its crew, and its crew
  spd: number; gain: number; lag: number; // personality: top speed, reaction, delay
  enterAt: number; ex: number; ey: number; // when it flies in, where it flies out
  hx: number; hy: number; hopUntil: number; insp: boolean; clicked: boolean; clickAt: number; cx: number; cy: number;
};
type Job = {
  seq: number; el: HTMLElement; host: HTMLElement; kind: AtomKind;
  start: number; dur: number; revealed: boolean; built: boolean; lines: number; lh: number;
};
type Live = { j: Job; r: DOMRect; p: number };

const COLORS = ['#1E8BFF', '#5FB0FF', '#FFB224', '#FF4A4A', '#34D399', '#C084FC', '#F472B6'];
const ease = (t: number) => { const x = Math.min(1, Math.max(0, t)); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const band = (t: number, a: number, b: number) => Math.min(1, Math.max(0, (t - a) / (b - a)));
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const BLUE = '#1E8BFF', RED = '#FF4A4A';

/** When each phase happens for each kind of piece: end of the drag, start and end of the reveal. */
const PH: Record<AtomKind, { d: number; r0: number; r1: number }> = {
  title: { d: 0.25, r0: 0.32, r1: 0.8 },
  text: { d: 0.22, r0: 0.3, r1: 0.94 },
  visual: { d: 0.2, r0: 0.6, r1: 0.9 },
  small: { d: 0.35, r0: 0.4, r1: 0.72 },
};

function hasOwnText(el: HTMLElement) {
  return Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent!.trim());
}

/** The pieces of a block, in reading order. */
function atoms(el: HTMLElement): HTMLElement[] {
  if (el.matches('.case-visual, .hero-visual') || !el.children.length || hasOwnText(el)) return [el];
  const out: HTMLElement[] = [];
  for (const k of Array.from(el.children) as HTMLElement[]) {
    if (k.matches('.grid-bg, .sel-box, [aria-hidden="true"]:empty')) continue;
    const lines = k.querySelectorAll<HTMLElement>(':scope > .line, :scope > .dim');
    if (lines.length) { out.push(...lines); continue; }
    if (k.matches('ul, ol, dl, div, header') && k.children.length && !hasOwnText(k)) { out.push(...atoms(k)); continue; }
    out.push(k);
  }
  return out;
}

function kindOf(a: HTMLElement): AtomKind {
  if (a.matches('.case-visual, .hero-visual')) return 'visual';
  if (a.matches('.line, .dim, h1, h2, h3, [data-scramble]')) return 'title';
  if (a.matches('.tag, .chip, .btn, a, .case-k, dt, span') || a.getBoundingClientRect().height < 34) return 'small';
  return 'text';
}

/** The team: every cursor has one job for the whole visit (shares are per 64 cursors). */
function teamFor(n: number): Kind[] {
  const share: [Kind, number][] = [['frame', 10], ['sweep', 8], ['bar', 12], ['guide', 5], ['measure', 3], ['type', 6]];
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
  left = new Map<HTMLElement, number>(); // pieces still to build, per block
  mode: 'off' | 'orbit' | 'build' | 'wait' | 'leave' = 'off';
  modeStart = 0;
  raf = 0;
  w = 0; h = 0; dpr = 1;
  center = { x: 0, y: 0 };
  loader = false;
  crews = 3;
  seq = 0;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.setAttribute('aria-hidden', 'true');
    Object.assign(this.canvas.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '60' });
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;
    this.resize();
    addEventListener('resize', () => this.resize());
    // The flock is split into crews, each a full team. A piece is always built by the same crew.
    const n = innerWidth < 720 ? 36 : 72;
    this.crews = innerWidth < 720 ? 2 : 3;
    const team: [Kind, number, number][] = [];
    for (let c = 0; c < this.crews; c++) {
      const seen: Partial<Record<Kind, number>> = {};
      teamFor(Math.round(n / this.crews)).forEach((kind) => team.push([kind, (seen[kind] = (seen[kind] ?? -1) + 1), c]));
    }
    team.forEach(([kind, q, crew], i) => {
      const b: Boid = {
        x: 0, y: 0, vx: 0, vy: 0, c: COLORS[i % COLORS.length], s: rnd(0.62, 0.9), seed: Math.random() * Math.PI * 2, rot: 0,
        kind, q, crew, spd: rnd(0.85, 1.35), gain: rnd(0.7, 1.35), lag: rnd(0, 0.05),
        enterAt: 0, ex: 0, ey: 0, hx: 0.5, hy: 0.5, hopUntil: 0, insp: false, clicked: true, clickAt: -1e9, cx: 0, cy: 0,
      };
      this.place(b);
      this.boids.push(b);
    });
  }

  addJob(el: HTMLElement, host: HTMLElement, start: number) {
    const kind = kindOf(el);
    const r = el.getBoundingClientRect();
    const lh = parseFloat(getComputedStyle(el).lineHeight) || 24;
    const lines = Math.max(1, Math.min(10, Math.round(r.height / lh)));
    const dur = kind === 'visual' ? 2300 : kind === 'small' ? 900 : kind === 'title' ? 1350 : Math.min(2600, 900 + lines * 300);
    el.classList.add('atom-wait');
    this.jobs.push({ seq: this.seq++, el, host, kind, start, dur, revealed: false, built: false, lines, lh });
    this.left.set(host, (this.left.get(host) ?? 0) + 1);
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
    if (m !== 'orbit') this.loader = false;
    // Arriving: everyone comes in from where they are (off screen), each at its own moment.
    if (was === 'off' && m !== 'off') this.boids.forEach((b) => { b.enterAt = this.modeStart + rnd(0, 700); });
    // Leaving: each cursor picks its own way out, usually the closest edge.
    if (m === 'leave') this.boids.forEach((b) => {
      const near = [b.x, this.w - b.x, b.y, this.h - b.y];
      const edge = Math.random() < 0.65 ? near.indexOf(Math.min(...near)) : (Math.random() * 4) | 0;
      const along = edge < 2 ? b.y / this.h : b.x / this.w;
      [b.ex, b.ey] = this.outside(edge, Math.min(1.1, Math.max(-0.1, along + rnd(-0.25, 0.25))));
    });
    if (m !== 'off' && !this.raf) this.raf = requestAnimationFrame(this.frame);
  }

  finishJob(j: Job) {
    if (j.built) return;
    j.built = true;
    cleanAtom(j.el);
    const n = (this.left.get(j.host) ?? 1) - 1;
    this.left.set(j.host, n);
    if (n <= 0) { this.left.delete(j.host); markBuilt(j.host); runner.done(j.host); }
  }

  stop() {
    this.mode = 'off';
    this.jobs.forEach((j) => this.finishJob(j));
    this.jobs = [];
    this.left.forEach((_, host) => markBuilt(host));
    this.left.clear();
    cancelAnimationFrame(this.raf); this.raf = 0;
    this.ctx.clearRect(0, 0, this.w, this.h);
  }

  /** Reviewer: hops between spots of the piece, pauses and clicks, at its own pace. */
  inspect(b: Boid, r: DOMRect, now: number): [number, number] {
    b.insp = true;
    if (now > b.hopUntil) {
      b.hx = rnd(-0.1, 1.1); b.hy = rnd(-0.2, 1.2);
      b.hopUntil = now + rnd(350, 1000); b.clicked = false;
    }
    return [r.left + r.width * b.hx, r.top + r.height * b.hy];
  }

  caret(L: Live): [number, number] {
    const { r, p, j } = L, ph = PH.text;
    const pos = band(p, ph.r0, ph.r1) * j.lines;
    const k = Math.min(j.lines - 1, Math.floor(pos));
    return [r.left + r.width * (pos - k), r.top + k * j.lh];
  }

  /** Where a cursor should be, given its job in the team and the piece it is working on. */
  targetFor(b: Boid, L: Live, sub: number, now: number, t: number): [number, number] {
    const { r, j } = L;
    const ph = PH[j.kind];
    const p = Math.max(0, L.p);
    const d = ease(band(p, 0, ph.d));
    const wob = Math.sin(t * 2.4 + b.seed);
    switch (b.kind) {
      case 'frame': // drags the selection box out, then holds the corner handle
        if (sub > 0 || p > ph.r1) break;
        if (p < ph.d) return [r.left + r.width * d, r.top + r.height * d];
        return [r.right + 4 + wob * 2, r.bottom + 3];
      case 'sweep': { // does the reveal itself: types, glitches, or wipes the placeholder away
        if (sub > 0 || p > ph.r1 + 0.04 || j.kind === 'small') break;
        if (j.kind === 'text') {
          if (p < ph.r0) return [r.left - 6, r.top + 4];
          const [cx, cy] = this.caret(L);
          return [cx + 3, cy + j.lh * 0.9];
        }
        if (j.kind === 'title') return [r.left + r.width * (0.3 + 0.6 * band(p, ph.r0, ph.r1)) + wob * 6, r.top + r.height * (0.55 + 0.25 * Math.sin(t * 9))];
        return [r.left + r.width * ease(band(p, ph.r0, ph.r1)), r.bottom - 6 + wob * 4];
      }
      case 'bar': { // carries placeholder lines into text, or works the grid of an image
        if (p > ph.r0 + 0.05) break;
        if (j.kind === 'text' && sub < j.lines) {
          const y = r.top + j.lh * (sub + 0.5);
          const bp = band(p, ph.d * 0.6 + sub * 0.025, ph.d + 0.06 + sub * 0.025);
          return [r.left + r.width * (sub === j.lines - 1 ? 0.6 : 0.95) * ease(bp), y + 4];
        }
        if (j.kind === 'visual' && sub < 8) return [r.left + r.width * (0.18 + 0.64 * ((sub * 0.37 + 0.1) % 1)), r.top + r.height * (0.18 + 0.64 * ((sub * 0.61 + 0.3) % 1)) + wob * 3];
        break;
      }
      case 'guide': { // holds the guide lines
        if (p > ph.r1 || j.kind === 'small') break;
        const reach = 24 + 50 * (0.5 + 0.5 * wob);
        if (sub % 3 === 0) return [r.left - reach, r.top + r.height * d];
        if (sub % 3 === 1) return [r.left + r.width * d + reach, r.top];
        return [r.left + r.width * d, r.top - reach * 0.7];
      }
      case 'measure': // checks the size badge while the box grows
        if (p > ph.r0 || j.kind === 'small') break;
        return [r.left + (r.width * d) / 2 + 30 + sub * 14, r.top + r.height * d + 20 + wob * 3];
      case 'type': // stays close to the text while it comes in
        if (p > ph.r1 || j.kind === 'visual') break;
        if (j.kind === 'text' && p > ph.r0) { const [cx, cy] = this.caret(L); return [cx - 18 - sub * 16, cy + j.lh + 6 + wob * 3]; }
        return [r.left + r.width * ((0.15 + 0.3 * sub + 0.08 * Math.floor(t * 3)) % 1), r.top - 12 + wob * 4];
    }
    return this.inspect(b, r, now);
  }

  /** Apply the reveal of a piece to the real element, frame by frame. */
  reveal(L: Live) {
    const { j, p } = L, ph = PH[j.kind], el = j.el;
    if (p >= ph.r0 && !j.revealed) { j.revealed = true; el.classList.remove('atom-wait'); if (j.kind === 'title') el.classList.add('atom-glitch'); }
    if (!j.revealed || j.built) return;
    const v = band(p, ph.r0, ph.r1);
    if (j.kind === 'title') {
      const k = Math.pow(1 - v, 1.6);
      el.style.setProperty('--gx', `${((Math.random() - 0.5) * 16 * k).toFixed(1)}px`);
      el.style.setProperty('--gy', `${(k * rnd(3, 9)).toFixed(1)}px`);
      el.style.opacity = k > 0.5 && Math.random() < 0.25 ? '0.35' : '1';
    } else if (j.kind === 'text') {
      const pos = v * j.lines, k = Math.min(j.lines - 1, Math.floor(pos)), x = ((pos - k) * 100).toFixed(1);
      const y0 = k * j.lh, y1 = y0 + j.lh;
      el.style.clipPath = `polygon(-4px -4px, calc(100% + 4px) -4px, calc(100% + 4px) ${y0}px, ${x}% ${y0}px, ${x}% ${y1}px, -4px ${y1}px)`;
    } else {
      el.style.opacity = String(ease(v));
    }
    if (p >= ph.r1) this.finishJob(j);
  }

  frame = (now: number) => {
    this.raf = 0;
    const { ctx } = this;
    ctx.clearRect(0, 0, this.w, this.h);
    const t = (now - this.modeStart) / 1000;

    const live: Live[] = this.jobs.map((j) => ({ j, r: j.el.getBoundingClientRect(), p: (now - j.start) / j.dur }));
    live.forEach((L) => this.reveal(L));
    // keep jobs added while revealing (the next block starts the moment the current one ends)
    const gone = new Set(live.filter(({ p }) => p >= 1.2).map(({ j }) => j));
    this.jobs = this.jobs.filter((j) => !gone.has(j));
    const shown = live.filter((L) => L.p >= 0 && L.p < 1.2 && L.r.bottom > -40 && L.r.top < this.h + 40);
    // the long red guide on the left margin while anything is being built
    if (shown.some((L) => L.p < 1)) {
      const x = Math.round(Math.min(...shown.map((L) => L.r.left)) - 14);
      ctx.fillStyle = 'rgba(255,74,74,.75)'; ctx.fillRect(x, 0, 1, this.h);
    }
    for (const L of shown) this.drawJob(L, now);
    if (this.loader) this.drawLoader(t);

    // steering: each cursor does its own job on one of the pieces being built
    const active = live.filter((l) => l.p > -0.1 && l.p < 1);
    const review = this.mode === 'wait'
      ? Array.from(document.querySelectorAll<HTMLElement>('[data-build].is-built')).map((el) => el.getBoundingClientRect())
          .filter((rc) => rc.top > 40 && rc.top < this.h - 60 && rc.height > 30)
      : [];
    this.boids.forEach((b, i) => {
      if (now < b.enterAt) return; // still waiting off screen for its turn to come in
      b.insp = false;
      let tx: number, ty: number;
      if (this.mode === 'wait' && review.length) {
        [tx, ty] = this.inspect(b, review[(b.crew * 5 + b.q + i) % review.length], now);
      } else if (this.mode === 'orbit' || this.mode === 'wait' || (this.mode === 'build' && !active.length && live.length)) {
        if (this.mode === 'wait') this.center = { x: this.w / 2, y: this.h - 90 };
        if (this.mode === 'build') {
          const ref = live.find((l) => l.p <= -0.1) ?? live[live.length - 1];
          this.center = { x: ref.r.left + ref.r.width / 2, y: ref.r.top + ref.r.height / 2 };
        }
        this.center = { x: Math.min(this.w - 60, Math.max(60, this.center.x)), y: Math.min(this.h - 60, Math.max(60, this.center.y)) };
        // a tight swirl, like a flock of birds turning around one point
        const a = b.seed + t * (2.2 + b.spd * 0.8);
        const rad = 34 + (i % 9) * 9 + Math.sin(t * 3 + i) * 10;
        [tx, ty] = [this.center.x + Math.cos(a) * rad, this.center.y + Math.sin(a) * rad * 0.8];
      } else if (this.mode === 'build' && active.length) {
        const mine = active.filter((l) => l.j.seq % this.crews === b.crew);
        if (mine.length) {
          const L = mine[b.q % mine.length];
          [tx, ty] = this.targetFor(b, L, Math.floor(b.q / mine.length), now, t);
        } else {
          const near = active.reduce((m, l) => (Math.hypot(l.r.left + l.r.width / 2 - b.x, l.r.top + l.r.height / 2 - b.y) < Math.hypot(m.r.left + m.r.width / 2 - b.x, m.r.top + m.r.height / 2 - b.y) ? l : m));
          [tx, ty] = this.inspect(b, near.r, now);
        }
      } else {
        [tx, ty] = [b.ex, b.ey];
      }
      const dx = tx - b.x, dy = ty - b.y;
      const dist = Math.hypot(dx, dy) || 1;
      const max = (this.mode === 'leave' ? 14 + t * 8 : 18) * b.spd;
      const speed = Math.min(max, dist * 0.16);
      let ax = (dx / dist) * speed - b.vx, ay = (dy / dist) * speed - b.vy;
      for (let o = 0; o < this.boids.length; o += 3) {
        const n = this.boids[(i + o + 1) % this.boids.length];
        const sx = b.x - n.x, sy = b.y - n.y, sd = sx * sx + sy * sy;
        if (sd > 0 && sd < 160) { ax += (sx / sd) * 12; ay += (sy / sd) * 12; }
      }
      const g = 0.24 * b.gain;
      b.vx += ax * g; b.vy += ay * g;
      b.x += b.vx; b.y += b.vy;
      // in flight a cursor turns to point where it's going; when it slows down it rights itself
      const v = Math.hypot(b.vx, b.vy);
      const want = v > 2.2 ? Math.atan2(b.vy, b.vx) + Math.PI * 0.75 : 0;
      let da = want - b.rot;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      b.rot += da * 0.25;
      if (b.insp && !b.clicked && dist < 6) { b.clicked = true; b.clickAt = now; b.cx = b.x; b.cy = b.y; }
      this.drawClick(b, now);
      this.drawCursor(b, v);
    });

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

  drawLoader(t: number) {
    const { ctx } = this, { x, y } = this.center;
    ctx.save();
    ctx.fillStyle = '#1d1f23'; ctx.strokeStyle = '#2e3137'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(x - 17, y - 17, 34, 34, 8); ctx.fill(); ctx.stroke();
    ctx.translate(x, y); ctx.rotate(Math.PI / 4 + t * 2);
    ctx.fillStyle = BLUE; ctx.fillRect(-5, -5, 10, 10);
    ctx.restore();
  }

  drawClick(b: Boid, now: number) {
    const k = (now - b.clickAt) / 380;
    if (k < 0 || k > 1) return;
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = 1 - k;
    ctx.strokeStyle = b.c; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(b.cx, b.cy, 3 + k * 10, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  drawCursor(b: Boid, v: number) {
    const { ctx } = this;
    const shape = () => {
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(0, 13); ctx.lineTo(3.6, 9.6); ctx.lineTo(6.4, 15); ctx.lineTo(8.2, 14.1); ctx.lineTo(5.5, 8.9); ctx.lineTo(10, 8.9);
      ctx.closePath();
    };
    // a short motion trail while flying fast
    if (v > 6) {
      for (let k = 2; k >= 1; k--) {
        ctx.save();
        ctx.globalAlpha = 0.14 * (3 - k);
        ctx.translate(b.x - b.vx * k * 0.6, b.y - b.vy * k * 0.6); ctx.rotate(b.rot); ctx.scale(b.s, b.s);
        shape(); ctx.fillStyle = b.c; ctx.fill();
        ctx.restore();
      }
    }
    ctx.save();
    ctx.translate(b.x, b.y); ctx.rotate(b.rot); ctx.scale(b.s, b.s);
    shape();
    ctx.fillStyle = b.c; ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.stroke();
    ctx.restore();
  }

  drawJob(L: Live, now: number) {
    const { ctx } = this, { r, p, j } = L, ph = PH[j.kind];
    const col = j.kind === 'small' ? RED : BLUE;
    const fade = p > 1 ? 1 - band(p, 1, 1.2) : 1;
    const d = ease(band(p, 0, ph.d));
    const w = r.width * d, h = r.height * d;
    const x0 = Math.round(r.left) + 0.5, y0 = Math.round(r.top) + 0.5;
    ctx.save();
    ctx.globalAlpha = fade;

    // guides follow the box while it is dragged
    const g = band(p, 0, 0.06) * (1 - band(p, ph.r0, ph.r1));
    if (g > 0 && j.kind !== 'small') {
      ctx.globalAlpha = fade * g * 0.55;
      ctx.fillStyle = BLUE;
      ctx.fillRect(0, Math.round(r.top), this.w, 1);
      ctx.fillRect(0, Math.round(r.top + h), this.w, 1);
      ctx.fillStyle = RED;
      ctx.fillRect(Math.round(r.left + w), 0, 1, this.h);
      ctx.globalAlpha = fade;
    }

    if (j.kind === 'visual') {
      // grey placeholder with a layout grid, dissolving as the real thing fades in
      const grey = 1 - band(p, ph.r0, ph.r1);
      ctx.globalAlpha = fade * grey;
      ctx.fillStyle = 'rgba(128,136,148,.5)';
      ctx.fillRect(r.left, r.top, w, h);
      const gp = band(p, ph.d, ph.r0);
      if (gp > 0) {
        ctx.strokeStyle = 'rgba(30,139,255,.8)'; ctx.lineWidth = 1;
        for (let k = 1; k <= 3; k++) {
          const inset = k * 0.11;
          const iw = r.width * (1 - inset * 2) * ease(band(gp, (k - 1) * 0.15, (k - 1) * 0.15 + 0.4));
          ctx.strokeRect(r.left + r.width * inset + 0.5, r.top + r.height * inset + 0.5, iw, r.height * (1 - inset * 2));
        }
        ctx.fillStyle = 'rgba(30,139,255,.75)';
        for (let k = 1; k < 4; k++) {
          ctx.fillRect(r.left + (r.width * k) / 4, r.top, 1, r.height * ease(gp));
          ctx.fillRect(r.left, r.top + (r.height * k) / 4, r.width * ease(gp), 1);
        }
        ctx.font = '500 9px "Geist Mono", ui-monospace, monospace';
        for (let k = 0; k < 6; k++) {
          const bx = r.left + r.width * (0.2 + 0.6 * ((k * 0.37) % 1)), by = r.top + r.height * (0.2 + 0.6 * ((k * 0.61) % 1));
          if (band(gp, k * 0.1, k * 0.1 + 0.2) <= 0) continue;
          ctx.fillStyle = BLUE; ctx.fillRect(bx - 16, by - 6, 32, 12);
          ctx.fillStyle = '#fff'; ctx.fillText(`${(r.width * 0.2 + k * 13) | 0}`, bx - 12, by + 3);
        }
      }
      ctx.globalAlpha = fade;
    } else if (j.kind === 'text' || j.kind === 'title') {
      // grey lines laid in first, typed over (text) or replaced by the glitching title
      const lp = band(p, ph.d * 0.6, ph.r0);
      const pos = j.kind === 'text' ? band(p, ph.r0, ph.r1) * j.lines : (p >= ph.r0 ? j.lines : 0);
      for (let k = 0; k < j.lines; k++) {
        const full = (k === j.lines - 1 && j.lines > 1 ? 0.6 : 0.95) * r.width * ease(band(lp, k * 0.08, k * 0.08 + 0.5));
        const done = Math.min(1, Math.max(0, pos - k));
        const from = r.left + r.width * done;
        const len = r.left + full - from;
        if (len <= 0) continue;
        ctx.fillStyle = j.kind === 'title' ? 'rgba(90,96,108,.8)' : 'rgba(52,56,64,.95)';
        ctx.fillRect(from, r.top + k * j.lh + j.lh * 0.22, len, Math.max(4, j.lh * (j.kind === 'title' ? 0.6 : 0.45)));
      }
      if (j.kind === 'text' && p > ph.r0 && p < ph.r1 && Math.floor(now / 260) % 2 === 0) {
        const [cx, cy] = this.caret(L);
        ctx.fillStyle = BLUE; ctx.fillRect(Math.round(cx), cy + j.lh * 0.12, 2, j.lh * 0.76);
      }
    }

    // the selection box, its handles and the live size badge
    if (d > 0.02) {
      ctx.strokeStyle = col; ctx.lineWidth = 1;
      ctx.strokeRect(x0, y0, Math.round(w), Math.round(h));
      if (j.kind !== 'small') {
        ctx.fillStyle = '#fff';
        const corners: [number, number][] = [[r.left, r.top], [r.left + w, r.top], [r.left, r.top + h], [r.left + w, r.top + h]];
        for (const [hx, hy] of corners) { ctx.fillRect(hx - 3, hy - 3, 6, 6); ctx.strokeRect(hx - 3, hy - 3, 6, 6); }
        const label = `${Math.round(w)} × ${Math.round(h)}`;
        ctx.font = '500 9px "Geist Mono", ui-monospace, monospace';
        const tw = ctx.measureText(label).width + 10;
        const lx = r.left + w / 2 - tw / 2, ly = r.top + h + 6;
        ctx.fillStyle = BLUE; ctx.beginPath(); ctx.roundRect(lx, ly, tw, 14, 3); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.fillText(label, lx + 5, ly + 10);
      }
    }

    // a few + markers next to text being laid out
    const plus = band(p, ph.d, ph.d + 0.1) * (1 - band(p, ph.r1 - 0.1, ph.r1));
    if (plus > 0 && j.kind === 'text') {
      ctx.globalAlpha = fade * plus;
      ctx.fillStyle = '#5FB0FF'; ctx.font = '12px "Geist Mono", monospace';
      for (let i = 0; i < 3; i++) ctx.fillText('+', r.right + 8 + i * 9, r.bottom + 4 - (i % 2) * 6);
    }
    ctx.restore();
  }
}

/* ---------- runner: one block at a time, in page order ---------- */
// The flock never leaves a block half done: a block that enters the screen while another is
// being built waits in line, and starts only when the current one is finished.
const STAGGER = 260; // pause between one block and the next
const PIECE = 110; // between the pieces of one block
const runner = {
  flock: null as Flock | null,
  queue: [] as HTMLElement[],
  current: null as HTMLElement | null,
  busy: false,
  intro: true,
  /** Hand a block to the flock: each of its pieces becomes a job, one shortly after the other. */
  build(f: Flock, el: HTMLElement, start: number) {
    el.classList.add('is-revealing');
    this.current = el;
    atoms(el).forEach((a, i) => f.addJob(a, el, start + i * PIECE));
  },
  push(el: HTMLElement) {
    if (el.classList.contains('is-built') || el.classList.contains('is-revealing') || this.queue.includes(el)) return;
    this.queue.push(el);
    // keep the line in page order, whatever order the blocks came into view
    this.queue.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    if (this.current) return; // the current block finishes first
    const f = this.flock;
    if (this.busy && f && (f.mode === 'build' || f.mode === 'wait' || f.mode === 'leave')) { this.take(f, performance.now() + 120); return; }
    if (!this.busy) setTimeout(() => this.next(), 60);
  },
  /** Next block in line, skipping anything already shown or already scrolled past. */
  pick() {
    while (this.queue.length) {
      const el = this.queue.shift()!;
      if (el.classList.contains('is-built')) continue;
      if (el.getBoundingClientRect().bottom < 0) { markBuilt(el); continue; }
      return el;
    }
    return null;
  },
  take(f: Flock, start: number) {
    const el = this.pick();
    if (!el) return false;
    this.build(f, el, start);
    if (f.mode !== 'build' && f.mode !== 'orbit') f.setMode('build');
    return true;
  },
  /** The flock finished a block: go straight to the next one in line. */
  done(host: HTMLElement) {
    if (host !== this.current) return;
    this.current = null;
    // (not while the flock is being stopped: then the line simply waits for next())
    if (this.flock && this.flock.mode !== 'off' && fxOn()) this.take(this.flock, performance.now() + STAGGER);
  },
  next() {
    if (!fxOn()) return;
    if (this.current) return;
    const f = (this.flock ??= new Flock());
    const delay = this.intro ? 1500 : 150;
    if (!this.take(f, performance.now() + delay)) { this.busy = false; return; }
    this.busy = true;
    if (this.intro) {
      // the opening: an empty page, a small loader, and the flock swirling around it
      this.intro = false;
      f.center = { x: innerWidth / 2, y: innerHeight / 2 };
      f.setMode('orbit');
      f.loader = true;
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
  runner.current = null;
  runner.busy = false;
  runner.flock?.stop();
  root.classList.remove('fx-run');
}

let io: IntersectionObserver | null = null;
function start() {
  if (!fxOn()) { finishAll(); return; }
  io = new IntersectionObserver((entries) => {
    entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      .forEach((e) => {
        io?.unobserve(e.target);
        const el = e.target as HTMLElement;
        runner.push(el);
      });
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
        if (el.getBoundingClientRect().bottom < 0 && !el.classList.contains('is-revealing')) { io?.unobserve(el); markBuilt(el); }
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
