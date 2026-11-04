import { useEffect, useRef, useState } from 'react';
import { useSteps } from './useDemo';
import DemoCursor from './DemoCursor';

type Props = { lang: 'pt' | 'en' };

// Points per item follow the real default price bands (up to R$ 10 → 5, 20 → 10, 40 → 20).
const copy = {
  pt: {
    crumb: 'Cérebro / Atendimento / Lançar consumo', who: 'Afilhado #0142 · Marina',
    items: [['Chopp 500 ml', 'R$ 16,00', 10], ['Porção de fritas', 'R$ 32,00', 20], ['Água com gás', 'R$ 6,00', 5]] as [string, string, number][],
    total: 'Total', go: 'Lançar consumo', rev: 'Receita +R$ 54,00 no Financeiro',
    hi: 'Olá, Marina', avail: 'Você tem disponível', pts: 'pontos', level: 'Afilhado', next: 'Compadre',
    before: 'Faltam 35 pts para Chopp 500 ml', after: 'Você já pode resgatar Chopp 500 ml', toast: 'pontos de hoje',
  },
  en: {
    crumb: 'Cérebro / Service / Log consumption', who: 'Member #0142 · Marina',
    items: [['Draft beer 500 ml', 'R$ 16,00', 10], ['Fries', 'R$ 32,00', 20], ['Sparkling water', 'R$ 6,00', 5]] as [string, string, number][],
    total: 'Total', go: 'Log consumption', rev: 'Revenue +R$ 54,00 in Finance',
    hi: 'Hi, Marina', avail: 'You have', pts: 'points', level: 'Afilhado', next: 'Compadre',
    before: '35 pts to a free draft beer', after: 'You can redeem a free draft beer', toast: 'points today',
  },
};

// staff logs a tab in the CRM → points land in the member's app and revenue in Finance
export default function DindoDemo({ lang }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { step, reduced } = useSteps(ref, [900, 700, 700, 900, 900, 2600], 5);
  const t = copy[lang];
  const [pts, setPts] = useState(1165);
  const shown = step >= 1 ? Math.min(3, step) : 0;
  useEffect(() => {
    if (step === 0) setPts(1165);
    if (step === 5) {
      if (reduced) { setPts(1200); return; }
      let v = 1165;
      const id = window.setInterval(() => { v = Math.min(1200, v + 1); setPts(v); if (v >= 1200) window.clearInterval(id); }, 28);
      return () => window.clearInterval(id);
    }
  }, [step, reduced]);
  const done = pts >= 1200;
  return (
    <div ref={ref} className="demo demo-dindo" aria-hidden="true">
      <div className="dd-crm">
        <span className="dd-k">{t.crumb}</span>
        <strong className="dd-who">{t.who}</strong>
        <ul>
          {t.items.map(([n, p, k], i) => (
            <li key={n} className={i < shown ? 'on' : ''} data-hot={(step === 0 && i === 0) || (step >= 1 && step <= 3 && i === Math.min(2, step)) ? '' : undefined}><span>{n}</span><span className="dd-pt">+{k}</span><span className="mono">{p}</span></li>
          ))}
        </ul>
        <div className="dd-total"><span>{t.total}</span><span className="mono">{shown === 3 ? 'R$ 54,00 · 35 pts' : '—'}</span></div>
        <span className={`dd-btn ${step === 4 ? 'press' : ''}`} data-hot={step === 4 ? '' : undefined}>{t.go}</span>
        <span className={`dd-rev ${step === 5 ? 'on' : ''}`}>✓ {t.rev}</span>
      </div>
      <div className="dd-link"><i className={step >= 4 ? 'go' : ''} /></div>
      <div className="dd-phone">
        <span className="dd-brand">BAR DO <b>DINDO</b></span>
        <span className="dd-hi">{t.hi}</span>
        <span className="dd-k">{t.avail}</span>
        <div className="dd-points" data-hot={step === 5 ? '' : undefined}><strong className="mono">{pts.toLocaleString('pt-BR')}</strong><span>{t.pts}</span></div>
        <div className="dd-lv"><span>{t.level}</span><span>{t.next} · 2.000</span></div>
        <div className="dd-bar"><i style={{ width: `${(pts / 2000) * 100}%` }} /></div>
        <span className={`dd-reward ${done ? 'on' : ''}`}>{done ? t.after : t.before}</span>
        <div className={`dd-toast ${step === 5 ? 'on' : ''}`}>+35 {t.toast}</div>
      </div>
      <DemoCursor host={ref} beat={step} />
    </div>
  );
}
