import { useEffect, useRef, useState } from 'preact/hooks';

interface Props {
  label: string;
  durationMs?: number;
  onComplete: () => void;
}

/**
 * Press-and-hold gate for grown-up areas. Works with touch, mouse,
 * keyboard (hold Space/Enter) and VoiceOver (double-tap and hold).
 * A visible fill shows progress so adults know to keep holding.
 */
export function HoldButton({ label, durationMs = 3000, onComplete }: Props) {
  const [progress, setProgress] = useState(0);
  const start = useRef<number | null>(null);
  const raf = useRef<number | null>(null);

  const stop = () => {
    start.current = null;
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
    setProgress(0);
  };

  const tick = (t: number) => {
    if (start.current === null) return;
    const p = Math.min(1, (t - start.current) / durationMs);
    setProgress(p);
    if (p >= 1) {
      stop();
      onComplete();
      return;
    }
    raf.current = requestAnimationFrame(tick);
  };

  const begin = () => {
    if (start.current !== null) return;
    start.current = performance.now();
    raf.current = requestAnimationFrame(tick);
  };

  useEffect(() => stop, []);

  const seconds = Math.round(durationMs / 1000);
  return (
    <button
      type="button"
      class="hold-btn"
      aria-label={`${label}. Press and hold for ${seconds} seconds.`}
      onPointerDown={(e) => {
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
        begin();
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onPointerLeave={stop}
      onKeyDown={(e) => {
        if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
          e.preventDefault();
          begin();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === ' ' || e.key === 'Enter') stop();
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span class="hold-fill" style={{ transform: `scaleX(${progress})` }} aria-hidden="true" />
      <span class="hold-label">{progress > 0 ? 'Keep holding…' : label}</span>
    </button>
  );
}
