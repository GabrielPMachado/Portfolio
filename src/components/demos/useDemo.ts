import { useEffect, useRef, useState, type RefObject } from 'react';

/** Cycles through `steps` (durations in ms) while the element is on screen.
 *  With reduced motion it parks on `restStep` and never moves. */
export function useSteps(ref: RefObject<HTMLElement | null>, steps: number[], restStep = steps.length - 1) {
  const [step, setStep] = useState(0);
  const [reduced, setReduced] = useState(false);
  const visible = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    if (mq.matches) { setStep(restStep); return; }
    const el = ref.current;
    if (!el) return;
    let timer = 0;
    let current = 0;
    const run = () => {
      timer = window.setTimeout(() => {
        current = (current + 1) % steps.length;
        setStep(current);
        if (visible.current) run();
      }, steps[current]);
    };
    const io = new IntersectionObserver(([e]) => {
      const was = visible.current;
      visible.current = e.isIntersecting;
      if (e.isIntersecting && !was) run();
      if (!e.isIntersecting) window.clearTimeout(timer);
    }, { threshold: 0.25 });
    io.observe(el);
    return () => { io.disconnect(); window.clearTimeout(timer); };
  }, []);

  return { step, reduced };
}

/** Calls `tick` on an interval while visible; never with reduced motion. */
export function useTicker(ref: RefObject<HTMLElement | null>, ms: number, tick: () => void) {
  const fn = useRef(tick);
  fn.current = tick;
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const el = ref.current;
    if (!el) return;
    let id = 0;
    const io = new IntersectionObserver(([e]) => {
      window.clearInterval(id);
      if (e.isIntersecting) id = window.setInterval(() => fn.current(), ms);
    }, { threshold: 0.25 });
    io.observe(el);
    return () => { io.disconnect(); window.clearInterval(id); };
  }, [ms]);
}
