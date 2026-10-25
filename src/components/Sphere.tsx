import { vocab, type SpherePoint } from '../flow';

interface Props {
  point: SpherePoint;
  /** Plain-language position for screen readers. */
  description: string;
  /** Breathing mode: the sphere breathes and the dot drifts home to calm. */
  homeward?: boolean;
  paused?: boolean;
  /** Reduce Motion: 0–4 steps taken toward the center instead of a drift. */
  step?: number;
}

const R = 50;

/**
 * The emotion sphere, shown above the buttons. It only reflects answers;
 * it is never tapped. The dot is the child: center = calm, up/down = half,
 * direction = family, distance = size. The instance persists between
 * screens so the dot glides from answer to answer.
 */
export function Sphere({ point, description, homeward = false, paused = false, step }: Props) {
  const rad = ((point.angle - 90) * Math.PI) / 180;
  let x = 0;
  let y = 0;
  if (point.view === 'side') {
    y = point.half === 'good' ? -point.dist * R : point.half === 'notgood' ? point.dist * R : 0;
  } else {
    x = Math.cos(rad) * point.dist * R;
    y = Math.sin(rad) * point.dist * R;
  }
  if (step !== undefined) {
    const k = 1 - Math.min(step, 4) / 4;
    x *= k;
    y *= k;
  }
  const families = point.half ? vocab.halves[point.half].families : [];
  const d = R / Math.SQRT2;
  // Wedge for a family centred on its angle, 90° wide.
  const wedge = (angle: number) => {
    const a0 = ((angle - 135) * Math.PI) / 180;
    const a1 = ((angle - 45) * Math.PI) / 180;
    return `M0 0L${Math.cos(a0) * R} ${Math.sin(a0) * R}A${R} ${R} 0 0 1 ${Math.cos(a1) * R} ${Math.sin(a1) * R}Z`;
  };
  const dotStyle = homeward && step === undefined
    ? { '--dx': `${x}px`, '--dy': `${y}px` }
    : { transform: `translate(${x}px, ${y}px)` };

  return (
    <div class={`sphere ${homeward && step === undefined ? 'is-homeward' : ''} ${paused ? 'is-paused' : ''}`}>
      <svg viewBox="-60 -60 120 120" aria-hidden="true" focusable="false">
        <g class="sphere-body">
          {/* Side view: which half */}
          <g class={`sphere-layer ${point.view === 'side' ? 'is-on' : ''}`}>
            <path d={`M${-R} 0A${R} ${R} 0 0 1 ${R} 0Z`} class={`half half-good ${point.half === 'good' ? 'is-picked' : ''}`} />
            <path d={`M${-R} 0A${R} ${R} 0 0 0 ${R} 0Z`} class={`half half-notgood ${point.half === 'notgood' ? 'is-picked' : ''}`} />
            <line x1={-R} x2={R} y1="0" y2="0" class="sphere-line" />
          </g>
          {/* Top view of the chosen half: families around, size outward */}
          <g class={`sphere-layer ${point.view === 'top' ? 'is-on' : ''}`}>
            {families.map((f) => (
              <path
                key={f.id}
                d={wedge(f.angle)}
                class={`wedge ${point.hue === f.hue ? 'is-picked' : ''}`}
                style={{ fill: `var(--c-${f.hue}-${point.hue === f.hue ? 'fill3' : 'fill2'})` }}
              />
            ))}
            <circle r={R * 0.56} class="sphere-ring" />
            <circle r={R * 0.79} class="sphere-ring" />
            <line x1={-d} y1={-d} x2={d} y2={d} class="sphere-line" />
            <line x1={d} y1={-d} x2={-d} y2={d} class="sphere-line" />
          </g>
          <circle r={R} class="sphere-edge" />
        </g>
        {point.calm && <circle r="13" class="calm-glow" />}
        <circle r="2.2" class="sphere-center" />
        <g class="sphere-dot" style={dotStyle}>
          <circle r="6" />
        </g>
      </svg>
      <p class="sr-only">
        {description}
      </p>
    </div>
  );
}
