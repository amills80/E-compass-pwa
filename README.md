# E-Compass

A home-screen web app (PWA) that helps non-verbal autistic kids find and share how they feel.
It starts with one question, *comfortable or uncomfortable?*, and goes deeper one step at a time
(body or feelings → where → what kind → how big). It ends with a feeling card the child can show
to a grown-up, an optional calm-down step, and a private on-device history for caregivers.

## Try it on iPhone / iPad

1. Open the Netlify URL in **Safari**.
2. Tap **Share → Add to Home Screen**.
3. Launch it from the home screen. It runs full screen and works offline after the first launch.

History is saved **only on that device**. Deleting the home-screen icon deletes the history.

**Grown-ups area:** press and hold **Grown-ups** on the first screen for 3 seconds.
With VoiceOver on, double-tap and hold.

## How it's built

| | |
|---|---|
| Stack | Preact + Vite + TypeScript, `vite-plugin-pwa` (Workbox) for offline |
| Content | `src/content/vocabulary.json`: every question, choice, sentence and calm-down step. Edit words here, not in code. |
| Flow engine | `src/flow.ts`: an immutable navigation stack, so **Back is an exact undo** |
| Storage | `src/storage.ts`: localStorage, on this device only |
| Updates | `src/updates.ts`: new versions download quietly and apply only on the start screen, never mid check-in |
| Hosting | Netlify (`netlify.toml`) |

## Accessibility (Section 508 / WCAG 2.2 AA)

- Text follows the iOS **Text Size** setting (Dynamic Type) via `font: -apple-system-body`. Layout tested at 200% with no sideways scrolling.
- Every screen announces its question to VoiceOver (focus moves to the heading).
- Tap targets ≥ 44pt (most are 64pt+). Single taps only, no swipes or drags. No timers.
- Color is never the only cue: words always carry the meaning, with icons on the first two questions.
- Light/dark mode, **Increase Contrast**, and **Reduce Motion** supported.
- Automated checks: axe-core on every screen, both device sizes, light and dark.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173 (use --host URL to open on a phone on the same Wi-Fi)
npm run build      # type-check + production build into dist/
npm run test:e2e   # Playwright + axe at iPhone SE (375×667) and iPad (820×1180)
```

## MVP decisions (Oct 2026)

- Tapping a choice moves on; **Back** undoes. No Next button.
- Icons only on the first two questions; words only for nuanced terms.
- No audio in the app (VoiceOver still works).
- No accounts, no sync, no analytics, no backup.
- One fixed vocabulary; caregiver customization comes later (the content file is built for it).
