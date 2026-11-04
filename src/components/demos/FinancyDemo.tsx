import { useEffect, useRef, useState } from 'react';
import { useSteps } from './useDemo';
import DemoCursor from './DemoCursor';

type Props = { lang: 'pt' | 'en' };

// Labels mirror the real app: the QuickGlance panel and the native 6-step quick-entry overlay.
const copy = {
  pt: {
    balance: 'Saldo', inc: 'Entradas do mês', exp: 'Gastos do mês', quick: 'Lançamento rápido',
    step: (n: number) => `Etapa ${n} de 6`,
    qType: 'Qual é o tipo da transação?', types: ['Receita', 'Despesa', 'Investimento'],
    qValue: 'Qual é o valor?', qCat: 'Categoria', cats: ['Mercado', 'Transporte', 'Lazer', 'Contas'],
    qOk: 'Confirmar lançamento', go: 'Avançar', ok: 'Confirmar', today: 'Hoje',
    rows: [['iFood', 'Nubank', '- R$ 38,50'], ['Freela landing page', 'Pix', '+ R$ 1.200,00'], ['Uber', 'Mercado Pago', '- R$ 21,90']],
    newRow: ['Mercado', 'Pop-up', '- R$ 42,90'],
  },
  en: {
    balance: 'Balance', inc: 'In this month', exp: 'Spent this month', quick: 'Quick entry',
    step: (n: number) => `Step ${n} of 6`,
    qType: 'What kind of transaction?', types: ['Income', 'Expense', 'Investment'],
    qValue: 'How much?', qCat: 'Category', cats: ['Groceries', 'Transport', 'Leisure', 'Bills'],
    qOk: 'Confirm entry', go: 'Next', ok: 'Confirm', today: 'Today',
    rows: [['iFood', 'Nubank', '- R$ 38,50'], ['Landing page gig', 'Pix', '+ R$ 1.200,00'], ['Uber', 'Mercado Pago', '- R$ 21,90']],
    newRow: ['Groceries', 'Pop-up', '- R$ 42,90'],
  },
};

// dashboard → quick entry → type → amount → category → confirm → row lands on the dashboard
export default function FinancyDemo({ lang }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { step } = useSteps(ref, [1500, 900, 1300, 1600, 1200, 1100, 2600], 6);
  const t = copy[lang];
  // the phone is drawn at a fixed 240×480 and scaled to fit whatever height the case visual has
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setScale(Math.min(1.1, (e.contentRect.height - 24) / 490)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const saved = step === 6;
  const overlay = step >= 2 && step <= 5;
  const stage = step - 1; // 1..4 inside the overlay
  const amount = step === 3 ? 'R$ 42,9' : step > 3 ? 'R$ 42,90' : 'R$ 0,00';
  const rows = saved ? [t.newRow, ...t.rows.slice(0, 2)] : t.rows;
  return (
    <div ref={ref} className="demo demo-financy" aria-hidden="true">
      <div className="fy-phone" style={{ transform: `translate(-50%, -50%) scale(${scale})` }}>
        <div className="fy-notch" />
        <div className="fy-app">
          <span className="fy-k">{t.balance}</span>
          <strong className="fy-bal">{saved ? 'R$ 3.439,20' : 'R$ 3.482,10'}</strong>
          <div className="fy-two">
            <div><span className="fy-in">↗ {t.inc}</span><b>R$ 5.850,00</b></div>
            <div><span className="fy-out">↘ {t.exp}</span><b>{saved ? 'R$ 2.410,80' : 'R$ 2.367,90'}</b></div>
          </div>
          <ul className="fy-rows">
            {rows.map(([d, src, v], i) => (
              <li key={d} className={saved && i === 0 ? 'new' : ''}>
                <span><b>{d}</b><small>{src}</small></span>
                <em className={v.startsWith('+') ? 'pos' : ''}>{v}</em>
              </li>
            ))}
          </ul>
          <span className={`fy-quick ${step === 1 ? 'press' : ''}`} data-hot={step <= 1 ? '' : undefined}>+ {t.quick}</span>
        </div>
        <div className={`fy-sheet ${overlay ? 'on' : ''}`}>
          <div className="fy-prog"><i style={{ width: `${(step >= 5 ? 6 : Math.max(1, stage)) / 6 * 100}%` }} /></div>
          <span className="fy-k">{t.step(step >= 5 ? 6 : Math.max(1, stage))}</span>
          {step <= 2 && (
            <>
              <strong className="fy-q">{t.qType}</strong>
              <div className="fy-opts">
                {t.types.map((o, i) => <span key={o} className={i === 1 ? 'pick' : ''} data-hot={step === 2 && i === 1 ? '' : undefined}>{o}</span>)}
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <strong className="fy-q">{t.qValue}</strong>
              <strong className="fy-amount" data-hot="">{amount}<i className="caret" /></strong>
            </>
          )}
          {step === 4 && (
            <>
              <strong className="fy-q">{t.qCat}</strong>
              <div className="fy-chips">
                {t.cats.map((c, i) => <span key={c} className={i === 0 ? 'pick' : ''} data-hot={i === 0 ? '' : undefined}>{c}</span>)}
              </div>
            </>
          )}
          {step >= 5 && (
            <>
              <strong className="fy-q">{t.qOk}</strong>
              <div className="fy-sum"><span>{t.newRow[0]} · {t.today}</span><b>R$ 42,90</b></div>
              <span className="fy-ok" data-hot={step === 5 ? '' : undefined}>{t.ok}</span>
            </>
          )}
        </div>
      </div>
      <DemoCursor host={ref} beat={step} />
    </div>
  );
}
