import { useEffect, useRef, useState, type RefObject } from 'react';

/** One calm cursor that uses the demo like a person would: it glides to whatever element
 *  is marked `data-hot`, hovers it, and clicks. `beat` changes whenever the demo moves on. */
export default function DemoCursor({ host, beat }: { host: RefObject<HTMLElement | null>; beat: unknown }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [click, setClick] = useState(0);
  const first = useRef(true);
  useEffect(() => {
    const root = host.current;
    const hot = root?.querySelector<HTMLElement>('[data-hot]');
    if (!root || !hot) return;
    const a = root.getBoundingClientRect(), b = hot.getBoundingClientRect();
    if (!a.width) return;
    // aim a little inside the element, like a real pointer, not dead center
    setPos({ x: ((b.left - a.left + b.width * 0.55) / a.width) * 100, y: ((b.top - a.top + b.height * 0.6) / a.height) * 100 });
    if (first.current) { first.current = false; return; }
    const id = window.setTimeout(() => setClick((c) => c + 1), 720); // click once it arrives
    return () => window.clearTimeout(id);
  }, [beat]);
  if (!pos) return null;
  return (
    <span className="dc" style={{ left: `${pos.x}%`, top: `${pos.y}%` }} aria-hidden="true">
      <span key={click} className={click ? 'dc-click' : ''} />
      <svg width="18" height="22" viewBox="0 0 18 22"><path d="M1.5 1.5v16.2l4.3-4.1 2.9 6.6 3-1.3-2.9-6.5h6z" fill="#fff" stroke="#09090b" strokeWidth="1.4" strokeLinejoin="round" /></svg>
    </span>
  );
}
