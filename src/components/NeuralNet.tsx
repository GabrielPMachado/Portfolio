import { useEffect, useRef } from 'react';
import * as THREE from 'three';

type Props = { label: string };

// A holographic neural network: layered nodes, glowing links and data pulses
// travelling between layers. Pauses when off screen, static with reduced motion.
export default function NeuralNet({ label }: Props) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mobile = window.innerWidth < 720;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-hidden', 'true');

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0.4, 9.2);

    const net = new THREE.Group();
    scene.add(net);

    // glow sprite
    const spriteCanvas = document.createElement('canvas');
    spriteCanvas.width = spriteCanvas.height = 64;
    const sc = spriteCanvas.getContext('2d')!;
    const grd = sc.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.25, 'rgba(255,255,255,.85)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    sc.fillStyle = grd; sc.fillRect(0, 0, 64, 64);
    const sprite = new THREE.CanvasTexture(spriteCanvas);

    // deterministic random so the shape is the same on every visit
    let s = 7;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);

    const layers = mobile ? [5, 8, 9, 8, 5] : [6, 10, 13, 10, 6];
    const nodes: THREE.Vector3[][] = layers.map((count, li) => {
      const x = (li - (layers.length - 1) / 2) * 1.25;
      const radius = 0.55 + count * 0.11;
      return Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 + li * 0.4;
        const r = radius * (0.75 + rnd() * 0.3);
        return new THREE.Vector3(x + (rnd() - 0.5) * 0.25, Math.sin(a) * r, Math.cos(a) * r);
      });
    });
    const all = nodes.flat();

    // nodes
    const nodeGeo = new THREE.BufferGeometry().setFromPoints(all);
    const nodeColors: number[] = [];
    const blue = new THREE.Color('#5FB0FF'), amber = new THREE.Color('#FFB224');
    all.forEach((_, i) => { const c = i % 7 === 3 ? amber : blue; nodeColors.push(c.r, c.g, c.b); });
    nodeGeo.setAttribute('color', new THREE.Float32BufferAttribute(nodeColors, 3));
    const nodeMat = new THREE.PointsMaterial({ size: 0.34, map: sprite, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    net.add(new THREE.Points(nodeGeo, nodeMat));
    const coreMat = new THREE.PointsMaterial({ size: 0.1, color: 0xffffff, map: sprite, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    net.add(new THREE.Points(nodeGeo, coreMat));

    // links between neighbouring layers
    const edges: [THREE.Vector3, THREE.Vector3][] = [];
    for (let l = 0; l < nodes.length - 1; l++) {
      for (const a of nodes[l]) {
        const targets = [...nodes[l + 1]].sort(() => rnd() - 0.5).slice(0, 3);
        for (const b of targets) edges.push([a, b]);
      }
    }
    const linePos: number[] = [];
    edges.forEach(([a, b]) => linePos.push(a.x, a.y, a.z, b.x, b.y, b.z));
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePos, 3));
    const lineMat = new THREE.LineBasicMaterial({ color: 0x1e8bff, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false });
    net.add(new THREE.LineSegments(lineGeo, lineMat));

    // holographic shell of faint particles
    const shell: THREE.Vector3[] = [];
    for (let i = 0; i < (mobile ? 220 : 420); i++) {
      const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, r = 3.6;
      shell.push(new THREE.Vector3(Math.sqrt(1 - u * u) * Math.cos(th) * r * 1.15, u * r * 0.78, Math.sqrt(1 - u * u) * Math.sin(th) * r * 0.8));
    }
    const shellMat = new THREE.PointsMaterial({ size: 0.05, color: 0x1e8bff, map: sprite, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
    net.add(new THREE.Points(new THREE.BufferGeometry().setFromPoints(shell), shellMat));

    // projector rings under the hologram
    const rings = new THREE.Group();
    [2.2, 2.9, 3.4].forEach((r, i) => {
      const pts = Array.from({ length: 129 }, (_, k) => { const a = (k / 128) * Math.PI * 2; return new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r); });
      const m = new THREE.LineBasicMaterial({ color: i === 1 ? 0xffb224 : 0x1e8bff, transparent: true, opacity: i === 1 ? 0.35 : 0.25, blending: THREE.AdditiveBlending });
      const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), m);
      if (i === 1) (ring.material as THREE.LineBasicMaterial).opacity = 0.3;
      rings.add(ring);
    });
    rings.position.y = -2.9;
    scene.add(rings);

    // data pulses running along links
    const PULSES = mobile ? 26 : 48;
    const pulseState = Array.from({ length: PULSES }, () => ({ e: (rnd() * edges.length) | 0, t: rnd(), v: 0.35 + rnd() * 0.6 }));
    const pulsePos = new Float32Array(PULSES * 3);
    const pulseGeo = new THREE.BufferGeometry();
    pulseGeo.setAttribute('position', new THREE.BufferAttribute(pulsePos, 3));
    const pulseMat = new THREE.PointsMaterial({ size: 0.22, color: 0xffd27a, map: sprite, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    net.add(new THREE.Points(pulseGeo, pulseMat));

    const placePulses = (dt: number) => {
      pulseState.forEach((p, i) => {
        p.t += dt * p.v;
        if (p.t > 1) {
          // continue from the end node into the next layer when possible
          const end = edges[p.e][1];
          const next = edges.map((e, k) => (e[0] === end ? k : -1)).filter((k) => k >= 0);
          p.e = next.length ? next[(rnd() * next.length) | 0] : (rnd() * edges.length) | 0;
          p.t = 0;
        }
        const [a, b] = edges[p.e];
        pulsePos[i * 3] = a.x + (b.x - a.x) * p.t;
        pulsePos[i * 3 + 1] = a.y + (b.y - a.y) * p.t;
        pulsePos[i * 3 + 2] = a.z + (b.z - a.z) * p.t;
      });
      pulseGeo.attributes.position.needsUpdate = true;
    };

    // sizing
    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      camera.aspect = w / h;
      camera.position.z = w / h < 0.9 ? 11 : 9.2;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    // pointer parallax
    const target = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      target.x = (e.clientX / window.innerWidth - 0.5) * 0.5;
      target.y = (e.clientY / window.innerHeight - 0.5) * 0.3;
    };
    window.addEventListener('pointermove', onMove);

    let raf = 0, last = performance.now(), visible = true, time = 0;
    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; time += dt;
      net.rotation.y += dt * 0.22;
      net.rotation.x += (target.y - net.rotation.x) * 0.04;
      net.rotation.z += (-target.x * 0.4 - net.rotation.z) * 0.04;
      rings.rotation.y -= dt * 0.15;
      nodeMat.size = 0.34 + Math.sin(time * 2.2) * 0.03;
      placePulses(dt);
      renderer.render(scene, camera);
      raf = visible ? requestAnimationFrame(draw) : 0;
    };

    if (reduced) {
      net.rotation.y = 0.6;
      placePulses(0);
      renderer.render(scene, camera);
    } else {
      raf = requestAnimationFrame(draw);
    }

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf && !reduced) { last = performance.now(); raf = requestAnimationFrame(draw); }
    });
    io.observe(el);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect(); ro.disconnect();
      window.removeEventListener('pointermove', onMove);
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={host} className="nn" role="img" aria-label={label} />;
}
