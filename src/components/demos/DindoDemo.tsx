import { useEffect, useRef, useState } from 'react';
import { useSteps } from './useDemo';
import DemoCursor from './DemoCursor';

type Props = { lang: 'pt' | 'en' };

const copy = {
  pt: { crm: 'Cérebro · Lançar consumo', who: 'Afilhado #0142', items: [['Chopp 500 ml', 'R$ 16,00'], ['Porção de fritas', 'R$ 32,00'], ['Água com gás', 'R$ 6,00']], total: 'Total', go: 'Lançar consumo', app: 'App do afilhado', pts: 'pontos', toast: 'pontos do consumo de hoje', reward: 'Faltam 38 pts para um chopp' },
  en: { crm: 'Cérebro · Log consumption', who: 'Member #0142', items: [['Draft beer 500 ml', 'R$ 16,00'], ['Fries', 'R$ 32,00'], ['Sparkling water', 'R$ 6,00']], total: 'Total', go: 'Log consumption', app: 'Member app', pts: 'points', toast: 'points from today', reward: '38 pts to a free beer' },
};

// staff logs a tab in the CRM → points land in the customer's app
export default function DindoDemo({ lang }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { step, reduced } = useSteps(ref, [900, 700, 700, 900, 900, 2400], 5);
  const t = copy[lang];
  const [pts, setPts] = useState(108);
  const shown = step >= 1 ? Math.min(3, step) : 0;
  useEffect(() => {
    if (step === 0) setPts(108);
    if (step === 5) {
      if (reduced) { setPts(162); return; }
      let v = 108;
      const id = window.setInterval(() => { v = Math.min(162, v + 3); setPts(v); if (v >= 162) window.clearInterval(id); }, 30);
      return () => window.clearInterval(id);
    }
  }, [step, reduced]);
  return (
    <div ref={ref} className="demo demo-dindo" aria-hidden="true">
      <div className="dd-crm">
        <span className="mono dd-k">{t.crm}</span>
        <strong className="dd-who">{t.who}</strong>
        <ul>
          {t.items.map(([n, p], i) => (
            <li key={n} className={i < shown ? 'on' : ''} data-hot={(step === 0 && i === 0) || (step >= 1 && step <= 3 && i === Math.min(2, step)) ? '' : undefined}><span>{n}</span><span className="mono">{p}</span></li>
          ))}
        </ul>
        <div className="dd-total"><span>{t.total}</span><span className="mono">{shown === 3 ? 'R$ 54,00' : '—'}</span></div>
        <span className={`dd-btn ${step === 4 ? 'press' : ''}`} data-hot={step === 4 ? '' : undefined}>{t.go}</span>
      </div>
      <div className="dd-link"><i className={step >= 4 ? 'go' : ''} /></div>
      <div className="dd-phone">
        <span className="mono dd-k">{t.app}</span>
        <div className="dd-points" data-hot={step === 5 ? '' : undefined}><strong className="mono">{pts}</strong><span>{t.pts}</span></div>
        <div className="dd-bar"><i style={{ width: `${(pts / 200) * 100}%` }} /></div>
        <span className="dd-reward">{t.reward}</span>
        <div className={`dd-toast ${step === 5 ? 'on' : ''}`}>+54 {t.toast}</div>
      </div>
      <DemoCursor host={ref} beat={step} />
    </div>
  );
}
