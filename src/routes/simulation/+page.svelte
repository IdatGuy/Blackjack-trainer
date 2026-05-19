<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		initialState,
		dealHand,
		hit,
		stand,
		double,
		surrender,
		split,
		playDealer,
		resolveHands,
		resolveInsurance
	} from '$lib/engine/game.js';
	import { shouldReshuffle, resetShoe } from '$lib/engine/shoe.js';
	import { getCorrectAction } from '$lib/engine/strategy.js';
	import { allowedActions, DEFAULT_RULESET } from '$lib/engine/rules.js';
	import type { RuleSet } from '$lib/engine/rules.js';

	let numHands = $state(10000);
	let decks = $state<1 | 2 | 4 | 6 | 8>(6);
	let dealerHitsSoft17 = $state(false);
	let blackjackPays = $state<'3:2' | '6:5'>('3:2');

	type SimResult = {
		handsPlayed: number;
		wins: number;
		losses: number;
		pushes: number;
		blackjacks: number;
		surrenders: number;
		netUnits: number;
		totalWagered: number;
		durationMs: number;
	};

	let result = $state<SimResult | null>(null);
	let running = $state(false);

	function applyAction(state: ReturnType<typeof initialState>, action: string) {
		switch (action) {
			case 'H': return hit(state);
			case 'S': return stand(state);
			case 'D': return double(state);
			case 'P': return split(state);
			case 'R': return surrender(state);
			default:  return hit(state);
		}
	}

	function runSimulation() {
		running = true;
		result = null;

		const rules: RuleSet = { ...DEFAULT_RULESET, decks, dealerHitsSoft17, blackjackPays };

		let wins = 0, losses = 0, pushes = 0, blackjacks = 0, surrenders = 0;
		let netUnits = 0, totalWagered = 0;

		const t0 = performance.now();
		let state = initialState(rules);

		for (let i = 0; i < numHands; i++) {
			if (shouldReshuffle(state.shoe)) {
				state = { ...state, shoe: resetShoe(state.shoe) };
			}

			state = dealHand(state, [1]);

			if (state.phase === 'insurance') {
				state = resolveInsurance(state);
			}

			while (state.phase === 'player') {
				const hand = state.playerHands[state.activeHandIndex];
				const dealerUp = state.dealerHand.cards[0];
				const splitCount = state.playerHands.length - 1;
				const allowed = allowedActions(hand, dealerUp, rules, splitCount);
				let action = getCorrectAction(hand, dealerUp, state.shoe, rules, undefined, splitCount);
				if (!allowed.includes(action)) {
					action = allowed.includes('H') ? 'H' : 'S';
				}
				state = applyAction(state, action);
			}

			if (state.phase === 'dealer') {
				state = playDealer(state);
			}

			const resolved = resolveHands(state);
			state = resolved.state;

			for (const r of resolved.results) {
				totalWagered += r.bet;
				netUnits += r.netChips;
				switch (r.result) {
					case 'win':       wins++;       break;
					case 'blackjack': blackjacks++; wins++; break;
					case 'loss':      losses++;     break;
					case 'push':      pushes++;     break;
					case 'surrender': surrenders++; losses++; break;
				}
			}
		}

		result = {
			handsPlayed: wins + losses + pushes,
			wins,
			losses,
			pushes,
			blackjacks,
			surrenders,
			netUnits,
			totalWagered,
			durationMs: performance.now() - t0
		};
		running = false;
	}

	function pct(n: number, total: number) {
		return total === 0 ? '—' : (n / total * 100).toFixed(1) + '%';
	}
	function edge(net: number, wagered: number) {
		return wagered === 0 ? '—' : ((-net / wagered) * 100).toFixed(3) + '%';
	}
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<header class="flex items-center gap-3 border-b border-gray-800 bg-black/40 px-3 py-2">
		<button
			onclick={() => goto('/')}
			class="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-lg font-bold text-gray-900 hover:bg-gray-100 active:bg-gray-200"
			aria-label="Back"
		>
			←
		</button>
		<span class="text-base font-semibold text-white">Simulation</span>
	</header>

	<div class="flex-1 overflow-y-auto px-4 py-4">
		<!-- Inputs -->
		<div class="mb-6">
			<p class="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">Rules</p>
			<div class="overflow-hidden rounded-xl bg-gray-900 divide-y divide-gray-800">
				<!-- Hands -->
				<div class="flex items-center justify-between px-4 py-3.5">
					<span class="text-sm font-medium text-gray-100">Hands</span>
					<input
						type="number"
						min="100"
						max="100000"
						step="1000"
						bind:value={numHands}
						class="w-24 rounded-lg bg-gray-800 px-2 py-1 text-right text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
					/>
				</div>
				<!-- Decks -->
				<div class="flex items-center justify-between px-4 py-3.5">
					<span class="text-sm font-medium text-gray-100">Decks</span>
					<select
						bind:value={decks}
						class="rounded-lg bg-gray-800 px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
					>
						<option value={1}>1</option>
						<option value={2}>2</option>
						<option value={4}>4</option>
						<option value={6}>6</option>
						<option value={8}>8</option>
					</select>
				</div>
				<!-- Dealer hits soft 17 -->
				<label class="flex cursor-pointer items-center justify-between px-4 py-3.5">
					<span class="text-sm font-medium text-gray-100">Dealer hits soft 17</span>
					<input type="checkbox" bind:checked={dealerHitsSoft17} class="h-4 w-4 accent-blue-500" />
				</label>
				<!-- Blackjack pays -->
				<div class="flex items-center justify-between px-4 py-3.5">
					<span class="text-sm font-medium text-gray-100">Blackjack pays</span>
					<select
						bind:value={blackjackPays}
						class="rounded-lg bg-gray-800 px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
					>
						<option value="3:2">3:2</option>
						<option value="6:5">6:5</option>
					</select>
				</div>
			</div>
		</div>

		<!-- Run button -->
		<button
			onclick={runSimulation}
			disabled={running}
			class="mb-6 w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50"
		>
			{running ? 'Running…' : 'Run Simulation'}
		</button>

		<!-- Results -->
		{#if result}
			<div>
				<p class="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
					Results · {result.handsPlayed.toLocaleString()} hands · {result.durationMs.toFixed(0)}ms
				</p>
				<div class="overflow-hidden rounded-xl bg-gray-900 divide-y divide-gray-800">
					<div class="flex items-center justify-between px-4 py-3">
						<span class="text-sm text-gray-400">Wins</span>
						<span class="text-sm font-medium text-white">{result.wins.toLocaleString()} <span class="text-gray-500">({pct(result.wins, result.handsPlayed)})</span></span>
					</div>
					<div class="flex items-center justify-between px-4 py-3">
						<span class="text-sm text-gray-400">Losses</span>
						<span class="text-sm font-medium text-white">{result.losses.toLocaleString()} <span class="text-gray-500">({pct(result.losses, result.handsPlayed)})</span></span>
					</div>
					<div class="flex items-center justify-between px-4 py-3">
						<span class="text-sm text-gray-400">Pushes</span>
						<span class="text-sm font-medium text-white">{result.pushes.toLocaleString()} <span class="text-gray-500">({pct(result.pushes, result.handsPlayed)})</span></span>
					</div>
					<div class="flex items-center justify-between px-4 py-3">
						<span class="text-sm text-gray-400">Blackjacks</span>
						<span class="text-sm font-medium text-white">{result.blackjacks.toLocaleString()} <span class="text-gray-500">({pct(result.blackjacks, result.handsPlayed)})</span></span>
					</div>
					<div class="flex items-center justify-between px-4 py-3">
						<span class="text-sm text-gray-400">Surrenders</span>
						<span class="text-sm font-medium text-white">{result.surrenders.toLocaleString()} <span class="text-gray-500">({pct(result.surrenders, result.handsPlayed)})</span></span>
					</div>
					<div class="flex items-center justify-between px-4 py-3">
						<span class="text-sm text-gray-400">Net units</span>
						<span class="text-sm font-medium {result.netUnits >= 0 ? 'text-green-400' : 'text-red-400'}">
							{result.netUnits >= 0 ? '+' : ''}{result.netUnits.toFixed(2)}
						</span>
					</div>
					<div class="flex items-center justify-between px-4 py-3">
						<span class="text-sm text-gray-400">House edge</span>
						<span class="text-sm font-medium text-white">{edge(result.netUnits, result.totalWagered)}</span>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
