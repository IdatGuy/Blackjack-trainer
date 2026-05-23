# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # dev server (already running on :5173 — use curl to verify, don't start another)
npm run build        # production build
npm run check        # svelte-check + TS type checking
npm run lint         # prettier + eslint
npm run format       # prettier write
npm run test         # run unit tests once
npm run test:unit    # vitest in watch mode
```

Run a single test file:
```bash
npx vitest run src/lib/engine/hand.test.ts
```

## Architecture

Three layers, strictly separated — do not blur them:

1. **Engine** (`src/lib/engine/`) — pure TypeScript, zero UI imports. Card/shoe/hand/rules/strategy logic. Fully unit-tested. This is where correctness lives.
   - `card.ts` — `Rank`, `Suit`, `Card` types
   - `hand.ts` — `handValue`, `isBust`, `isBlackjack`, `handType`, `handKey`
   - `shoe.ts` — `buildShoe`, `dealCard`, `trueCount`, `shouldReshuffle`
   - `rules.ts` — `RuleSet`, `DEFAULT_RULESET`, `allowedActions`, `dealerShouldHit`
   - `strategy.ts` — canonical 6D/S17/DAS/LS chart + Hi-Lo deviations; `getCorrectAction`, `getBaseAction`
   - `game.ts` — pure state machine: `dealHand`, `hit`, `stand`, `double`, `surrender`, `split`, `playDealer`, `resolveHands`

2. **Stores** (`src/lib/stores/`) — Svelte 5 class-based stores using `$state` runes. Single source of truth for UI.
   - `game.svelte.ts` — `GameStore` wraps engine state; handles betting, decision logging, bankroll, animation sequencing
   - `settings.svelte.ts` — persists to `localStorage` under key `bj-settings`

3. **UI** (`src/routes/`) — dumb Svelte components that read stores and call store methods. No game logic here.

## Key Patterns

**Svelte 5 runes**: All reactive state uses `$state` / `$derived` (not legacy stores). Components use `$derived` for computed values from `game` and `settings` singletons imported directly.

**Decision logging**: Every player action produces a `DecisionRecord` (see `src/lib/db/schema.ts`). Records are buffered in `_pending` during a hand, then flushed with outcome chips attached when the hand resolves. These feed the Accuracy heat map and Stats page.

**Persistence**:
- `DecisionRecord` history → IndexedDB via `idb` (`src/lib/db/`)
- Bankroll → `localStorage` key `bj-bankroll`
- Settings → `localStorage` key `bj-settings`

**Strategy lookup**: `getCorrectAction` applies TC deviations on top of basic strategy. `getBaseAction` returns the no-deviation action. The difference drives the `isDeviation` flag used for hints and decision categorization.

**Animation**: The dealer draw sequence (`startDealerSequence`) lives in `+page.svelte` and drives `game.dealerDraw()` / `game.resolveDealer()` with `setTimeout` chains. `settings.animDuration` controls delay. The engine doesn't know about animation — the store exposes `dealerShouldDraw` as a derived boolean.

## Data Model

`DecisionRecord` is the heart of the system — every player action logs one. Stats and accuracy are computed by aggregating these records; there is no separate counters state to sync.

`GamePhase`: `'betting' → 'dealing' → 'player' → 'dealer' → 'resolution'` (loops back to `'betting'` via `game.nextHand()`).

## Current State

Phases 1–3 are complete: engine fully tested (137 passing), single-hand play with splits, card UI, basic stats/accuracy pages scaffolded. Phase 4 (counting layer) is done. Phase 5 (IndexedDB persistence + stats/accuracy pages) is in progress.

---

## Project Map

### File Tree & Responsibilities

```
src/
├── lib/
│   ├── engine/                        # Pure TS — no UI imports
│   │   ├── card.ts                    # Rank, Suit, Card; rankValue(), hiLoValue(), buildDeck(), shuffle()
│   │   ├── hand.ts                    # Hand, HandType; handValue(), isSoft(), isBlackjack(), isBust(), isPair(), handType(), handKey(), makeHand()
│   │   ├── shoe.ts                    # Shoe; buildShoe(), dealCard(), countCard(), trueCount(), shouldReshuffle(), resetShoe()
│   │   ├── rules.ts                   # Action, RuleSet, DEFAULT_RULESET; allowedActions(), dealerShouldHit()
│   │   ├── strategy.ts                # ChartCell; DEFAULT_CHART; getChartForRules(), getBaseAction(), getCorrectAction(), getInsuranceAction()
│   │   ├── game.ts                    # GamePhase, GameState, HandResult, ResolvedHand; dealHand(), hit(), stand(), double(), split(), surrender(), resolveInsurance(), resolveHands()
│   │   ├── synthesizer.ts             # DrillFilter; buildPlayerCards(), buildDealerCard(), sampleWeightedCell(), synthesizeTC()
│   │   └── index.ts                   # Re-exports all engine modules
│   │
│   ├── db/                            # IndexedDB layer (idb library)
│   │   ├── schema.ts                  # DecisionRecord, BjDB; imports Action, Rank, HandResult from engine
│   │   ├── index.ts                   # getDb(), clearDecisions()
│   │   ├── persist.ts                 # saveDecisions()
│   │   ├── queries.ts                 # HandsStats, BankrollStats, StrategyStats; getHandsStats(), getBankrollStats(), getStrategyStats(), filterSince()
│   │   └── accuracy.ts                # CellAccuracy, HeatmapData, CategoryStat; getHeatmapData(), getCategoryStats(), getDeviationAccuracy(), getWeaknessWeights(), getCellDetail()
│   │
│   ├── stores/
│   │   ├── game.svelte.ts             # GameStore singleton `game`; wraps all engine calls, logs decisions, manages bankroll/session/drill mode
│   │   └── settings.svelte.ts         # SettingsStore singleton `settings`; persists to localStorage `bj-settings`
│   │
│   └── components/
│       ├── Card.svelte                # Single card (face-up/down)
│       ├── Hand.svelte                # Card row + running total; uses handValue(), isBlackjack()
│       ├── BetInput.svelte            # Chip selector + Deal button
│       ├── ActionBar.svelte           # Hit/Stand/Double/Split/Surrender/Insurance buttons
│       ├── StrategyChart.svelte       # Modal strategy table with TC deviation highlights; uses getChartForRules()
│       ├── RangeSlider.svelte         # Dual-handle range input (no imports)
│       ├── InstallPrompt.svelte       # PWA install banner
│       ├── stats/
│       │   ├── StatSection.svelte
│       │   ├── HandsSection.svelte    # Win/Push/Loss counts; prop: HandsStats
│       │   ├── BankrollSection.svelte # P/L summary; prop: BankrollStats
│       │   ├── BankrollChart.svelte   # Line chart (ResizeObserver)
│       │   ├── StrategySection.svelte # Correct%/hint%; prop: StrategyStats
│       │   └── TimeFilter.svelte      # Today/Week/Month/All filter
│       └── accuracy/
│           ├── HeatmapGrid.svelte     # Player total × Dealer upcard grid; prop: HeatmapData
│           ├── DeviationList.svelte   # TC deviation plays; prop: CellAccuracy[]
│           └── CategoryStats.svelte   # Hit/Stand/Double/etc breakdown; prop: CategoryStat[]
│
└── routes/
    ├── +layout.ts                     # prerender=true, ssr=false
    ├── +layout.svelte                 # Root shell; InstallPrompt
    ├── +page.svelte                   # Main game: Hand, ActionBar, BetInput, StrategyChart; dealer animation loop
    ├── statistics/+page.svelte        # Stats dashboard; loads via getHandsStats/getBankrollStats/getStrategyStats
    ├── accuracy/+page.svelte          # Heatmap + deviations; loads via getHeatmapData/getCategoryStats/getDeviationAccuracy
    ├── settings/+page.svelte          # All settings form; writes to `settings` store
    ├── charts/+page.svelte            # (Strategy chart page)
    └── table-rules/+page.svelte       # (Rule set reference)
```

### Import Dependency Graph

```
card.ts ← hand.ts, shoe.ts, synthesizer.ts, game.ts
hand.ts ← rules.ts, strategy.ts, game.ts
shoe.ts ← strategy.ts, game.ts
rules.ts ← strategy.ts, game.ts
game.ts ← game.svelte.ts
strategy.ts ← synthesizer.ts, StrategyChart.svelte, accuracy/+page.svelte

schema.ts ← persist.ts, queries.ts, accuracy.ts, game.svelte.ts
db/index.ts ← persist.ts, queries.ts, accuracy.ts

settings.svelte.ts ← game.svelte.ts + every component/route
game.svelte.ts ← +page.svelte, BetInput, ActionBar
queries.ts ← statistics/+page.svelte
accuracy.ts ← accuracy/+page.svelte, game.svelte.ts (getWeaknessWeights)
```

### Data Flow

**Deal:**
`BetInput` → `game.deal()` → `dealHand()` [engine] → `game.state` (reactive) → UI re-renders

**Player action:**
`ActionBar` → `game.act(action)` → strategy lookup → engine function → push to `_pending` buffer → `game.state` updates

**Hand resolution:**
`game._flushDecisions(results)` → `saveDecisions()` → IndexedDB

**Drill mode:**
`settings.weaknessWeighting=true` → `game._prefetchWeights()` → `getWeaknessWeights()` [accuracy.ts] → `sampleWeightedCell()` [synthesizer.ts] → synthesized hand prepended to shoe

**Stats/Accuracy pages:**
filter change → `$effect` → DB query functions → component props → render

### Storage Keys

| Key | Store | Type |
|---|---|---|
| `bj-settings` | localStorage | JSON (all settings) |
| `bj-bankroll` | localStorage | float |
| `bj-hands-dealt` | localStorage | int |
| `bj-pwa-install-dismissed` | localStorage | bool |
| `bj-shoe` | sessionStorage | JSON (shoe state) |
| `decisions` | IndexedDB (BjDB v1) | DecisionRecord rows |
