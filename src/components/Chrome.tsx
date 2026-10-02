import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

interface ScreenProps {
  title: string;
  /** Visually hide the heading (it is still announced). */
  hideTitle?: boolean;
  onBack?: () => void;
  onHelp?: () => void;
  crumbs?: string[];
  tone?: 'comfortable' | 'uncomfortable' | 'neutral';
  variant?: 'default' | 'inverse';
  /** Changes on every navigation so focus moves to the new heading. */
  viewKey: string;
  children: ComponentChildren;
}

/**
 * Shared frame for every child-facing screen: Back always top-left,
 * Help always top-right, then the path chips, then one question.
 */
export function Screen({
  title,
  hideTitle,
  onBack,
  onHelp,
  crumbs,
  tone = 'neutral',
  variant = 'default',
  viewKey,
  children
}: ScreenProps) {
  const h1 = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    document.title = `${title} · E-Compass`;
    // Move focus to the heading so VoiceOver announces the new screen.
    h1.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [viewKey]);

  return (
    <div class={`screen tone-${tone} variant-${variant}`}>
      <header class="topbar">
        {onBack ? (
          <button type="button" class="btn-back" onClick={onBack}>
            <span aria-hidden="true">←</span> Back
          </button>
        ) : (
          <span class="topbar-spacer" />
        )}
        {onHelp && (
          <button type="button" class="btn-help" onClick={onHelp}>
            Help
          </button>
        )}
      </header>
      {crumbs && crumbs.length > 0 && (
        <ol class="crumbs" aria-label="My choices so far">
          {crumbs.map((c, i) => (
            <li key={i} class="chip">
              {c}
            </li>
          ))}
        </ol>
      )}
      <main class="content">
        <h1 ref={h1} tabIndex={-1} class={hideTitle ? 'sr-only' : 'q-title'}>
          {title}
        </h1>
        {children}
      </main>
    </div>
  );
}
