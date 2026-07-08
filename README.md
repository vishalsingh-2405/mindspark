# ⚡ MindSpark

Neon brain training in your browser — quick-fire mini-games across math, logic,
memory and reaction, plus a daily vocabulary vault with spaced repetition.
Everything runs on-device: no account, no server, fully offline once installed.

## Features

- **Quick Math** — beat the shrinking timer; correct answers buy time
- **Word Vault** — daily flashcards from a 15,000-word bank (3 tiers), SM-2-lite
  spaced repetition, tap-to-flip cards in two study modes
- **Brain Score** — one number from per-skill moving averages, with levels from
  Novice to Prodigy
- **Streaks & freezes** — daily streak with earned streak freezes (every 50 days)
- **Stats** — score history, per-skill trends, words mastered, activity strip
- **Adaptive difficulty**, Web Audio sound effects, reduced-motion support
- **Installable PWA** — add to home screen on Android/iOS, works offline
- 8 more games are on the roadmap (pattern, memory span, reaction and more)

## Run it locally

    npm ci
    npm run dev        # http://localhost:5173/mindspark/

## Scripts

    npm test           # unit tests (Vitest)
    npm run lint       # ESLint
    npm run build      # type-check + production build (dist/)
    npm run build:vocab  # regenerate the word bank (downloads sources, ~1 min)
    npm run make:icons   # regenerate PWA icons

## Install on your phone

Open the deployed URL in Chrome (Android) or Safari (iOS) → menu →
**Add to Home Screen**. The app caches everything and works with no connection.

## Tech

Vite · React 18 · TypeScript · zustand · Dexie (IndexedDB) · vite-plugin-pwa ·
custom CSS (design tokens, no framework) · Vitest + Testing Library

## Word bank data

Generated at build time from [WordNet 3.1](https://wordnet.princeton.edu/)
(Princeton University), frequency-ranked with
[hermitdave/FrequencyWords](https://github.com/hermitdave/FrequencyWords)
(OpenSubtitles 2018), filtered with the LDNOOBW blocklist. Details and licenses
in [data-pipeline/README.md](data-pipeline/README.md).

## License

[MIT](LICENSE)
