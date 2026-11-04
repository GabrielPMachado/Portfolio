import { useRef } from 'react';
import { useSteps } from './useDemo';
import DemoCursor from './DemoCursor';

type Props = { lang: 'pt' | 'en' };

// The five real templates of O Vértice, with their own palette and type.
const templates = [
  { name: 'Moraes & Vale', pt: 'Jurídico empresarial', en: 'Corporate law', bg: '#f7f4ee', ink: '#14213d', accent: '#b9925e', serif: true,
    h: { pt: 'Estratégia jurídica para decisões de alto impacto.', en: 'Legal strategy for high-impact decisions.' }, cta: { pt: 'Solicitar análise', en: 'Request review' } },
  { name: 'Aurora Derm', pt: 'Estética e saúde', en: 'Aesthetics & health', bg: '#fbf1f2', ink: '#3b2329', accent: '#be6f82', serif: true,
    h: { pt: 'Cuidado de pele com ciência e leveza.', en: 'Skin care with science and ease.' }, cta: { pt: 'Agendar avaliação', en: 'Book a visit' } },
  { name: 'Brasa Norte', pt: 'Steakhouse e restaurante casual', en: 'Steakhouse', bg: '#17110d', ink: '#f7ead9', accent: '#d9480f', serif: false,
    h: { pt: 'Fogo alto, corte certo, mesa cheia.', en: 'High fire, right cut, full table.' }, cta: { pt: 'Reservar mesa', en: 'Book a table' } },
  { name: 'Impulso Fit', pt: 'Academia e planos', en: 'Gym & plans', bg: '#0d0d0f', ink: '#f5f5f4', accent: '#facc15', serif: false,
    h: { pt: 'Treine com método. Evolua todo mês.', en: 'Train with a method. Grow every month.' }, cta: { pt: 'Ver planos', en: 'See plans' } },
  { name: 'Nexo Prime', pt: 'Consultoria empresarial', en: 'Business consulting', bg: '#f4f8f7', ink: '#0f2f2b', accent: '#2dd4bf', serif: false,
    h: { pt: 'Consultoria para organizar números e processos.', en: 'Consulting to sort numbers and processes.' }, cta: { pt: 'Falar com especialista', en: 'Talk to an expert' } },
];

// five templates on a 3D ring; name, niche and indicator follow the active template's accent
export default function VerticeDemo({ lang }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { step } = useSteps(ref, [2200, 2200, 2200, 2200, 2200], 0);
  const cur = templates[step];
  return (
    <div ref={ref} className="demo demo-vertice" aria-hidden="true">
      <div className="vx-stage">
        <div className="vx-ring" style={{ transform: `translateZ(-320px) rotateY(${-step * 72}deg)` }}>
          {templates.map((m, i) => (
            <div key={m.name} className={`vx-card ${i === step ? 'on' : ''}`} style={{ transform: `rotateY(${i * 72}deg) translateZ(320px)`, ['--bg' as string]: m.bg, ['--ink' as string]: m.ink, ['--c' as string]: m.accent }}>
              <div className="vx-nav"><b className={m.serif ? 'serif' : ''}>{m.name}</b><i /><i /><i /></div>
              <span className="vx-kick">{m[lang]}</span>
              <strong className={`vx-h ${m.serif ? 'serif' : ''}`}>{m.h[lang]}</strong>
              <span className="vx-cta">{m.cta[lang]}</span>
              <div className="vx-img" />
            </div>
          ))}
        </div>
      </div>
      <div className="vx-meta" style={{ ['--c' as string]: cur.accent }}>
        <b>{cur.name}</b><span>·</span><small>{cur[lang]}</small>
      </div>
      <div className="vx-dots">
        {templates.map((m, i) => <i key={m.name} className={i === step ? 'on' : ''} data-hot={i === (step + 1) % 5 ? '' : undefined} style={{ background: m.accent, opacity: i === step ? 1 : 0.55 }} />)}
      </div>
      <DemoCursor host={ref} beat={step} />
    </div>
  );
}
