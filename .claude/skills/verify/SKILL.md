---
name: verify
description: Build, run, and drive MindSpark in a headless browser to verify changes end-to-end
---

# Verifying MindSpark changes

## Build & serve

```bash
npm run build                              # tsc --noEmit + vite build (also copies 404.html)
npx vite preview --port 4173 --strictPort  # serves the production build
```

The app is served under the GitHub Pages base path: **http://localhost:4173/mindspark/** (BrowserRouter, so deep links like `/mindspark/games` and `/mindspark/play/<game-id>` work directly).

## Driving it

Playwright (plain `playwright` package + `npx playwright install chromium`) in a scratch dir works well. Use a mobile viewport (390×844) — the app is mobile-first.

Key selectors:
- Games grid: `[data-testid="games-grid"] .tile` (order = `src/games/registry.ts` order)
- Game route: `/mindspark/play/<game-id>`; root element `.game.<game-id>`
- End of a run: `.results` appears with `.results__score` / `.results__delta`; buttons "Play again" / "All games" / "Home"
- HUD: `.hud__timer`, `.hud__level`, `.hud__combo`

Gotchas:
- **Timed games run their full clock** (45–75 s) before `.results` appears — Equation Sprint 45s, Pattern Break / Odd One Out / Memory Matrix / Digit Span 60s, Echo 75s, Go/No-Go 45s. Reaction Speed ends after 5 trials (~15 s). Budget ~8 min to play everything.
- Generic driver loop: poll every ~150 ms, click game-specific controls if present, break when `.results` exists. Wrap clicks in try/catch — phases change mid-click.
- Equation Sprint can be *solved* (score 100): read `.equation-sprint__q`, replace `−×÷` with `-*/`, evaluate LHS vs RHS, click `.choice--true`/`.choice--false`.
- Reaction Speed false-start probe: click `.reaction-speed__stage` during `--wait` → stage shows "Too soon!".
- Collect `page.on('pageerror')` and console errors — the run should produce **none**.
- After playing, `/mindspark/games` tiles show `Best N · Last N` and Home shows the Brain Score dial — that proves session recording + scoring integration.
- Sessions persist in IndexedDB per browser context; a fresh context = fresh profile.
- Premium-feel assertions: game roots flash `data-feedback="hit"|"miss"` on answers (auto-clears ~350 ms); `.hud__timer--low` appears in the last 5 s; ResultsCard score counts up inside `.results__ring` and `.results__ribbon` ("NEW BEST") appears only when a prior best is beaten — play a game badly once, then well, to trigger it.
- Settings sheet opens via the ⚙ button on Home; toggling "Reduced motion" adds `.reduced-motion` to `<html>` immediately and persists across reload (count-ups snap instantly when set).
