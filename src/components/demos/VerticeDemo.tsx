import { useRef } from 'react';
import { useSteps } from './useDemo';

type Props = { lang: 'pt' | 'en' };

const models = {
  pt: ['Restaurante', 'Clínica', 'Academia', 'Imobiliária', 'Estúdio'],
  en: ['Restaurant', 'Clinic', 'Gym', 'Real estate', 'Studio'],
};
const colors = ['#22D3EE', '#1E8BFF', '#8B5CF6', '#EC4899', '#34D399'];

// five templates on a ring; the indicator always takes the active template's color
export default function VerticeDemo({ lang }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { step } = useSteps(ref, [1800, 1800, 1800, 1800, 1800], 0);
  const names = models[lang];
  return (
    <div ref={ref} className="demo demo-vertice" aria-hidden="true">
      <div className="vx-stage">
        <div className="vx-ring" style={{ transform: `translateZ(-260px) rotateY(${-step * 72}deg)` }}>
          {names.map((n, i) => (
            <div key={n} className={`vx-card ${i === step ? 'on' : ''}`} style={{ transform: `rotateY(${i * 72}deg) translateZ(260px)`, ['--c' as string]: colors[i], ['--c2' as string]: colors[(i + 1) % 5] }}>
              <div className="vx-hero" />
              <div className="vx-lines"><i /><i /><i /></div>
              <span>{n}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="vx-dots">
        {colors.map((c, i) => <i key={c} className={i === step ? 'on' : ''} style={{ background: i === step ? colors[step] : undefined }} />)}
      </div>
    </div>
  );
}
