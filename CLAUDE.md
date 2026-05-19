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
