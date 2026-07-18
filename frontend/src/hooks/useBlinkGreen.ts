import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function useBlinkGreen() {
  const [blinkSquare, setBlinkSquare] = useState<string | null>(null);
  const [blinkOpacity, setBlinkOpacity] = useState(0);

  const blinkTimerRef = useRef<number | null>(null);
  const blinkRafRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;

      if (blinkTimerRef.current) window.clearTimeout(blinkTimerRef.current);
      blinkTimerRef.current = null;

      if (blinkRafRef.current) cancelAnimationFrame(blinkRafRef.current);
      blinkRafRef.current = null;
    };
  }, []);

  const blinkGreen = useCallback((uci: string, times = 3) => {
    const toSquare = uci.slice(2, 4);
    if (!toSquare) return;

    if (blinkTimerRef.current) window.clearTimeout(blinkTimerRef.current);
    if (blinkRafRef.current) cancelAnimationFrame(blinkRafRef.current);

    setBlinkSquare(toSquare);

    const fadeInMs = 120;
    const holdMs = 120;
    const fadeOutMs = 180;
    const cycleMs = fadeInMs + holdMs + fadeOutMs;

    const totalMs = times * cycleMs;
    const start = performance.now();

    const tick = (now: number) => {
      const t = now - start;

      if (t >= totalMs) {
        if (isMountedRef.current) {
          setBlinkOpacity(0);
          setBlinkSquare(null);
        }
        return;
      }

      const within = t % cycleMs;

      let o = 0;
      if (within <= fadeInMs) o = within / fadeInMs;
      else if (within <= fadeInMs + holdMs) o = 1;
      else {
        const outT = within - (fadeInMs + holdMs);
        o = 1 - outT / fadeOutMs;
      }

      if (isMountedRef.current) {
        setBlinkOpacity(Math.max(0, Math.min(1, o)));
      }

      blinkRafRef.current = requestAnimationFrame(tick);
    };

    blinkRafRef.current = requestAnimationFrame(tick);

    blinkTimerRef.current = window.setTimeout(() => {
      if (!isMountedRef.current) return;
      setBlinkOpacity(0);
      setBlinkSquare(null);
    }, totalMs + 50);
  }, []);

  const squareStyles = useMemo(() => {
    if (!blinkSquare) return undefined;

    return {
      [blinkSquare]: {
        background: `rgba(0, 255, 0, ${0.08 + 0.35 * blinkOpacity})`,
        boxShadow: `inset 0 0 0 4px rgba(0, 200, 0, ${0.15 + 0.55 * blinkOpacity})`,
        borderRadius: "2px",
      },
    };
  }, [blinkSquare, blinkOpacity]);

  return { blinkSquare, blinkOpacity, blinkGreen, squareStyles };
}
