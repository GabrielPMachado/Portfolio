import { useRef } from 'react';
import { useSteps } from './useDemo';
import DemoCursor from './DemoCursor';

type Props = { lang: 'pt' | 'en' };

// Quick capture from the real app (src/lib/parse.ts): the sentence is typed in parts,
// each part pops out as a chip, then the task lands on "Today" and the day ring fills.
const copy = {
  pt: {
    today: 'Hoje', date: 'Segunda, 16 nov', ph: 'Capturar algo…',
    parts: ['pagar boleto', ' amanhã 15h', ' #casa', ' !alta'],
    chips: ['Amanhã · 15:00', '#casa', 'Alta'], add: 'Adicionar',
    tasks: ['Revisar PR do Financy', 'Treino B · Academia'], newTask: 'Pagar boleto',
    habits: 'Hábitos', day: 'do dia', mods: ['Tarefas', 'Hábitos', 'Finanças', 'Saúde'],
  },
  en: {
    today: 'Today', date: 'Monday, Nov 16', ph: 'Capture something…',
    parts: ['pay bill', ' tomorrow 3pm', ' #home', ' !high'],
    chips: ['Tomorrow · 3:00 PM', '#home', 'High'], add: 'Add',
    tasks: ['Review Financy PR', 'Workout B · Gym'], newTask: 'Pay bill',
    habits: 'Habits', day: 'of the day', mods: ['Tasks', 'Habits', 'Finance', 'Health'],
  },
};
const ACCENT = '#F2415A';

export default function OrbitaDemo({ lang }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { step } = useSteps(ref, [900, 800, 800, 700, 900, 900, 2800], 6);
  const t = copy[lang];
  const typed = step >= 6 ? 0 : Math.min(step, 4);
  const added = step >= 6;
  const pct = added ? 75 : 60;
  const r = 15.9;
  return (
    <div ref={ref} className="demo demo-orbita" aria-hidden="true" style={{ ['--a' as string]: ACCENT }}>
      <div className="ob-phone">
        <div className="ob-top">
          <div><strong>{t.today}</strong><span>{t.date}</span></div>
          <svg viewBox="0 0 36 36" className="ob-ring">
            <circle cx="18" cy="18" r={r} />
            <circle cx="18" cy="18" r={r} className="on" strokeDasharray={`${pct} 100`} />
            <text x="18" y="21">{pct}%</text>
          </svg>
        </div>
        <div className={`ob-cap ${step >= 1 && step <= 5 ? 'focus' : ''}`} data-hot={step === 0 ? '' : undefined}>
          <span className={typed ? '' : 'ph'}>{typed ? t.parts.slice(0, typed).join('') : t.ph}</span>
          {typed > 0 && typed < 4 && <i className="ob-caret" />}
        </div>
        <div className="ob-chips">
          {t.chips.map((c, i) => <span key={c} className={`ob-chip ${typed >= i + 2 ? 'on' : ''} ${i === 2 ? 'hi' : ''}`}>{c}</span>)}
          <span className={`ob-add ${step === 5 ? 'press' : ''}`} data-hot={step === 5 ? '' : undefined}>{t.add}</span>
        </div>
        <ul className="ob-list">
          <li className={`new ${added ? 'on' : ''}`} data-hot={added ? '' : undefined}><i className="hi" /><span>{t.newTask}</span><small>{t.chips[0]}</small></li>
          {t.tasks.map((x, i) => <li key={x} className="on"><i className={i === 0 ? 'done' : ''} /><span className={i === 0 ? 'done' : ''}>{x}</span></li>)}
        </ul>
      </div>
      <div className="ob-mods">
        <span className="ob-k">{t.habits}</span>
        <div className="ob-week">{[1, 1, 1, 0, 1, 1, added ? 1 : 0].map((d, i) => <i key={i} className={d ? 'on' : ''} />)}</div>
        <span className="ob-k">{lang === 'pt' ? 'Módulos' : 'Modules'}</span>
        {t.mods.map((m, i) => <span key={m} className="ob-mod"><span>{m}</span><b className={i !== 3 || added ? 'on' : ''} /></span>)}
      </div>
      <DemoCursor host={ref} beat={step} />
    </div>
  );
}
