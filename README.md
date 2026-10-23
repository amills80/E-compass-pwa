# E-Feels

(Formerly E-Compass. Saved data still uses `ecompass.*` keys so existing history is kept.)

A home-screen web app (PWA) that helps non-verbal autistic kids find and share how they feel.
Every feeling is a point on an **emotion sphere**: *Good · Calm · Not good* picks the half (calm is
the center), the feeling family picks the direction, and the size ladder picks the distance from calm.
The child can then add causes, one at a time, until they say *That's all*. The result is one honest
sentence — "I feel annoyed because my head hurts and it's too loud." — on a card they can show a
grown-up, an optional calm-down step (the dot floats home to calm), and a private on-device history.
A quiet **Explore feelings** link below the answers lets a child browse feelings and what each can
be like in the body, then start a check-in from one with **I feel this now**.

Design spec: *E-Compass Design Spec: Emotion Sphere & Calm Flow* (Claude doc; written before the E-Feels rename).

## Try it on iPhone / iPad

1. Open the Netlify URL in **Safari**.
2. Tap **Share → Add to Home Screen**.
3. Launch it from the home screen. It runs full screen and works offline after the first launch.

History is saved **only on that device**. Deleting the home-screen icon deletes the history.

**Grown-ups area:** press and hold **Grown-ups** on the first screen for 3 seconds.
With VoiceOver on, double-tap and hold. It holds About E-Feels, the check-in history, **Preferences**
(turn the welcome screen back on, or reset preferences without touching history), and
Add to Home Screen steps.

**Welcome screen:** shown on first launch only. Grown-ups can turn it back on.
In a Safari tab (not yet on the Home Screen) it also shows Add to Home Screen steps.

**Saving:** a check-in is saved as soon as the feeling card appears (or a calm-down starts, or
the child opens **I need help**). Later steps update the same entry, so Back never makes duplicates
and a card shown to a grown-up is never lost.

## How it's built

| | |
|---|---|
| Stack | Preact + Vite + TypeScript, `vite-plugin-pwa` (Workbox) for offline |
| Content | `src/content/vocabulary.json`: halves, feeling families (hue, size ladder, flavor words), causes with their sentence phrases and safety flag, calm-down steps. Edit words here, not in code. |
| Flow engine | `src/flow.ts`: an immutable navigation stack, so **Back is an exact undo**; sentence builder; sphere position |
| Sphere | `src/components/Sphere.tsx`: reflects answers only (never tapped); persists between screens so the dot glides |
| Explore | `src/Explore.tsx`: browse feelings by the check-in's own path. Body signals live in `vocabulary.json` under `explore` (`draft: true` until reviewed); signals are not causes. |
| Storage | `src/storage.ts` (check-ins) and `src/prefs.ts` (preferences), both localStorage on this device only, kept separate |
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

## Decisions (Oct 2026)

- v0.5 (branch `home-explore`): home is the check-in's first question. **Explore feelings** is a quiet link below the answers and in the "I'm not sure" menu. Feeling pages show body signals (draft, awaiting OT/SLP review) and what can help; **I feel this now** starts a check-in with that feeling chosen. Browsing is never saved. About moved to Grown-ups.
- v0.4: emotion sphere; first question Good · Calm · Not good ("Not good" over "Bad"); feeling first; body states are causes; causes repeat via "Anything else?" (four per screen, "More choices"); safety cause opens a grown-up card and marks history; calm, interruptible motion with Reduce Motion fallbacks.
- v0.3 (Alan): renamed E-Feels; save as soon as the card appears; **Finish questions** from the second question on; **Finish** on the card; "I need help" button; Add to Home Screen steps in Grown-ups; welcome shows once.
- The path so far shows as buttons; tapping one jumps back to that question (answers after it are cleared).
- "I'm not sure" opens a helper menu; "Not sure" moves to the next step.

### MVP (v0.1)

- Tapping a choice moves on; **Back** undoes. No Next button.
- Icons only on the first two questions; words only for nuanced terms.
- No audio in the app (VoiceOver still works).
- No accounts, no sync, no analytics, no backup.
- One fixed vocabulary; caregiver customization comes later (the content file is built for it).
