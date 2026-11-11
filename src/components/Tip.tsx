// One floating tooltip for every chart. Tooltips add detail; they never hold the only copy of a value.
import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface TipState { content: ReactNode; x: number; y: number }
interface TipApi {
  show(content: ReactNode, ev: { clientX: number; clientY: number } | Element): void;
  hide(): void;
}
const TipContext = createContext<TipApi>({ show() {}, hide() {} });

export function TipProvider({ children }: { children: ReactNode }) {
  const [tip, setTip] = useState<TipState | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const show = useCallback<TipApi["show"]>((content, at) => {
    if (at instanceof Element) {
      const r = at.getBoundingClientRect();
      setTip({ content, x: r.left + r.width / 2, y: r.top });
    } else setTip({ content, x: at.clientX, y: at.clientY });
  }, []);
  const hide = useCallback(() => setTip(null), []);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !tip) return;
    const { width, height } = el.getBoundingClientRect();
    const pad = 12;
    let left = tip.x + 14;
    let top = tip.y - height - 14;
    if (left + width > window.innerWidth - pad) left = tip.x - width - 14;
    if (left < pad) left = pad;
    if (top < pad) top = tip.y + 18;
    el.style.left = `${Math.round(left)}px`;
    el.style.top = `${Math.round(top)}px`;
  }, [tip]);
  return (
    <TipContext.Provider value={{ show, hide }}>
      {children}
      {tip && createPortal(<div className="tip" role="tooltip" ref={ref}>{tip.content}</div>, document.body)}
    </TipContext.Provider>
  );
}

export const useTip = () => useContext(TipContext);
