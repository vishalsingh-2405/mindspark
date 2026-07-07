# MindSpark — Design Spec

*2026-07-07 · validated through brainstorming; supersedes the "Synapse" planning doc*

A neon/dark brain-training web app: 10 quick-fire mini-games across four skills plus a
daily vocabulary flashcard system, feeding one unified **Brain Score** with levels.

## Settled decisions

| Decision | Answer |
|---|---|
| Name | **MindSpark** |
| Platform | Local-first web app (Vite + React + TypeScript), mobile-first responsive, PWA-installable |
| Launch set | All 10 games |
| Difficulty | Adaptive (auto-adjusts inside each run; sessions resume near last peak) |
| Sound | Web Audio synth SFX, mute toggle, defaults on |
| Visual style | "Cyber Cyan" — the original neon palette (validated via mockup) |
| Vocab bank | ~15k words from WordNet + frequency list, 3 tiers, fully offline, committed to repo |
| Persistence | IndexedDB via Dexie; no accounts, no backend |
| Repo | Publish-ready structure, git from day one, CI (lint + test + build) |

**Out of scope for v1:** AI top-up, accounts/cloud sync, leaderboards, i18n.
All are additive later; nothing in v1's architecture blocks them.

## Stack

- **Vite + React 18 + TypeScript** — app framework
- **zustand** — app state
- **Dexie** — IndexedDB persistence
- **vite-plugin-pwa** — offline caching + installability
- **Custom CSS** with design tokens (no CSS framework; the neon aesthetic is handcrafted)
- **Vitest + React Testing Library** — tests
- No other runtime dependencies.

## Repo structure

```
mindspark/
├── README.md                  # screenshots, features, run instructions
├── LICENSE
├── .gitignore
├── package.json / vite.config.ts / tsconfig.json
├── index.html
├── .github/workflows/ci.yml   # lint + test + build on push
│
├── data-pipeline/             # build-time only, separate from app code
│   ├── README.md              # data sources + licenses (WordNet attribution)
│   └── build-vocab.mjs        # download → filter → tier → emit shards
│
├── public/
│   ├── icons/                 # PWA icons
│   └── data/vocab/            # generated shards (committed, ~5 MB → clone-and-run)
│
├── docs/superpowers/specs/    # this spec; plans live alongside
│
└── src/
    ├── main.tsx / App.tsx     # entry, router, top-level error boundary
    ├── styles/                # tokens.css, global.css
    ├── components/            # NeonButton, ScoreDial, RadarChart, HUD, ProgressBar…
    ├── screens/               # Home, Games, Vocab, Stats, GamePlay, Results, Settings
    ├── games/
    │   ├── registry.ts        # single source of truth: id, name, skill, component, blurb
    │   └── <game-id>/         # one folder per game: logic.ts (pure) + Component.tsx + logic.test.ts
    ├── vocab/                 # deck builder, SRS engine, flashcard UI
    ├── scoring/               # session score, skill EWMA, Brain Score, levels
    ├── storage/               # Dexie schema + typed repositories
    ├── audio/                 # Web Audio sfx engine + mute
    └── lib/                   # seeded RNG, timer hooks, date utils
```

**Games are plugins.** Each game folder exports pure logic (question generation, answer
checking, difficulty curve, raw-result → 0-100 score converter — all unit-testable without
React) plus a thin component. `registry.ts` drives the Games screen, routing, and scoring;
adding a game later = one folder + one registry line.

## The 10 games

| # | Game | Skill | Mechanic | Adaptive dimension |
|---|------|-------|----------|--------------------|
| 1 | Quick Math | math | Solve arithmetic against a shrinking timer; correct answers add time, speed builds combo | operand size/operators |
| 2 | Equation Sprint | math | Shown `9 + 6 = 15` → tap TRUE/FALSE fast | equation complexity, flash pace |
| 3 | Pattern Break | logic | "What comes next?" number/shape sequences | sequence rule complexity |
| 4 | Odd One Out | logic | Grid of items; tap the one that doesn't belong | grid size, distractor subtlety |
| 5 | Memory Matrix | memory | Cells flash then go dark; reproduce the pattern | grid size, cell count |
| 6 | Digit Span | memory | Digit string shows briefly; type it back | string length |
| 7 | Echo | memory | Simon-style tile sequence; repeat it | sequence length, playback speed |
| 8 | Reaction Speed | reaction | Red → green, tap instantly; raw ms; early tap = penalty | n/a (measures raw ms) |
| 9 | Go / No-Go | reaction | Tap GREEN, don't tap RED | pace, red/green ratio |
| 10 | Word Vault | vocab | Daily flashcards with SRS (see below) | tier promotion |

Runs are 30–90 seconds. Game screens are distraction-free: slim HUD (score/timer),
glow pulse on correct, shake on wrong, results card at the end (score, delta vs last,
Play again / Next game).

## Scoring

1. **Session score (0–100):** each game's `logic.ts` exports a converter from raw results
   (difficulty reached × accuracy × speed). Reaction Speed maps ms → score (≈180 ms → 95,
   ≈400 ms → 40). Curves pinned by unit tests.
2. **Skill score:** exponentially weighted moving average per skill — new session weighted
   ~25%, history ~75%.
3. **Brain Score:** mean of the five skill scores; unplayed skills show "—" and are
   excluded until first played.
4. **Levels:** 0–20 Novice · 20–40 Sharp · 40–60 Quick · 60–80 Elite · 80–100 Prodigy.
5. **Adaptive difficulty:** per-game persisted level; in-run, ~3 consecutive correct →
   step up, ~2 consecutive misses → step down; next session starts one notch below last
   peak.
6. **Streak:** a day counts when any game or the daily deck is completed.
7. **Streak freezes:** every 50 consecutive days (day 50, 100, 150…) earns 1 freeze,
   stacking up to a max of 2. Missing a day with a freeze available auto-consumes it and
   the streak survives (the frozen day shows a ❄️ in streak history and does not
   increment the counter). One freeze covers one missed day — two consecutive missed
   days need two freezes. No freezes left → streak resets to zero. Freeze count shows
   as a small ❄️ badge next to the streak flame on Home. Unused banked freezes are
   KEPT across a streak reset (earned inventory, Duolingo-style — decided 2026-07-07);
   the 50-day milestone tracker resets with the streak. Plays dated earlier than the
   last played day (clock rollback / timezone travel) are ignored.

## Data model (Dexie / IndexedDB)

```
sessions       { id, gameId, skill, score, difficultyReached, accuracy, avgMs, playedAt }
vocabProgress  { wordId, interval, ease, due, lapses, lastResult }   // only seen words
profile        { brainScore, skillScores{5}, streak, bestStreak, lastPlayedDate,
                 freezesAvailable, lastFreezeMilestone, frozenDates[] }
settings       { soundOn, wordsPerDay, vocabMode, reducedMotion }
```

## Word Vault

**Pipeline** (`data-pipeline/build-vocab.mjs`, run once; output committed):
1. Download WordNet + an English word-frequency list (default:
   hermitdave/FrequencyWords `en_full`, OpenSubtitles-derived; any ranked list works).
2. Filter: single alphabetic words, 3–14 letters, clean definition, present in frequency
   list; drop archaic/obscene/hyper-technical. ~150k → ~15k.
3. Tier by frequency: **Everyday** (top ~3k) · **Intermediate** (~5k) · **Advanced** (rest).
4. Emit `public/data/vocab/{everyday,intermediate,advanced}.json`, entries
   `{ id, word, pos, meaning, example }`. Words without a WordNet example keep
   `example: ''` and the flashcard simply hides its example row (decided 2026-07-07;
   supersedes the earlier "templated fallback" idea — a fabricated sentence adds
   noise, not learning value). `data-pipeline/README.md` records source licenses
   for attribution.

**Runtime:** lazy-load only the current tier's shard (~1–2 MB, service-worker cached);
in-memory index; zero network after first load.

**Daily deck:** `wordsPerDay` (default 10, settable 5–25) new words in frequency order
+ reviews due today — reviews come strictly first (resolved reading of "first-weighted",
Anki-style), **capped at 50 reviews per deck keeping the most overdue** so a returning
user never faces an unbounded wall to keep their streak (decided 2026-07-07). Finishing
the deck banks the streak day. Deck score: 70% accuracy + 30% review retention, with
the retention share count-weighted (ramps in over 5 reviews) so a lone review card
cannot swing the score.

**Flashcards:** tap-to-flip (3D flip, validated via mockup). Two modes, toggleable:
Word → Meaning and Meaning → Word (meaning side shows pos + first-letter hint).
After flip: **✕ Didn't know / ✓ Knew it**.

**SRS (SM-2 lite):** Didn't know → interval 1 day, ease down. Knew it → interval grows
1 → 4 → 10 → 25 → 60 days, scaled by ease. Mastered = climbed the full ladder (step 4,
i.e. five consecutive successes — deliberate step-based reading, decided 2026-07-07).
Mastery drives tier promotion (~80% of ≥50 served tier words unlocks the next tier);
the vocab skill score comes from deck sessions (70% accuracy + 30% review retention)
through the standard EWMA. Known future wart: an always-missed word resurfaces daily
forever (lapses are recorded but unused) — Anki-style leech handling is deferred.

## Screens

Bottom nav: **Home · Games · Vocab · Stats**, plus a Settings sheet.

- **Home:** Brain Score dial + level, streak flame, skill radar (custom SVG), Today's
  Words card, quick-launch game tiles.
- **Games:** grid of all 10 with best/last score and skill tag.
- **GamePlay:** minimal chrome, HUD, results card.
- **Vocab:** the deck flow above, plus progress (words learned, review pile size).
- **Stats:** Brain Score over time, per-skill trends, words mastered, streak history.
- **Settings:** sound, words/day, vocab mode, reduced motion, reset data.

## Visual style — "Cyber Cyan"

- Background `#070B14` · panels `#0E1526` (glass, subtle blur) · neon cyan `#00F0FF`
  (primary/glow) · magenta `#FF2E97` (secondary/alerts) · lime `#B6FF00`
  (success/streaks) · muted text `#8A94A6`.
- Glassmorphism panels, thin neon borders, soft outer glow on active elements.
- Snappy transitions; glow pulse on correct answers. `prefers-reduced-motion` respected.
- Typography: system geometric sans; futuristic feel via weight + letter-spacing.
- All tokens in `src/styles/tokens.css`.

## Audio

Web Audio API synth (no audio files): short blip (correct), low buzz (wrong), tick
(low timer), chime (level-up / deck complete). Mute toggle in settings, persisted.

## Error handling

- Error boundary per screen — a crashing game can't take down the app.
- IndexedDB unavailable → in-memory fallback + "progress won't be saved" banner.
- Vocab shard fetch failure → retry UI.
- Contrast kept readable despite neon; visible keyboard focus throughout.

## Testing

- Unit tests on all pure logic: every game's generator/checker/score converter, SRS
  scheduler, deck builder, adaptive difficulty, EWMA/Brain Score math, streak logic.
- Component smoke test per screen; flashcard flip interaction test.
- Pipeline test against a small fixture dictionary.
- CI (GitHub Actions): lint + test + build on every push.
