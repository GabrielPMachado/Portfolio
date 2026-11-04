import { useRef, useState } from 'react';
import { useTicker } from './useDemo';
import DemoCursor from './DemoCursor';

type Props = { lang: 'pt' | 'en' };

const labels = {
  pt: { head: 'Cidade Baixa · agora', s: ['Tranquilo', 'Movimentado', 'Lotado'] },
  en: { head: 'Cidade Baixa · now', s: ['Quiet', 'Busy', 'Packed'] },
};
// real bars of Cidade Baixa, Porto Alegre (crowd levels in the demo are simulated)
const venues = [
  { n: 'Parangolé', x: 34, y: 30 },
  { n: 'Olivos 657', x: 68, y: 40 },
  { n: 'Espaço 512', x: 48, y: 60 },
  { n: 'A Virgem', x: 22, y: 74 },
  { n: 'Boteco do Joaquim', x: 78, y: 76 },
  { n: 'Opinião', x: 60, y: 18 },
];
const tone = ['#34D399', '#FFB224', '#FF4A4A'];

export default function HypeDemo({ lang }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [level, setLevel] = useState([2, 1, 2, 0, 1, 0]);
  const [flash, setFlash] = useState(-1);
  useTicker(ref, 1500, () => {
    const i = (Math.random() * venues.length) | 0;
    setLevel((l) => l.map((v, k) => (k === i ? (v + (Math.random() < 0.6 ? 1 : 2)) % 3 : v)));
    setFlash(i);
  });
  const t = labels[lang];
  const ranking = venues.map((v, i) => ({ ...v, i, l: level[i] })).sort((a, b) => b.l - a.l || a.i - b.i);
  return (
    <div ref={ref} className="demo demo-hype" aria-hidden="true">
      <div className="hy-map">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="hy-streets">
          <path d="M-5 24 L105 34 M-5 64 L105 56 M30 -5 L38 105 M72 -5 L66 105" />
          <path className="thin" d="M-5 45 L105 47 M14 -5 L10 105 M52 -5 L55 105 M90 -5 L92 105" />
        </svg>
        {venues.map((v, i) => (
          <span key={v.n} className={`hy-spot ${flash === i ? 'flash' : ''}`} data-hot={flash === i ? '' : undefined} style={{ left: `${v.x}%`, top: `${v.y}%`, ['--c' as string]: tone[level[i]], ['--r' as string]: `${46 + level[i] * 26}px` }} />
        ))}
      </div>
      <div className="hy-list">
        <span className="mono hy-head">{t.head}</span>
        <ol>
          {ranking.slice(0, 5).map((v, k) => (
            <li key={v.n} style={{ ['--c' as string]: tone[v.l] }}>
              <span className="mono">{String(k + 1).padStart(2, '0')}</span>
              <b><span>{v.n}</span><small>{t.s[v.l]}</small></b>
              <i />
            </li>
          ))}
        </ol>
      </div>
      <DemoCursor host={ref} beat={flash + ':' + level.join('')} />
    </div>
  );
}
