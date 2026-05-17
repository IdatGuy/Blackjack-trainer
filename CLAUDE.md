## Project Configuration

- **Language**: TypeScript
- **Package Manager**: npm
- **Add-ons**: prettier, eslint, vitest, tailwindcss, sveltekit-adapter

---

# Blackjack Trainer — Source of Truth

## 1. Vision

A blackjack training app that fixes the specific failures of every existing trainer:

- **Visually polished** — classic green-felt casino aesthetic, fixed center action bar with dealer above and player hands below. Trades the dark/modern look for one that scales cleanly to multi-hand horizontal scroll.
- **Mathematically correct** — canonical strategy charts. No "hit on pair of aces" embarrassments.
- **Properly featureful** — true count deviations *on top of* custom strategy charts. No app currently combines these.
- **Frictionless** — one play screen with toggles, not three separate modes. Manual reshuffle plus optional auto-reshuffle so you're not stuck grinding TC -5 shoes.
- **Portable** — phone-first, also runnable as a side-docked window on Linux/Hyprland.

## 2. Platforms & Stack

**Type:** Progressive Web App (PWA). One codebase, installs to phone home screen and runs as a standalone window on Linux via `chromium --app=`.

**Recommended stack:**

- **SvelteKit + TypeScript** — small bundle, simple reactivity, built-in PWA support via `@vite-pwa/sveltekit`. State-heavy apps like this benefit from Svelte's store model over React hooks.
- **Tailwind CSS** — fast iteration on the dense card-table UI.
- **Persistence:** IndexedDB (via `idb`) for purely local / offline-first usage, or **Supabase** if cross-device sync matters. With Supabase, buffer writes to IndexedDB first so the app stays usable offline. Either way, decision records are the bulk of the data; localStorage is too small once history grows.
- **Vitest** for unit tests on the game engine — this part *must* be tested or the chart-correctness goal fails.
- **Vercel or Cloudflare Pages** for hosting. Free, instant deploys.

**Acceptable swap:** React + Vite + TypeScript if more comfortable. Engine code is framework-agnostic.

**Layout:** Fixed mobile aspect ratio (9:19.5). On desktop, the app renders in a phone-shaped column with letterboxing or a subtle background. Hyprland rule for side-docking:

```
windowrulev2 = float, title:^(Blackjack Trainer)$
windowrulev2 = size 420 910, title:^(Blackjack Trainer)$
windowrulev2 = move 100%-440 50, title:^(Blackjack Trainer)$
```

CSS `env(safe-area-inset-top)` to keep cards clear of the camera cutout.

## 3. Feature Spec (Locked)

### Navigation

Five menu entries:

1. **Play Blackjack** — the only play surface. Toggles control behavior; no separate "counting trainer" mode.
2. **Table Rules** — ruleset picker + parameters.
3. **Stats** — bankroll chart, outcome percentages. The "money view."
4. **Accuracy** — strategy heat map by player total × dealer upcard. The "strategy view."
5. **Strategy Overrides** — per-ruleset, per-cell overrides on top of canonical charts.

Gear icon on the Play screen opens app preferences (animation speed, sounds, theme, hole-card flash duration).

### Play Screen Toggles

- **Show count** (running, true, or both)
- **Deviation hints** (highlight when current decision differs from basic strategy due to TC)
- **Hole card mode** (dealer hole card briefly flashes during the deal, emulating a flashing dealer. Flash duration is configurable. Uses its own strategy chart since correct play differs when the dealer's total is known.)
- **Drill mode** (synthesized hands by filter and/or weakness weighting; forces count and deviations off — see Drill Mode below)
- **Auto-reshuffle below TC X** (configurable threshold, default off)

### Strategy Engine

- Canonical charts shipped for: decks 1/2/4/6/8 × S17/H17 × DAS on/off × surrender (none/late/early) × peek/no-peek × RSA on/off.
- True count deviations (Illustrious 18 + Fab 4 as starting set, expandable) layered on top.
- Per-cell overrides per ruleset. UI shows a visual indicator when a cell deviates from canonical.
- Charts editable but defaulted from a known-good source (Wizard of Odds).

### Game Mechanics

- **Reshuffle:** manual button always available. Optional auto-reshuffle when TC drops below configurable threshold (so you can grind only profitable counts).
- **Multi-hand:** up to 3 hands.
  - **Bet per spot:** independent. Mirrors real casino rules (most tables require ≥2× minimum per extra spot) and is the only way to drill realistic counter behavior — e.g., ramping the front spot while flat-betting the back two, or spreading wide at high counts to reduce variance.
  - **Layout:** dealer hand fixed at the top (one hand, shared by all spots — same as a real table). Action bar fixed in the middle. Player hands in a horizontal scroll at the bottom, all rendered at the same size, active highlighted and auto-centered as it cycles.
  - **Splits in multi-hand:** split cap stays at 4 per spot. Split sub-hands appear inline within the parent spot's column and scroll with it.
- **Animation speed:** slider 0–5 where 0 is instant. Faster than BJA's "fastest."

### Drill Mode

Targeted practice instead of shoe-based play. Synthesizes starting hands by filter and/or weakness profile so you can focus reps on what's actually leaking.

- **Hand filter:** All / Hard / Soft / Pairs, with sub-filters for specific ranges (e.g., hard 12–16, soft 13–18, only AA, only 88). Filter the starting hand only — subsequent draws are unrestricted.
- **Weakness weighting:** Off (uniform sampling within filter) or On (sampling weighted by per-cell error rate from the Accuracy heat map). Self-correcting: as you improve at a cell, it appears less often.
- **Card source:** initial hands synthesized to match filter/weighting. Subsequent draws (hits, splits, dealer hits) are uniform random from an effectively infinite shoe.
- **Forced off when drill is on:**
  - Count display (no meaningful count when shoe is synthesized).
  - True count deviations (deviations are TC-dependent).
- **Bankroll tracking:** defaults off in drill mode — selection bias toward weak hands makes EV unrepresentative. Toggleable per session.
- **Decisions still log to the heat map** so drill sessions update your weakness profile.

### Stats

The "money view." Strategy correctness lives in the Accuracy tab.

- **Bankroll tracking is toggleable per session.** When off, hands play normally but no P/L is recorded. Off by default in drill mode.
- Top-level bankroll chart (P/L over hands played, bankroll-tracked sessions only).
- Win/Push/Loss/Surrender percentages.
- Hands played, sessions played, longest winning/losing streak.
- Filterable by ruleset, mode (standard / hole-card), play mode (shoe / drill), and time range. Default: all.

### Accuracy

The "strategy view." Heat map of strategy correctness laid out like a basic strategy chart. **One ruleset = one chart = one heat map.**

- **Ruleset selector at the top of the page.** Defaults to whatever's set in Table Rules; can be overridden inline so you can flip between charts (e.g., compare H17 vs S17 accuracy) without leaving the view.
- **Axes:** player total (rows) × dealer up card (columns).
- **Cells:** colored by accuracy percentage on that cell. Red (low) → neutral → green (high). Letter inside shows the chart-correct action (H/S/D/P/R).
- **Tabs:** Hard / Soft / Pairs / All (within the selected ruleset).
- **Time range:** Today / Week / Month / All Time.
- **Other filters:** mode (standard / hole-card), play mode (shoe / drill / all). Default: all.
- **Sample threshold:** cells with fewer than N decisions (default 3) render gray to avoid misleading colors on tiny samples.
- Tap a cell to see decision history for that cell (expected vs actual, count at the time, outcome).
- Below the heat map: an "Overall" section with per-category accuracy (hit/stand, doubles, splits, surrender, deviations) — the categorical breakdown moved here from Stats.

## 4. Data Model (Sketch)

```typescript
// Core game types
type Suit = 'S' | 'H' | 'D' | 'C';
type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K';
type Card = { rank: Rank; suit: Suit };

type Hand = {
  cards: Card[];
  bet: number;
  isSplit: boolean;
  isDoubled: boolean;
  isSurrendered: boolean;
  isResolved: boolean;
};

type Shoe = {
  cards: Card[];      // remaining
  decks: number;
  cutCardPosition: number;
  runningCount: number;  // updated as cards are dealt
};

// Rules
type RuleSet = {
  id: string;
  name: string;
  decks: 1 | 2 | 4 | 6 | 8;
  dealerHitsSoft17: boolean;
  doubleAfterSplit: boolean;
  resplitAces: boolean;
  surrender: 'none' | 'late' | 'early';
  peek: boolean;             // dealer peeks for BJ on A/10 up
  blackjackPays: '3:2' | '6:5';
  maxSplits: number;         // typically 4
};

// Strategy
type Action = 'H' | 'S' | 'D' | 'P' | 'R';  // hit/stand/double/split/surrender
type ChartCell = {
  base: Action;
  fallback?: Action;         // e.g., "Ds" = double if allowed else stand
  deviations?: { tc: number; action: Action }[];  // sorted by tc desc
};
type StrategyChart = {
  ruleSetId: string;
  hard: Record<string, Record<string, ChartCell>>;   // [playerTotal][dealerUp]
  soft: Record<string, Record<string, ChartCell>>;
  pairs: Record<string, Record<string, ChartCell>>;
  overrides: Partial<StrategyChart>;  // user edits, merged on lookup
};

// Decisions (the unit of stats)
type DecisionRecord = {
  timestamp: number;
  ruleSetId: string;
  mode: 'standard' | 'holeCard';
  playMode: 'shoe' | 'drill';     // orthogonal to mode; drill mode synthesizes hands
  handType: 'hard' | 'soft' | 'pair';
  playerTotal: number | string;  // string for pairs ("AA")
  dealerUp: Rank;
  trueCount: number;             // null in drill mode (no meaningful count)
  expected: Action;
  actual: Action;
  correct: boolean;
  category: 'hit-stand' | 'double' | 'split' | 'surrender' | 'deviation';
  betAmount: number;
  outcomeChips: number;          // net P/L for this hand; 0 if bankroll tracking off
  bankrollTracked: boolean;
};
```

The decision record is the heart of the system. Every action the player takes logs one. Stats are computed by aggregating these records — no separate "stats counter" state to keep in sync.

## 5. Architecture

Three layers, strictly separated:

1. **Engine** (`src/lib/engine/`) — pure TypeScript, no UI imports. Deck/shoe/hand/rules/strategy logic. Fully unit-tested.
2. **Store** (`src/lib/stores/`) — Svelte stores wrapping engine state. Reactive, single source of truth for the UI.
3. **UI** (`src/routes/`) — dumb components that read stores and call store actions.

This separation matters because the engine is where correctness lives. If it's tangled with UI, you can't trust it.

## 6. Roadmap

Eleven phases, each shippable on its own. Build order optimized so you have something playable as fast as possible, then layer features.

### Phase 1 — Engine Core (~1 week)
- Card, deck, shoe, hand types
- Hand evaluation (totals, soft/hard detection, bust, blackjack)
- One ruleset hardcoded (6D, S17, DAS, late surrender, 3:2)
- Hi-Lo running count + TC calculation
- Basic strategy chart for that ruleset
- **Tests:** chart correctness, hand evaluation edge cases (multi-ace soft totals, BJ vs 21)

No UI yet. CLI or test harness only. **Do not skip the tests.** This is the foundation.

### Phase 2 — Playable MVP (~1 week)
- Single-hand play screen, single ruleset
- Hit/stand/double/surrender (skip split for now)
- Bet input, action buttons, win/loss resolution
- Card rendering — placeholder visuals fine
- Correct/incorrect feedback (toggleable)

End of phase: you can play hands against your own app.

### Phase 3 — Splits + Visual Polish (~1 week)
- Split logic (cap 4)
- Real card design matching Blackjack Ace aesthetic
- Animation system with speed slider
- Safe-area / camera cutout handling
- Manual reshuffle button

End of phase: app looks and feels like a real product for the home ruleset.

### Phase 4 — Counting Layer (~3–5 days)
- Count display toggles (running, true, both, off)
- Deviation table (Illustrious 18 + Fab 4)
- Deviation hints toggle on play screen
- Strategy lookup integrates deviations

### Phase 5 — Stats + Accuracy (~1.5 weeks)
- IndexedDB persistence for DecisionRecord history
- **Stats page** (money view): bankroll chart, W/P/L/Surr percentages, hands/sessions/streaks
- **Accuracy page** (strategy view): heat map (Hard/Soft/Pairs/All tabs, time-range filter), per-category breakdown
- Per-cell drill-down on tap
- Reset/export buttons

### Phase 6 — Drill Mode (~1 week)
- Hand synthesizer: deal a specific starting hand from filter
- Hand filters: All / Hard / Soft / Pairs, with sub-range options
- Weakness weighting: sampling distribution computed from heat map error rates
- Force count display and deviations off when active
- Bankroll defaults off in drill mode
- Drill settings UI accessible from the Play screen gear icon
- Decisions still log with `playMode: 'drill'` so the heat map self-updates

### Phase 7 — Multi-Ruleset + Overrides (~1 week)
- Ship all canonical charts
- Table Rules page with ruleset picker
- Strategy Overrides page: chart editor with per-cell override
- Visual indicator on overridden cells

### Phase 8 — Multi-Hand (~4–5 days)
- Up to 3 simultaneous hands
- Independent bets per spot
- Horizontal scroll layout: equal-size hands, active highlighted and auto-centered as it cycles
- Splits within multi-hand

### Phase 9 — Hole Card Mode (~4–5 days)
- Dealer hole card briefly flashes during the deal sequence, then returns face-down for the rest of the hand. Emulates spotting a flashing dealer — trains the actual real-world skill.
- **Flash duration:** configurable slider, 100ms–1000ms, default 300ms. Beginners start slow, work down toward realistic ~150ms flashes.
- **Flash trigger:** default flashes every hand regardless of upcard (for training rep volume). Optional "realistic mode" toggle that only flashes on peek scenarios (dealer shows A or 10), added later if needed.
- Separate hole-card strategy chart (correct play differs against a known dealer total — this is the actual skill being trained). V1 ignores count deviations on this chart; can be added later.
- Tag decisions with mode for filtering on the Accuracy page.
- Bankroll toggle exposed in pre-deal options.
- **Deferred sub-feature:** optional perception-check step ("tap the rank you saw" before action buttons appear) to separate "did I see it right" from "did I play it right." Not in v1.

### Phase 10 — PWA + Auto-Reshuffle + Polish (~3–4 days)
- Service worker, offline support
- Manifest, icons, install prompt
- Auto-reshuffle threshold setting
- Hyprland window config in README

### Phase 11 — Stretch
- Counting-only trainer mode (no play, just call running count)
- Additional counting systems (KO, Hi-Opt II, Wong Halves)
- Perception-check sub-feature for hole-card mode
- Cloud sync (only if you want it — local IndexedDB is enough)

## 7. Non-Goals (For Now)

To stop scope creep before it starts:

- No real-money or fake-leaderboard social features.
- No simulator (separate project — that's the Rust/Go monster from before).
- No team play modes.
- No tutorial / lesson content. This is a trainer, not a teacher.
- No native iOS/Android builds. PWA covers it.

## 8. First Concrete Steps

1. `pnpm create svelte@latest blackjack-trainer` — choose TS, ESLint, Prettier, Vitest.
2. Add Tailwind: `pnpm dlx svelte-add@latest tailwindcss`.
3. Add PWA plugin: `pnpm add -D @vite-pwa/sveltekit`.
4. Create `src/lib/engine/` with `card.ts`, `shoe.ts`, `hand.ts`, `rules.ts`, `strategy.ts`.
5. Write tests for hand evaluation *first*. Soft 17, soft 18 with three aces, blackjack vs 21, busted-21.
6. Hardcode the 6D-S17-DAS-LS chart as a TypeScript const. Validate against Wizard of Odds.
7. Build the action engine: `deal`, `hit`, `stand`, `double`, `surrender`. Get it working in tests before any UI.

Phase 1 is done when `pnpm test` is green and you can simulate a full hand in a test, including correct strategy lookup with TC deviations.

---

**Stop, lock this doc, and start building.** Reopen it only when a real ambiguity surfaces — not to add features.
