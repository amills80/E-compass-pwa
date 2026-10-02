import type { IconName } from '../content/types';

// Simple, literal line icons. Decorative: the visible word next to each icon
// is the accessible name, so icons are hidden from VoiceOver.
const paths: Record<IconName, preact.JSX.Element> = {
  comfortable: (
    <>
      <circle cx="32" cy="32" r="24" />
      <circle cx="23.5" cy="27" r="2.5" fill="currentColor" stroke="none" />
      <circle cx="40.5" cy="27" r="2.5" fill="currentColor" stroke="none" />
      <path d="M21 37c3 5 7 7.5 11 7.5s8-2.5 11-7.5" />
    </>
  ),
  uncomfortable: (
    <>
      <circle cx="32" cy="32" r="24" />
      <circle cx="23.5" cy="27" r="2.5" fill="currentColor" stroke="none" />
      <circle cx="40.5" cy="27" r="2.5" fill="currentColor" stroke="none" />
      <path d="M21 43c2.5-2.5 5-2.5 7.5 0s5 2.5 7.5 0 5-2.5 7.5 0" />
    </>
  ),
  body: (
    <>
      <circle cx="32" cy="12" r="6" />
      <path d="M32 19v20" />
      <path d="M18 27l14-4 14 4" />
      <path d="M32 39l-9 17" />
      <path d="M32 39l9 17" />
    </>
  ),
  feelings: (
    <path d="M32 52S10 39 10 24.5C10 17.6 15.4 12 22 12c4.3 0 8 2.3 10 5.8C34 14.3 37.7 12 42 12c6.6 0 12 5.6 12 12.5C54 39 32 52 32 52z" />
  ),
  both: (
    <>
      <circle cx="32" cy="9.5" r="5.5" />
      <path d="M20 22c3-3 7-4.5 12-4.5s9 1.5 12 4.5v14c0 2-1.5 3-3 3H23c-1.5 0-3-1-3-3V22z" />
      <path d="M26 39l-4 16" />
      <path d="M38 39l4 16" />
      <path d="M32 34.5s-6.5-3.8-6.5-8c0-2 1.6-3.6 3.5-3.6 1.3 0 2.4.7 3 1.7.6-1 1.7-1.7 3-1.7 1.9 0 3.5 1.6 3.5 3.6 0 4.2-6.5 8-6.5 8z" fill="currentColor" stroke="none" />
    </>
  )
};

export function Icon({ name, size = 56 }: { name: IconName; size?: number }) {
  return (
    <svg
      class="icon"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      stroke-width="3"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  );
}
