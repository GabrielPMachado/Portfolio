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
  clk: number; due: number; was: boolean; // how often this cursor clicks, and when its next click may land
  slot: number; of: number; // its own part of the piece (one cell of a grid), out of how many in its crew
  chief: number; // -1, or which of the two lead builders of the blocks still in line it is
};
type Job = {
  seq: number; el: HTMLElement; host: HTMLElement; kind: AtomKind;
  start: number; dur: number; revealed: boolean; built: boolean; lines: number; lh: number;
  rad: number[]; ln: Box[]; parts: Box[]; fs: number; shell: boolean; col?: string;
  since?: number; // when it started waiting for its cursor
  nb: number; // not before: a piece starts only when its cursor has arrived (start stays Infinity until then)
  pre: number; // how far the helpers already sketched it ahead of its turn (never past the outline)
};
/** A shape measured from the real layout, relative to the piece's top-left. rad < 0 marks a text bar. */
type Box = { x: number; y: number; w: number; h: number; rad: number[]; fill: boolean; text?: boolean; col?: string; media?: boolean };

/** The real corner radii of an element, in px, clamped like the browser does (so 50% gives a circle). */
function radii(el: Element, w: number, h: number): number[] {
  const cs = getComputedStyle(el);
  const one = (v: string) => {
    const [a] = v.split(' ');
    const n = parseFloat(a) || 0;
    return a.endsWith('%') ? (n / 100) * Math.min(w, h) : n;
  };
  const r = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].map(one);
  const k = Math.min(1, w / Math.max(1e-3, r[0] + r[1]), w / Math.max(1e-3, r[3] + r[2]), h / Math.max(1e-3, r[0] + r[3]), h / Math.max(1e-3, r[1] + r[2]));
  return r.map((v) => v * k);
}

/** Every rendered line of text inside an element, measured from the text itself. */
function lineBoxes(el: Element, base: DOMRect): Box[] {
  const range = document.createRange();
  range.selectNodeContents(el);
  const qs = Array.from(range.getClientRects()).filter((q) => q.width > 1 && q.height > 1).sort((a, b) => a.top - b.top || a.left - b.left);
  const out: Box[] = [];
  for (const q of qs) {
    const x = q.left - base.left, y = q.top - base.top;
    const last = out[out.length - 1];
    if (last && Math.abs(last.y + last.h / 2 - (y + q.height / 2)) < Math.min(last.h, q.height) * 0.5) {
      const right = Math.max(last.x + last.w, x + q.width);
      last.x = Math.min(last.x, x); last.w = right - last.x;
      const bottom = Math.max(last.y + last.h, y + q.height);
      last.y = Math.min(last.y, y); last.h = bottom - last.y;
    } else out.push({ x, y, w: q.width, h: q.height, rad: [0, 0, 0, 0], fill: true, text: true });
  }
  return out;
}

const clear = (c: string) => c === 'transparent' || /rgba\([^)]*,\s*0\)$/.test(c);
/** Does this element paint a shape of its own (fill, border, image)? */
function paints(el: Element) {
  const cs = getComputedStyle(el);
  const fill = !clear(cs.backgroundColor) || cs.backgroundImage !== 'none';
  const line = parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none' && !clear(cs.borderTopColor);
  const media = /^(img|canvas|svg|video)$/i.test(el.tagName);
  return { fill: fill || media, line, media, col: clear(cs.backgroundColor) ? undefined : cs.backgroundColor };
}

/** The real layout inside an image or demo: each painted box and each line of text, as it will end up. */
function partsOf(el: HTMLElement, base: DOMRect): Box[] {
  const out: Box[] = [];
  const walk = (n: Element, depth: number) => {
    for (const c of Array.from(n.children)) {
      if (out.length >= 90) return;
      const cs = getComputedStyle(c);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05) continue;
      const q = c.getBoundingClientRect();
      const inside = q.right > base.left && q.left < base.right && q.bottom > base.top && q.top < base.bottom;
      if (inside && q.width >= 4 && q.height >= 3) {
        const { fill, line, media, col } = paints(c);
        if (fill || line) out.push({ x: q.left - base.left, y: q.top - base.top, w: q.width, h: q.height, rad: radii(c, q.width, q.height), fill: !!col && !media, col, media: /^canvas$/i.test(c.tagName) });
        if (media) continue;
        if (Array.from(c.childNodes).some((t) => t.nodeType === 3 && (t.textContent ?? '').trim())) {
          const range = document.createRange();
          for (const t of Array.from(c.childNodes)) {
            if (t.nodeType !== 3 || !(t.textContent ?? '').trim()) continue;
            range.selectNodeContents(t);
            for (const tq of Array.from(range.getClientRects())) if (tq.width > 1) out.push({ x: tq.left - base.left, y: tq.top - base.top, w: tq.width, h: tq.height, rad: [0, 0, 0, 0], fill: true, text: true });
          }
        }
      }
      if (depth < 7) walk(c, depth + 1);
    }
  };
  walk(el, 0);
  return out;
}

/** Fill or stroke a rounded box with its own corner radii. */
function shape(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rad: number[]) {
  ctx.beginPath();
  if (rad.some((v) => v > 0.5)) ctx.roundRect(x, y, Math.max(0, w), Math.max(0, h), rad.map((v) => Math.max(0, Math.min(v, w / 2, h / 2))));
  else ctx.rect(x, y, Math.max(0, w), Math.max(0, h));
}
type Live = { j: Job; r: DOMRect; p: number };

/** How many cursors build the site. */
const CURSORS = { desktop: 12, mobile: 10 };
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
  lastClick = 0;
  blocks: DOMRect[] = []; // the blocks on screen this frame, where the helpers spread out
  drafts = new Map<HTMLElement, Job[]>(); // sketches of the blocks still in line
  sketching: HTMLElement[] = []; // blocks in line, on screen, that helpers can sketch
  helped = new Map<HTMLElement, number>(); // last time a helper was working on a block in line
  lastT = 0;
  chiefAt: ({ j: Job; host: HTMLElement } | null)[] = [null, null]; // the piece each builder is on
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
    const n = innerWidth < 720 ? CURSORS.mobile : CURSORS.desktop;
    // a small flock works as a single crew, so every crew still has the whole team
    this.crews = n >= 24 ? (innerWidth < 720 ? 2 : 3) : 1;
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
        clk: Math.random() < 0.35 ? rnd(0.25, 0.6) : 0, due: 0, was: false, slot: 0, of: 1, chief: -1,
      };
      this.place(b);
      this.boids.push(b);
    });
    // every cursor of a crew gets its own part of the piece, so they spread out instead of piling on one spot
    for (let c = 0; c < this.crews; c++) {
      const crew = this.boids.filter((b) => b.crew === c);
      const order = crew.map((_, k) => k);
      for (let k = order.length - 1; k > 0; k--) { const m = (Math.random() * (k + 1)) | 0; [order[k], order[m]] = [order[m], order[k]]; }
      crew.forEach((b, k) => { b.slot = order[k]; b.of = crew.length; });
      // two cursors of the first crew are builders too: each one really builds a block still in line
      if (c === 0) crew.forEach((b) => { b.chief = b.slot === 1 ? 0 : b.slot === 2 ? 1 : -1; });
    }
  }

  addJob(el: HTMLElement, host: HTMLElement, start: number) {
    const j = this.makeJob(el, host, start);
    // a piece the helpers already sketched carries on from that sketch
    const d = this.drafts.get(host)?.find((x) => x.el === el);
    j.pre = d?.pre ?? 0;
    j.seq = this.seq++;
    if (d?.built) j.start = performance.now() - 1.2 * j.dur; // already built by one of the builders: done at once
    else if (j.pre >= PH[j.kind].r0) j.start = performance.now() - j.pre * j.dur; // halfway: carry on right away
    else el.classList.add('atom-wait');
    this.jobs.push(j);
    this.left.set(host, (this.left.get(host) ?? 0) + 1);
  }

  makeJob(el: HTMLElement, host: HTMLElement, start: number): Job {
    const kind = kindOf(el);
    const r = el.getBoundingClientRect();
    const lh = parseFloat(getComputedStyle(el).lineHeight) || 24;
    const fs = parseFloat(getComputedStyle(el).fontSize) || 16;
    // measure what the piece will really look like: its text lines, its corners, its inner layout
    let ln = kind === 'text' || kind === 'title' || kind === 'small' ? lineBoxes(el, r) : [];
    if ((kind === 'text' || kind === 'title') && !ln.length) ln = [{ x: 0, y: 0, w: r.width, h: Math.min(r.height, lh), rad: [0, 0, 0, 0], fill: true, text: true }];
    const parts = kind === 'visual' ? partsOf(el, r) : [];
    const own = paints(el);
    const lines = ln.length ? Math.min(14, ln.length) : Math.max(1, Math.min(10, Math.round(r.height / lh)));
    const dur = kind === 'visual' ? 1900 : kind === 'small' ? 750 : kind === 'title' ? 1150 : Math.min(2200, 800 + lines * 260);
    return { seq: -1, el, host, kind, start: Infinity, nb: start, dur, pre: 0, revealed: false, built: false, lines, lh, rad: radii(el, r.width, r.height), ln, parts, fs, shell: own.fill || own.line, col: own.col };
  }

  /** Blocks waiting in line get sketched by the helpers working on them, but only up to the outline:
   *  the box is dragged out and the draft drawn, nothing is revealed until the block's real turn. */
  sketch(now: number) {
    const dt = Math.min(50, now - (this.lastT || now));
    this.lastT = now;
    const line = runner.queue.filter((el) => !el.classList.contains('is-built') && !el.classList.contains('is-revealing'));
    for (const host of Array.from(this.drafts.keys())) if (!line.includes(host)) this.drafts.delete(host);
    this.sketching = [];
    if (this.mode !== 'build') return;
    for (const host of line) {
      const hr = host.getBoundingClientRect();
      if (hr.bottom < 60 || hr.top > this.h - 40) continue;
      let ds = this.drafts.get(host);
      if (!ds) { ds = atoms(host).map((a) => this.makeJob(a, host, 0)); this.drafts.set(host, ds); }
      this.sketching.push(host);
      const k = this.sketching.length - 1;
      if (k < 2 && this.boids.some((b) => b.chief === k && now >= b.enterAt)) {
        // the next two blocks in line get a builder each: it really builds them, piece by piece,
        // and like the lead it only works once it stands on the piece's work point
        if (!host.classList.contains('is-early')) {
          host.classList.add('is-early');
          ds.forEach((d) => { if (d.pre < PH[d.kind].r0) d.el.classList.add('atom-wait'); });
        }
        for (const d of ds) if (d.pre >= 1 && d.pre < 1.2) d.pre = Math.min(1.2, d.pre + dt / d.dur); // fade out the finished draft
        const j = ds.find((d) => d.pre < 1);
        this.chiefAt[k] = j ? { j, host } : null;
        const b = this.boids.find((x) => x.chief === k)!;
        if (j) {
          const [px, py] = this.chiefPoint(j);
          if (Math.hypot(b.x - px, b.y - py) < 30) j.pre = Math.min(1, j.pre + dt / j.dur);
        }
        for (const d of ds) if (d.pre > 0 && !d.built) this.reveal({ j: d, r: d.el.getBoundingClientRect(), p: d.pre });
        continue;
      }
      // the other blocks in line: one piece after the other, slower than the real build, never past the outline
      const j = ds.find((d) => d.pre < PH[d.kind].d);
      if (j && this.helped.get(host)! > now - 120) j.pre = Math.min(PH[j.kind].d, j.pre + (dt / j.dur) * 0.45);
    }
    for (let k = this.sketching.length; k < 2; k++) this.chiefAt[k] = null;
  }

  /** Where a builder works on a piece: drags the box from its corner, then sweeps the reveal across it. */
  chiefPoint(j: Job): [number, number] {
    const r = j.el.getBoundingClientRect(), ph = PH[j.kind], p = j.pre;
    if (p < ph.d) { const d = ease(p / ph.d); return [r.left + r.width * d, r.top + r.height * d]; }
    if (p < ph.r0) return [r.right + 4, r.bottom + 3];
    if (j.kind === 'text') return this.caret({ j, r, p });
    return [r.left + r.width * ease(band(p, ph.r0, ph.r1)), r.bottom - 6];
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
    // the area a crew works over: the piece plus a margin, never smaller than a small button would leave
    const mx = Math.min(28, 10 + r.width * 0.04), my = Math.min(22, 8 + r.height * 0.04);
    const w = Math.max(r.width + mx * 2, 220), h = Math.max(r.height + my * 2, 120);
    // first time on a piece: start at a random point of its own rhythm, so no two cursors move in step
    if (!b.was) b.hopUntil = now + rnd(0, 1100);
    b.insp = true;
    if (now > b.hopUntil) {
      // each cursor hops only inside its own cell of a grid over that area, so they spread out
      const cols = Math.max(1, Math.min(b.of, Math.round(Math.sqrt((b.of * w) / h))));
      const rows = Math.ceil(b.of / cols);
      b.hx = ((b.slot % cols) + rnd(0.2, 0.8)) / cols; b.hy = (Math.floor(b.slot / cols) + rnd(0.2, 0.8)) / rows;
      b.hopUntil = now + rnd(450, 1600);
      // only some cursors click, only on some stops, and each after its own pause
      b.clicked = Math.random() >= b.clk;
      b.due = now + rnd(120, 600);
    }
    return [r.left + r.width / 2 - w / 2 + w * b.hx, r.top + r.height / 2 - h / 2 + h * b.hy];
  }

  caret(L: Live): [number, number] {
    const { r, p, j } = L, ph = PH.text;
    const pos = band(p, ph.r0, ph.r1) * j.lines;
    const k = Math.min(j.lines - 1, Math.floor(pos));
    const b = j.ln[k];
    if (b) return [r.left + b.x + b.w * Math.min(1, pos - k), r.top + b.y];
    return [r.left + r.width * (pos - k), r.top + k * j.lh];
  }

  /** Where a cursor should be, given its job in the team and the piece it is working on. */
  /** The cursor that opens every piece of a crew: its first frame cursor. */
  lead(crew: number) { return this.boids.find((b) => b.crew === crew && b.kind === 'frame' && b.q === 0) ?? this.boids.find((b) => b.crew === crew)!; }

  /** The next piece waiting for its cursor (the previous piece of its block is finished). */
  pending(now: number): Job | null {
    for (const j of this.jobs) {
      if (j.start !== Infinity) { if (!j.built) return null; continue; } // a piece is still being built: wait for it
      return now >= j.nb ? j : null;
    }
    return null;
  }

  gate(now: number) {
    const j = this.pending(now);
    if (!j) return;
    const b = this.lead(j.seq % this.crews);
    const r = j.el.getBoundingClientRect();
    const arrived = Math.hypot(b.x - r.left, b.y - r.top) < 14 && now >= b.enterAt;
    j.since ??= now;
    // safety net: never wait forever (cursor off screen, piece far away)
    if (arrived || now - j.since > 3500) j.start = now - j.pre * j.dur;
  }

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
        if (j.kind === 'title') return [r.left + r.width * (0.3 + 0.6 * band(p, ph.r0, ph.r1)) + wob * 6, r.top + r.height * (0.55 + 0.15 * Math.sin(t * 1.6 + b.seed))];
        return [r.left + r.width * ease(band(p, ph.r0, ph.r1)), r.bottom - 6 + wob * 4];
      }
      case 'bar': { // carries placeholder lines into text, or works the grid of an image
        if (p > ph.r0 + 0.05) break;
        if (j.kind === 'text' && sub < j.lines) {
          const b = j.ln[sub];
          const bp = band(p, ph.d * 0.6 + sub * 0.025, ph.d + 0.06 + sub * 0.025);
          if (b) return [r.left + b.x + b.w * ease(bp), r.top + b.y + b.h / 2 + 4];
          return [r.left + r.width * 0.95 * ease(bp), r.top + j.lh * (sub + 0.5) + 4];
        }
        if (j.kind === 'visual' && j.parts.length) {
          const b = j.parts[(sub * 7) % j.parts.length];
          return [r.left + b.x + b.w * 0.5, r.top + b.y + b.h * 0.5 + wob * 3];
        }
        if (j.kind === 'visual' && sub < 8) return [r.left + r.width * (0.18 + 0.64 * ((sub * 0.37 + 0.1) % 1)), r.top + r.height * (0.18 + 0.64 * ((sub * 0.61 + 0.3) % 1)) + wob * 3];
        break;
      }
      case 'guide': { // holds the guide lines
        if (p > ph.r1 || j.kind === 'small') break;
        const reach = 14 + 16 * (0.5 + 0.5 * wob);
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
        return [r.left + r.width * (0.15 + 0.7 * (0.5 + 0.5 * Math.sin(t * 0.5 + sub * 2 + b.seed))), r.top - 12 + wob * 3];
    }
    return this.inspect(b, this.spot(b, r), now);
  }

  /** Where a helper works: not everyone on the piece being built. About a third stay on it, the rest each take
   *  another block on screen (built or still to come), so the swarm is spread over the page. */
  spot(b: Boid, r: DOMRect): DOMRect {
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (b.slot % 3 !== 0 && this.sketching.length) {
      // first the blocks still in line: the helpers sketch them a little ahead of their turn
      const host = this.sketching[(b.slot + b.crew) % this.sketching.length];
      this.helped.set(host, performance.now());
      return host.getBoundingClientRect();
    }
    const others = this.blocks.filter((rc) => !(cx >= rc.left && cx <= rc.right && cy >= rc.top && cy <= rc.bottom));
    if (!others.length || b.slot % 3 === 0) return r;
    return others[(b.slot + b.crew) % others.length];
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
      const pos = v * j.lines, k = Math.min(j.lines - 1, Math.floor(pos));
      const b = j.ln[k];
      const y0 = b ? b.y : k * j.lh, y1 = b ? b.y + b.h : y0 + j.lh;
      const x = b ? `${(b.x + b.w * (pos - k)).toFixed(1)}px` : `${((pos - k) * 100).toFixed(1)}%`;
      el.style.clipPath = `polygon(-4px -4px, calc(100% + 4px) -4px, calc(100% + 4px) ${y0}px, ${x} ${y0}px, ${x} ${y1}px, -4px ${y1}px)`;
    } else {
      el.style.opacity = String(ease(v));
    }
    if (p >= ph.r1) { if (j.seq < 0) { j.built = true; cleanAtom(j.el); } else this.finishJob(j); }
  }

  frame = (now: number) => {
    this.raf = 0;
    const { ctx } = this;
    ctx.clearRect(0, 0, this.w, this.h);
    const t = (now - this.modeStart) / 1000;

    // One piece at a time, and only once its lead cursor is standing on the piece's corner.
    this.gate(now);
    this.sketch(now);
    const live: Live[] = this.jobs.map((j) => ({ j, r: j.el.getBoundingClientRect(), p: j.start === Infinity ? (j.pre > 0 ? j.pre : -Infinity) : (now - j.start) / j.dur }));
    this.blocks = Array.from(document.querySelectorAll<HTMLElement>('[data-build]')).map((el) => el.getBoundingClientRect())
      .filter((rc) => rc.bottom > 60 && rc.top < this.h - 40 && rc.width > 30 && rc.height > 20);
    live.forEach((L) => this.reveal(L));
    // keep jobs added while revealing (the next block starts the moment the current one ends)
    const gone = new Set(live.filter(({ p }) => p >= 1.2).map(({ j }) => j));
    this.jobs = this.jobs.filter((j) => !gone.has(j));
    const shown = live.filter((L) => L.p >= 0 && L.p < 1.2 && L.r.bottom > -40 && L.r.top < this.h + 40);
    for (const L of shown) this.drawJob(L, now);
    for (const host of this.sketching) for (const j of this.drafts.get(host)!) if (j.pre > 0 && j.pre < 1.2) this.drawJob({ j, r: j.el.getBoundingClientRect(), p: j.pre }, now);
    if (this.loader) this.drawLoader(t);

    // a piece is waiting for its cursor: the flock is at work, whatever it was doing
    if ((this.mode === 'wait' || this.mode === 'leave') && this.pending(now)) this.setMode('build');
    // steering: each cursor does its own job on one of the pieces being built
    const active = live.filter((l) => l.j.start !== Infinity && l.p > -0.1 && l.p < 1);
    const review = this.mode === 'wait'
      ? Array.from(document.querySelectorAll<HTMLElement>('[data-build].is-built')).map((el) => el.getBoundingClientRect())
          .filter((rc) => rc.top > 40 && rc.top < this.h - 60 && rc.height > 30)
      : [];
    this.boids.forEach((b, i) => {
      if (now < b.enterAt) return; // still waiting off screen for its turn to come in
      b.was = b.insp; // inspecting last frame?
      b.insp = false;
      let tx: number, ty: number;
      const wait = this.mode !== 'orbit' ? this.pending(now) : null;
      const leading = !!wait && b === this.lead(wait.seq % this.crews);
      let glue = false;
      const chief = b.chief >= 0 && this.mode === 'build' && !leading ? this.chiefAt[b.chief] : null;
      if (chief) {
        // a builder on a block still in line: on its work point, nowhere else
        [tx, ty] = this.chiefPoint(chief.j);
        glue = Math.hypot(tx - b.x, ty - b.y) < 40;
      } else if (leading) {
        // the lead flies to the top-left corner of the next piece; the piece only starts once it is there
        const wr = wait!.el.getBoundingClientRect();
        [tx, ty] = [wr.left, wr.top];
        glue = Math.hypot(tx - b.x, ty - b.y) < 40;
      } else if (this.mode === 'wait' && review.length) {
        [tx, ty] = this.inspect(b, review[(b.crew * 5 + b.q + i) % review.length], now);
      } else if (this.mode === 'orbit' || this.mode === 'wait' || (this.mode === 'build' && !active.length && live.length)) {
        if (this.mode === 'wait') this.center = { x: this.w / 2, y: this.h - 90 };
        if (this.mode === 'build') {
          // between pieces: each cursor already takes its own part of the next piece, spread out over it
          const ref = live.find((l) => l.p <= -0.1) ?? live[live.length - 1];
          this.center = { x: ref.r.left + ref.r.width / 2, y: ref.r.top + ref.r.height / 2 };
          [tx, ty] = this.inspect(b, this.spot(b, ref.r), now);
        } else {
        this.center = { x: Math.min(this.w - 60, Math.max(60, this.center.x)), y: Math.min(this.h - 60, Math.max(60, this.center.y)) };
        // a tight swirl, like a flock of birds turning around one point
        const a = b.seed + t * (2.2 + b.spd * 0.8);
        const rad = 34 + (i % 9) * 9 + Math.sin(t * 3 + i) * 10;
        [tx, ty] = [this.center.x + Math.cos(a) * rad, this.center.y + Math.sin(a) * rad * 0.8];
        }
      } else if (this.mode === 'build' && active.length) {
        const mine = active.filter((l) => l.j.seq % this.crews === b.crew);
        if (mine.length) {
          const L = mine[b.q % mine.length];
          [tx, ty] = this.targetFor(b, L, Math.floor(b.q / mine.length), now, t);
          // the cursors doing the work (dragging the box, typing) stay exactly on their point
          const ph = PH[L.j.kind];
          glue = (b === this.lead(b.crew) || (b.kind === 'sweep' && b.q === 0)) && L.p >= 0 && L.p <= ph.r1;
        } else {
          const near = active.reduce((m, l) => (Math.hypot(l.r.left + l.r.width / 2 - b.x, l.r.top + l.r.height / 2 - b.y) < Math.hypot(m.r.left + m.r.width / 2 - b.x, m.r.top + m.r.height / 2 - b.y) ? l : m));
          [tx, ty] = this.inspect(b, near.r, now);
        }
      } else {
        [tx, ty] = [b.ex, b.ey];
      }
      const dx = tx - b.x, dy = ty - b.y;
      const dist = Math.hypot(dx, dy) || 1;
      // glide: ease toward the target, slowing down smoothly as it gets close
      const max = (this.mode === 'leave' ? 9 + t * 4 : leading ? 16 : 11) * b.spd;
      const speed = Math.min(max, dist * 0.09);
      let ax = (dx / dist) * speed - b.vx, ay = (dy / dist) * speed - b.vy;
      // the lead and the cursors at work hold their point: they are not pushed around by the others
      for (let o = 0; !leading && !glue && o < this.boids.length; o += 3) {
        const n = this.boids[(i + o + 1) % this.boids.length];
        const sx = b.x - n.x, sy = b.y - n.y, sd = sx * sx + sy * sy;
        if (sd > 0 && sd < 160) { ax += (sx / sd) * 4; ay += (sy / sd) * 4; }
      }
      const g = 0.1 + 0.04 * b.gain;
      if (glue && dist < 40) {
        // on the job: follow the work point closely instead of flying around it
        const nx = b.x + dx * 0.3, ny = b.y + dy * 0.3;
        b.vx = nx - b.x; b.vy = ny - b.y; b.x = nx; b.y = ny;
      } else {
        b.vx += ax * g; b.vy += ay * g;
        b.x += b.vx; b.y += b.vy;
      }
      const v = Math.hypot(b.vx, b.vy);
      // at most one click starts every ~180 ms in the whole flock: never a row of clicks at once
      if (b.insp && !b.clicked && dist < 6 && now >= b.due && now - this.lastClick > 180) {
        b.clicked = true; b.clickAt = now; b.cx = b.x; b.cy = b.y; this.lastClick = now;
      }
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
    // always upright, like a real mouse pointer: it glides, it never spins
    void v;
    ctx.save();
    ctx.translate(b.x, b.y); ctx.scale(b.s, b.s);
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
    // (not for sketches of blocks still in line: only the piece really being built gets the guides)
    if (g > 0 && j.kind !== 'small' && j.seq >= 0) {
      ctx.globalAlpha = fade * g * 0.55;
      ctx.fillStyle = BLUE;
      ctx.fillRect(0, Math.round(r.top), this.w, 1);
      ctx.fillRect(0, Math.round(r.top + h), this.w, 1);
      ctx.globalAlpha = fade;
    }

    // The draft is drawn from the real layout: same boxes, same corners, same text lines.
    ctx.save();
    ctx.beginPath(); ctx.rect(r.left - 2, r.top - 2, w + 4, h + 4); ctx.clip();
    if (j.kind === 'visual') {
      // the outer frame with its real corners, then every inner box and text line where it will end up
      const grey = 1 - band(p, ph.r0, ph.r1);
      ctx.globalAlpha = fade * grey;
      // in the piece's own colors, so the draft already reads like the final card
      ctx.fillStyle = j.col ?? 'rgba(22,24,28,.96)';
      shape(ctx, r.left, r.top, r.width, r.height, j.rad); ctx.fill();
      ctx.strokeStyle = 'rgba(128,136,148,.5)'; ctx.lineWidth = 1;
      shape(ctx, r.left + 0.5, r.top + 0.5, r.width - 1, r.height - 1, j.rad); ctx.stroke();
      const gp = band(p, ph.d * 0.5, ph.r0);
      const n = j.parts.length;
      j.parts.forEach((pt, i) => {
        const a = ease(band(gp, (i / Math.max(1, n)) * 0.55, (i / Math.max(1, n)) * 0.55 + 0.35));
        if (a <= 0) return;
        const x = r.left + pt.x, y = r.top + pt.y;
        if (pt.text) {
          const bh = Math.max(3, pt.h * 0.55);
          ctx.fillStyle = 'rgba(150,158,170,.75)';
          ctx.fillRect(x, y + (pt.h - bh) / 2, pt.w * a, bh);
          return;
        }
        ctx.globalAlpha = fade * grey * a;
        if (pt.media) {
          // the 3D scene: a wireframe sphere where the neural network will spin
          const cx = x + pt.w / 2, cy = y + pt.h / 2, R = Math.min(pt.w, pt.h) * 0.4 * a;
          ctx.strokeStyle = 'rgba(30,139,255,.6)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
          for (let e = 1; e <= 2; e++) { ctx.beginPath(); ctx.ellipse(cx, cy, R, R * (0.25 + e * 0.25), 0, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.ellipse(cx, cy, R * (0.25 + e * 0.25), R, 0, 0, Math.PI * 2); ctx.stroke(); }
          ctx.globalAlpha = fade * grey;
          return;
        }
        if (pt.fill) { ctx.fillStyle = pt.col ?? 'rgba(150,158,170,.22)'; shape(ctx, x, y, pt.w, pt.h, pt.rad); ctx.fill(); }
        ctx.strokeStyle = 'rgba(30,139,255,.75)'; ctx.lineWidth = 1;
        shape(ctx, x + 0.5, y + 0.5, pt.w - 1, pt.h - 1, pt.rad); ctx.stroke();
        ctx.globalAlpha = fade * grey;
      });
      ctx.globalAlpha = fade;
    } else if (j.kind === 'small') {
      // a button, chip or tag: its own pill/circle/box, with its label line inside
      const grey = 1 - band(p, ph.r0, ph.r1);
      ctx.globalAlpha = fade * grey;
      if (j.shell) {
        ctx.fillStyle = j.col ?? 'rgba(128,136,148,.25)'; shape(ctx, r.left, r.top, r.width, r.height, j.rad); ctx.fill();
        ctx.strokeStyle = 'rgba(128,136,148,.6)'; ctx.lineWidth = 1; shape(ctx, r.left + 0.5, r.top + 0.5, r.width - 1, r.height - 1, j.rad); ctx.stroke();
      }
      const lp = band(p, ph.d * 0.5, ph.r0);
      for (const b of j.ln) {
        const bh = Math.max(3, Math.min(b.h, j.fs) * 0.6);
        ctx.fillStyle = 'rgba(120,128,140,.9)';
        ctx.fillRect(r.left + b.x, r.top + b.y + (b.h - bh) / 2, b.w * ease(lp), bh);
      }
      ctx.globalAlpha = fade;
    } else if (j.kind === 'text' || j.kind === 'title') {
      // grey bars exactly where each real line of text sits, as long as that line really is
      const lp = band(p, ph.d * 0.6, ph.r0);
      const pos = j.kind === 'text' ? band(p, ph.r0, ph.r1) * j.lines : (p >= ph.r0 ? j.lines : 0);
      for (let k = 0; k < j.lines; k++) {
        const b = j.ln[k];
        if (!b) continue;
        const full = b.w * ease(band(lp, k * 0.08, k * 0.08 + 0.5));
        const done = Math.min(1, Math.max(0, pos - k));
        const from = r.left + b.x + b.w * done;
        const len = r.left + b.x + full - from;
        if (len <= 0) continue;
        const bh = Math.max(4, Math.min(b.h, j.fs * 1.2) * (j.kind === 'title' ? 0.72 : 0.6));
        ctx.fillStyle = j.kind === 'title' ? 'rgba(90,96,108,.8)' : 'rgba(52,56,64,.95)';
        ctx.fillRect(from, r.top + b.y + (b.h - bh) / 2, len, bh);
      }
      if (j.kind === 'text' && p > ph.r0 && p < ph.r1 && Math.floor(now / 260) % 2 === 0) {
        const [cx, cy] = this.caret(L);
        const b = j.ln[Math.min(j.lines - 1, Math.floor(band(p, ph.r0, ph.r1) * j.lines))];
        const ch = b ? b.h : j.lh;
        ctx.fillStyle = BLUE; ctx.fillRect(Math.round(cx), cy + ch * 0.12, 2, ch * 0.76);
      }
    }
    ctx.restore();

    // the selection box, its handles and the live size badge
    if (d > 0.02) {
      ctx.strokeStyle = col; ctx.lineWidth = 1;
      // the outline takes the piece's real corners, so a circle is drawn as a circle
      shape(ctx, x0, y0, Math.round(w), Math.round(h), j.rad.map((v) => v * Math.min(w / Math.max(1, r.width), h / Math.max(1, r.height))));
      ctx.stroke();
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
    // keep the line in visual order, top to bottom (then left to right), whatever the order in the code
    this.queue.sort((a, b) => {
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      return Math.abs(ra.top - rb.top) > 8 ? ra.top - rb.top : ra.left - rb.left;
    });
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
 * After a few idle seconds the page starts a slow, continuous scroll. It follows the construction: it keeps
 * the piece being built on screen and cruises between blocks. It only ever runs for a visitor who has not
 * touched the page: the first wheel, touch, key, click or manual scroll turns it off for good. */
const IDLE_MS = 4500;
const CRUISE = 120, WORKING = 48; // px per second (WORKING: building, with no piece to follow)
let touring = false;
function autoScroll() {
  let last = performance.now();
  let speed = 0, pos = -1, prev = 0, done = false;
  // the visitor took the wheel: from now on the page is theirs, the tour never comes back
  const poke = () => { last = performance.now(); speed = 0; pos = -1; touring = false; done = true; };
  addEventListener('scroll', () => { if (!done && (!touring || Math.abs(scrollY - pos) > 12)) poke(); }, { passive: true });
  ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach((e) => addEventListener(e, poke, { passive: true }));
  const step = (now: number) => {
    if (done) return;
    const dt = Math.min(0.05, (now - prev) / 1000 || 0);
    prev = now;
    if (fxOn() && now - last > IDLE_MS) {
      touring = true;
      const f = runner.flock;
      const working = f?.mode === 'build' || f?.mode === 'orbit';
      let want = working ? WORKING : CRUISE;
      // while building, the page follows the work: it keeps the piece being built a bit above the middle
      // of the screen, so it scrolls exactly as fast as the construction goes down (and never runs ahead)
      const piece = f?.mode === 'build' ? (f.jobs.find((j) => j.start !== Infinity && !j.built) ?? f.jobs.find((j) => !j.built)) : undefined;
      if (piece) {
        const r = piece.el.getBoundingClientRect();
        const ahead = r.top + Math.min(r.height, innerHeight * 0.4) - innerHeight * 0.55;
        want = Math.max(0, Math.min(CRUISE, ahead * 1.6));
      }
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
