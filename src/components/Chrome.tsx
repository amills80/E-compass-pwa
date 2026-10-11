import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { Icon } from './Icon';

export interface Crumb {
  label: string;
  /** Jump back to the question where this was chosen. */
  onSelect: () => void;
}

interface ScreenProps {
  title: string;
  /** Visually hide the heading (it is still announced). */
  hideTitle?: boolean;
  onBack?: () => void;
  onHelp?: () => void;
  crumbs?: Crumb[];
  tone?: 'comfortable' | 'uncomfortable' | 'neutral';
  variant?: 'default' | 'inverse';
  /** A quiet status line above the heading, e.g. "Saved." */
  notice?: string;
  /** Changes on every navigation so focus moves to the new heading. */
  viewKey: string;
  /** Persistent visual above the question (the sphere). */
  visual?: ComponentChildren;
  /** Direction of travel, for the gentle slide (fade with Reduce Motion). */
  dir?: 'fwd' | 'back';
  children: ComponentChildren;
}

/**
 * Shared frame for every child-facing screen: Back always top-left,
 * "I need help" always top-right, then the path so far, then one question.
 */
export function Screen({
  title,
  hideTitle,
  onBack,
  onHelp,
  crumbs,
  tone = 'neutral',
  variant = 'default',
  notice,
  viewKey,
  visual,
  dir = 'fwd',
  children
}: ScreenProps) {
  const h1 = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    document.title = `${title} · E-Feels`;
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
            <Icon name="hand" size={22} />
            I need help
          </button>
        )}
      </header>
      {crumbs && crumbs.length > 0 && (
        <ol class="crumbs" aria-label="My choices so far">
          {crumbs.map((c, i) => (
            <li key={i}>
              <button type="button" class="chip" aria-label={`Go back to ${c.label}`} onClick={c.onSelect}>
                {c.label}
              </button>
            </li>
          ))}
        </ol>
      )}
      {visual && <div class="visual">{visual}</div>}
      <main class={`content enter-${dir}`} key={viewKey}>
        {notice && (
          <p class="notice" role="status">
            {notice}
          </p>
        )}
        <h1 ref={h1} tabIndex={-1} class={hideTitle ? 'sr-only' : 'q-title'}>
          {title}
        </h1>
        {children}
      </main>
    </div>
  );
}
