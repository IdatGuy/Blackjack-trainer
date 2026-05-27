import { describe, expect, it } from 'vitest';
import {
	generateRampCells,
	lookupMultiple,
	rampTCMax,
	rampTCMin,
	type BetRamp
} from './betRamp.js';

describe('rampTCMin', () => {
	it('returns 0 when startTC >= 2', () => expect(rampTCMin(2)).toBe(0));
	it('returns negative when startTC < 2', () => expect(rampTCMin(1)).toBe(-1));
	it('clamps at 0 when startTC === 2', () => expect(rampTCMin(2)).toBe(0));
	it('goes below 0 for startTC=0', () => expect(rampTCMin(0)).toBe(-2));
});

describe('rampTCMax', () => {
	it('is topTC + 2', () => {
		expect(rampTCMax(5)).toBe(7);
		expect(rampTCMax(6)).toBe(8);
	});
});

describe('generateRampCells', () => {
	// unit=$25, floor=$25 (1u), start=+2, max=$200 (8u), top=+5
	// tcMin = min(0, 0) = 0, tcMax = 7
	const cells = generateRampCells(25, 25, 2, 200, 5);

	it('covers the expected TC range', () => {
		expect(Object.keys(cells).map(Number).sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
	});

	it('floor region is floor multiple', () => {
		expect(cells[0]).toBe(1); // 25/25
		expect(cells[1]).toBe(1);
	});

	it('cap region is max multiple', () => {
		expect(cells[5]).toBe(8); // 200/25
		expect(cells[6]).toBe(8);
		expect(cells[7]).toBe(8);
	});

	it('interpolates linearly through ramp region', () => {
		// At TC=2: start → 1u
		// At TC=4: 1 + (2/3)*(8-1) ≈ 5.67 → rounds to 6
		expect(cells[2]).toBe(1);
		expect(cells[3]).toBe(Math.round(1 + (1 / 3) * 7)); // 3
		expect(cells[4]).toBe(Math.round(1 + (2 / 3) * 7)); // 6
	});

	it('handles non-clean multiples by rounding', () => {
		// unit=20, floor=30 (1.5 → rounds to 2), max=150 (7.5 → rounds to 8)
		const c2 = generateRampCells(20, 30, 1, 150, 4);
		expect(c2[rampTCMin(1)]).toBe(2); // round(1.5)
		expect(c2[rampTCMax(4)]).toBe(8); // round(7.5)
	});

	it('degenerate: startTC >= topTC puts all cells at floor', () => {
		const c = generateRampCells(25, 25, 5, 200, 5); // startTC === topTC
		for (const v of Object.values(c)) {
			expect(v).toBe(1);
		}
	});
});

describe('lookupMultiple', () => {
	const cells = generateRampCells(25, 25, 2, 200, 5);
	const base: BetRamp = {
		unitSize: 25,
		floorBet: 25,
		startTC: 2,
		maxBet: 200,
		topTC: 5,
		cells,
		tcConversion: 'floor',
		feedbackThreshold: 2
	};

	it('returns floor multiple for low TC', () => {
		expect(lookupMultiple(base, -5)).toBe(1);
		expect(lookupMultiple(base, 1.9)).toBe(1); // floor → 1, still in floor region
	});

	it('returns max multiple for high TC', () => {
		expect(lookupMultiple(base, 5)).toBe(8);
		expect(lookupMultiple(base, 10)).toBe(8);
	});

	it('returns mid-ramp value at exact TC', () => {
		expect(lookupMultiple(base, 3)).toBe(cells[3]);
	});

	it('floor conversion truncates', () => {
		// rawTC=3.9 → floor → 3
		expect(lookupMultiple(base, 3.9)).toBe(cells[3]);
	});

	it('round conversion rounds', () => {
		const rounded: BetRamp = { ...base, tcConversion: 'round' };
		// rawTC=3.5 → round → 4
		expect(lookupMultiple(rounded, 3.5)).toBe(cells[4]);
		// rawTC=3.4 → round → 3
		expect(lookupMultiple(rounded, 3.4)).toBe(cells[3]);
	});

	it('falls back to floor multiple when cell is missing', () => {
		const sparse: BetRamp = { ...base, cells: {} };
		// Should return floorBet/unitSize = 1
		expect(lookupMultiple(sparse, 3)).toBe(1);
	});
});
