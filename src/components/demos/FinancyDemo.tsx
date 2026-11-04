import { useRef } from 'react';
import { useSteps } from './useDemo';

type Props = { lang: 'pt' | 'en' };

const copy = {
  pt: { shade: 'Configurações rápidas', tile: 'Financy', title: 'Novo gasto', place: 'Mercado · Cartão', saved: 'Salvo', app: 'Outro app aberto' },
  en: { shade: 'Quick settings', tile: 'Financy', title: 'New expense', place: 'Groceries · Card', saved: 'Saved', app: 'Another app open' },
};

// other app → quick settings tile → floating bubble → quick entry → saved
export default function FinancyDemo({ lang }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { step } = useSteps(ref, [1400, 1300, 1100, 1900, 1500], 4);
  const t = copy[lang];
  const amount = step >= 3 ? (step === 3 ? 'R$ 42,9' : 'R$ 42,90') : 'R$ 0,00';
  return (
    <div ref={ref} className="demo demo-financy" aria-hidden="true">
      <div className="fy-phone">
        <div className="fy-notch" />
        <div className="fy-app">
          <span className="fy-app-label">{t.app}</span>
          {[0, 1, 2, 3].map((i) => <div key={i} className="fy-row" />)}
        </div>
        <div className={`fy-shade ${step === 1 ? 'on' : ''}`}>
          <span className="fy-shade-title">{t.shade}</span>
          <div className="fy-tiles">
            <div className="fy-tile" /><div className="fy-tile" />
            <div className="fy-tile hot"><span>R$</span>{t.tile}</div>
            <div className="fy-tile" />
          </div>
        </div>
        <div className={`fy-bubble ${step >= 2 ? 'on' : ''}`}>R$</div>
        <div className={`fy-panel ${step >= 3 ? 'on' : ''}`}>
          <span className="mono fy-k">{t.title}</span>
          <strong className="fy-amount">{amount}<i className={step === 3 ? 'caret' : ''} /></strong>
          <span className="fy-place">{t.place}</span>
          <span className={`fy-saved ${step === 4 ? 'on' : ''}`}>✓ {t.saved}</span>
        </div>
      </div>
      <span className="demo-cursor" style={{ left: step === 1 ? '52%' : step === 2 ? '74%' : '62%', top: step === 1 ? '28%' : step === 2 ? '46%' : '78%' }} />
    </div>
  );
}
