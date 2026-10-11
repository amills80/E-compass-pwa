import type { IconName } from '../content/types';

// Simple, literal line icons for the first question only, where pictures
// generalize well. Decorative: the visible word is the accessible name.
const eyes = (
  <>
    <circle cx="23.5" cy="27" r="2.5" fill="currentColor" stroke="none" />
    <circle cx="40.5" cy="27" r="2.5" fill="currentColor" stroke="none" />
  </>
);

const paths: Record<IconName, preact.JSX.Element> = {
  good: (
    <>
      <circle cx="32" cy="32" r="24" />
      {eyes}
      <path d="M21 37c3 5 7 7.5 11 7.5s8-2.5 11-7.5" />
    </>
  ),
  calm: (
    <>
      <circle cx="32" cy="32" r="24" />
      <path d="M20 27.5c1.6 1.6 5.4 1.6 7 0M37 27.5c1.6 1.6 5.4 1.6 7 0" />
      <path d="M24 40h16" />
    </>
  ),
  notgood: (
    <>
      <circle cx="32" cy="32" r="24" />
      {eyes}
      <path d="M21 43c2.5-2.5 5-2.5 7.5 0s5 2.5 7.5 0 5-2.5 7.5 0" />
    </>
  ),
  // Raised hand, for "I need help".
  hand: (
    <path d="M21 35V15a4 4 0 0 1 8 0v14M29 27V11a4 4 0 0 1 8 0v18M37 28V15a4 4 0 0 1 8 0v20c0 11-7 21-18 21-8 0-12-4-16-11l-5-9a4 4 0 0 1 6.5-4.5L21 38" />
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
