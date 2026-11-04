import { useRef, useState } from 'react';
import { useTicker } from './useDemo';
import DemoCursor from './DemoCursor';

type Props = { lang: 'pt' | 'en' };

const labels = {
  pt: { head: 'Cidade Baixa · agora', lead: 'Mais hypado agora', s: ['De boas', 'Movimentado', 'Lotado'] },
  en: { head: 'Cidade Baixa · now', lead: 'Most hyped now', s: ['Chill', 'Busy', 'Packed'] },
};
// Cidade Baixa bars from the app's own venue list; the scores here are simulated.
const venues = [
  { n: 'Boteco do Joaquim', a: 'R. João Alfredo, 626', x: 30, y: 30, s: 8.8, r: 14 },
  { n: 'Matita Perê', a: 'Cidade Baixa', x: 66, y: 24, s: 8.1, r: 9 },
  { n: 'Paralela', a: 'R. Lopo Gonçalves, 66', x: 52, y: 54, s: 7.4, r: 11 },
  { n: 'Mambembe', a: 'R. Gen. Lima e Silva, 594', x: 22, y: 70, s: 6.2, r: 6 },
  { n: 'Sgt Peppers', a: 'Cidade Baixa', x: 78, y: 66, s: 4.9, r: 5 },
  { n: 'Capone Drinkeria', a: 'Cidade Baixa', x: 44, y: 84, s: 3.1, r: 3 },
];
const tone = ['#4E9E77', '#C79A3E', '#C1584B'];
const levelOf = (s: number) => (s <= 3.5 ? 0 : s <= 7 ? 1 : 2);

export default function HypeDemo({ lang }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [score, setScore] = useState(venues.map((v) => v.s));
  const [reports, setReports] = useState(venues.map((v) => v.r));
  const [flash, setFlash] = useState(-1);
  useTicker(ref, 1600, () => {
    const i = (Math.random() * venues.length) | 0;
    const d = (Math.random() < 0.55 ? 1 : -1) * (0.4 + Math.random() * 1.6);
    setScore((l) => l.map((v, k) => (k === i ? Math.round(Math.min(9.8, Math.max(1.2, v + d)) * 10) / 10 : v)));
    setReports((l) => l.map((v, k) => (k === i ? v + 1 : v)));
    setFlash(i);
  });
  const t = labels[lang];
  const ranking = venues.map((v, i) => ({ ...v, i, sc: score[i] })).sort((a, b) => b.sc - a.sc);
  return (
    <div ref={ref} className="demo demo-hype" aria-hidden="true">
      <div className="hy-map">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="hy-streets">
          <path d="M-5 24 L105 34 M-5 64 L105 56 M30 -5 L38 105 M72 -5 L66 105" />
          <path className="thin" d="M-5 45 L105 47 M14 -5 L10 105 M52 -5 L55 105 M90 -5 L92 105" />
        </svg>
        {venues.map((v, i) => {
          const l = levelOf(score[i]);
          return <span key={v.n} className={`hy-spot ${flash === i ? 'flash' : ''} ${ranking[0].i === i ? 'lead' : ''}`} data-hot={flash === i ? '' : undefined} style={{ left: `${v.x}%`, top: `${v.y}%`, ['--c' as string]: tone[l], ['--r' as string]: `${30 + score[i] * 9}px` }} />;
        })}
      </div>
      <div className="hy-list">
        <span className="hy-head">{t.head}</span>
        <ol>
          {ranking.slice(0, 4).map((v, k) => {
            const l = levelOf(v.sc);
            return (
              <li key={v.n} className={flash === v.i ? 'flash' : ''} style={{ ['--c' as string]: tone[l] }}>
                {k === 0 && <span className="hy-lead">⚡ {t.lead}</span>}
                <div className="hy-row">
                  <i className="hy-av">{v.n[0]}</i>
                  <b><span>{v.n}</span><small>{v.a}</small></b>
                  <strong className="hy-score">{v.sc.toFixed(1)}<em>{reports[v.i]}</em></strong>
                </div>
                <span className="hy-badge"><i />{t.s[l]}</span>
              </li>
            );
          })}
        </ol>
      </div>
      <DemoCursor host={ref} beat={flash + ':' + score.join('')} />
    </div>
  );
}
