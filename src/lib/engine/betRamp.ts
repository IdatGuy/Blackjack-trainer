export type BetRamp = {
	unitSize: number;
	floorBet: number;
	startTC: number;
	maxBet: number;
	topTC: number;
	cells: Record<number, number>; // integer TC → unit multiple, fully editable
	tcConversion: 'floor' | 'round';
	feedbackThreshold: number; // in units; errors below this are silenced
};

export function rampTCMin(startTC: number): number {
	return Math.min(0, startTC - 2);
}

export function rampTCMax(topTC: number): number {
	return topTC + 2;
}

export function generateRampCells(
	unitSize: number,
	floorBet: number,
	startTC: number,
	maxBet: number,
	topTC: number
): Record<number, number> {
	if (unitSize <= 0) unitSize = 1;
	const floorMultiple = Math.round(floorBet / unitSize);
	const maxMultiple = Math.round(maxBet / unitSize);
	const tcMin = rampTCMin(startTC);
	const tcMax = rampTCMax(topTC);
	const cells: Record<number, number> = {};

	for (let tc = tcMin; tc <= tcMax; tc++) {
		if (startTC >= topTC || tc < startTC) {
			cells[tc] = floorMultiple;
		} else if (tc >= topTC) {
			cells[tc] = maxMultiple;
		} else {
			const t = (tc - startTC) / (topTC - startTC);
			cells[tc] = Math.round(floorMultiple + t * (maxMultiple - floorMultiple));
		}
	}
	return cells;
}

export function lookupMultiple(ramp: BetRamp, rawTC: number): number {
	const bucket =
		ramp.tcConversion === 'floor' ? Math.floor(rawTC) : Math.round(rawTC);
	const tcMin = rampTCMin(ramp.startTC);
	const tcMax = rampTCMax(ramp.topTC);
	const clamped = Math.max(tcMin, Math.min(tcMax, bucket));
	return ramp.cells[clamped] ?? Math.round(ramp.floorBet / ramp.unitSize);
}
