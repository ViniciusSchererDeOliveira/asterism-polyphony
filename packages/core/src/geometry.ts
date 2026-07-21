export interface FretboardGeometry {
  numStrings: number;
  numFrets: number;
  scaleLengthMm: number;
  nutWidthMm: number;
  widthAtLastFretMm: number;
  fretboardRadiusMm: number;
  stringSpacingMm: number;
}

export interface FretPosition {
  fret: number;
  distanceFromNutMm: number;
  distanceToBridgeMm: number;
  fretboardWidthMm: number;
}

export interface StringFretPosition extends FretPosition {
  stringIndex: number;
  lateralMm: number;
  surfaceRiseMm: number;
}

export interface PhysicalSpan {
  fretSpan: number;
  longitudinalMm: number;
  lateralMm: number;
  reachMm: number;
}

export interface StringLayoutMetrics {
  playedStringCount: number;
  firstPlayedString: number | null;
  lastPlayedString: number | null;
  internalMutedStrings: number[];
  stringSkipCount: number;
  contiguousPlayedStrings: boolean;
}

export interface HandGeometryProfile {
  fingerLengthsMm: readonly [number, number, number, number];
  maxReachMm: number;
  maxLateralMm: number;
}

export interface FingeringOptions {
  geometry?: FretboardGeometry;
  hand?: Partial<HandGeometryProfile>;
}

export interface Barre {
  finger: number;
  fret: number;
  fromString: number;
  toString: number;
  soundingStrings: number[];
}

export interface FingerPlacement {
  finger: number;
  fret: number;
  strings: number[];
  barre: boolean;
}

export interface ValidFingeringSolution {
  valid: true;
  fingers: (number | null)[];
  fingerCount: number;
  placements: FingerPlacement[];
  barres: Barre[];
  physicalSpan: PhysicalSpan;
  reachUtilization: number;
  lateralUtilization: number;
  internalMutedStrings: number[];
  stringSkipCount: number;
}

export interface InvalidFingeringSolution {
  valid: false;
  reason:
    | 'invalid-fret'
    | 'too-many-fingers'
    | 'open-string-crosses-barre'
    | 'anatomical-reach'
    | 'no-valid-finger-assignment';
}

export type FingeringSolution = ValidFingeringSolution | InvalidFingeringSolution;

export interface TransitionMetrics {
  pivotCount: number;
  pivotStrings: number[];
  fromCenterFret: number;
  toCenterFret: number;
  signedCenterShiftFrets: number;
  centerShiftFrets: number;
  fromCenterMm: number;
  toCenterMm: number;
  signedCenterShiftMm: number;
  centerShiftMm: number;
  retainedFretCount: number;
  fingerPivotCount: number;
  fingerPivotStrings: number[];
  movedFingerCount: number;
  releasedFingerCount: number;
  placedFingerCount: number;
  fingerTravelMm: number;
  barreChangeCount: number;
  mutingChangeCount: number;
  fromStringSkipCount: number;
  toStringSkipCount: number;
  stringSkipDelta: number;
}

interface FingeringUnit {
  fret: number;
  strings: number[];
  fromString: number;
  toString: number;
  barre: boolean;
}

export const GRG121SP_GEOMETRY: Readonly<FretboardGeometry> = Object.freeze({
  numStrings: 6,
  numFrets: 24,
  scaleLengthMm: 648,
  nutWidthMm: 43,
  widthAtLastFretMm: 58,
  fretboardRadiusMm: 400,
  stringSpacingMm: 10.5
});

export const DEFAULT_HAND_GEOMETRY: Readonly<HandGeometryProfile> = Object.freeze({
  fingerLengthsMm: [72, 78, 74, 59] as const,
  maxReachMm: 100,
  maxLateralMm: 52
});

function assertGeometry(geometry: FretboardGeometry): void {
  if (!Number.isInteger(geometry.numStrings) || geometry.numStrings <= 0) {
    throw new Error('numStrings must be a positive integer');
  }
  if (!Number.isInteger(geometry.numFrets) || geometry.numFrets <= 0) {
    throw new Error('numFrets must be a positive integer');
  }
  if (!Number.isFinite(geometry.scaleLengthMm) || geometry.scaleLengthMm <= 0) {
    throw new Error('scaleLengthMm must be positive');
  }
  if (!Number.isFinite(geometry.nutWidthMm) || geometry.nutWidthMm <= 0) {
    throw new Error('nutWidthMm must be positive');
  }
  if (!Number.isFinite(geometry.widthAtLastFretMm) || geometry.widthAtLastFretMm <= 0) {
    throw new Error('widthAtLastFretMm must be positive');
  }
  if (!Number.isFinite(geometry.fretboardRadiusMm) || geometry.fretboardRadiusMm <= 0) {
    throw new Error('fretboardRadiusMm must be positive');
  }
  if (!Number.isFinite(geometry.stringSpacingMm) || geometry.stringSpacingMm <= 0) {
    throw new Error('stringSpacingMm must be positive');
  }
}

function assertFret(fret: number, geometry: FretboardGeometry): void {
  if (!Number.isInteger(fret) || fret < 0 || fret > geometry.numFrets) {
    throw new Error(`fret must be an integer between 0 and ${geometry.numFrets}`);
  }
}

export function fretDistanceFromNutMm(
  fret: number,
  geometry: FretboardGeometry = GRG121SP_GEOMETRY
): number {
  assertGeometry(geometry);
  assertFret(fret, geometry);
  return geometry.scaleLengthMm * (1 - Math.pow(2, -fret / 12));
}

export function fretboardWidthAtFretMm(
  fret: number,
  geometry: FretboardGeometry = GRG121SP_GEOMETRY
): number {
  assertGeometry(geometry);
  assertFret(fret, geometry);
  const lastFretDistance = fretDistanceFromNutMm(geometry.numFrets, geometry);
  const progress = lastFretDistance === 0 ? 0 : fretDistanceFromNutMm(fret, geometry) / lastFretDistance;
  return geometry.nutWidthMm + (geometry.widthAtLastFretMm - geometry.nutWidthMm) * progress;
}

export function getFretPosition(
  fret: number,
  geometry: FretboardGeometry = GRG121SP_GEOMETRY
): FretPosition {
  const distanceFromNutMm = fretDistanceFromNutMm(fret, geometry);
  return {
    fret,
    distanceFromNutMm,
    distanceToBridgeMm: geometry.scaleLengthMm - distanceFromNutMm,
    fretboardWidthMm: fretboardWidthAtFretMm(fret, geometry)
  };
}

export function getStringFretPosition(
  stringIndex: number,
  fret: number,
  geometry: FretboardGeometry = GRG121SP_GEOMETRY
): StringFretPosition {
  assertGeometry(geometry);
  assertFret(fret, geometry);
  if (!Number.isInteger(stringIndex) || stringIndex < 0 || stringIndex >= geometry.numStrings) {
    throw new Error(`stringIndex must be an integer between 0 and ${geometry.numStrings - 1}`);
  }
  const position = getFretPosition(fret, geometry);
  const usableWidthMm = position.fretboardWidthMm * 0.82;
  const spacingMm = geometry.numStrings === 1
    ? 0
    : Math.min(geometry.stringSpacingMm, usableWidthMm / (geometry.numStrings - 1));
  const lateralMm = (stringIndex - (geometry.numStrings - 1) / 2) * spacingMm;
  if (Math.abs(lateralMm) >= geometry.fretboardRadiusMm) {
    throw new Error('string layout exceeds fretboard radius');
  }
  const surfaceRiseMm = geometry.fretboardRadiusMm - Math.sqrt(
    geometry.fretboardRadiusMm * geometry.fretboardRadiusMm - lateralMm * lateralMm
  );
  return { ...position, stringIndex, lateralMm, surfaceRiseMm };
}

export function analyzePhysicalSpan(
  frets: readonly (number | null)[],
  geometry: FretboardGeometry = GRG121SP_GEOMETRY
): PhysicalSpan {
  assertGeometry(geometry);
  if (frets.length !== geometry.numStrings) {
    throw new Error(`expected ${geometry.numStrings} fret values`);
  }
  const positions = frets.flatMap((fret, stringIndex) => {
    if (fret === null || fret === 0) return [];
    assertFret(fret, geometry);
    return [getStringFretPosition(stringIndex, fret, geometry)];
  });
  if (positions.length < 2) {
    return { fretSpan: 0, longitudinalMm: 0, lateralMm: 0, reachMm: 0 };
  }
  const playedFrets = positions.map(position => position.fret);
  const longitudinal = positions.map(position => position.distanceFromNutMm);
  const lateral = positions.map(position => position.lateralMm);
  let reachMm = 0;
  for (let first = 0; first < positions.length; first++) {
    for (let second = first + 1; second < positions.length; second++) {
      const a = positions[first];
      const b = positions[second];
      const dx = a.distanceFromNutMm - b.distanceFromNutMm;
      const dy = a.lateralMm - b.lateralMm;
      const dz = a.surfaceRiseMm - b.surfaceRiseMm;
      reachMm = Math.max(reachMm, Math.hypot(dx, dy, dz));
    }
  }
  return {
    fretSpan: Math.max(...playedFrets) - Math.min(...playedFrets),
    longitudinalMm: Math.max(...longitudinal) - Math.min(...longitudinal),
    lateralMm: Math.max(...lateral) - Math.min(...lateral),
    reachMm
  };
}

export function physicalSpanMm(
  frets: readonly (number | null)[],
  geometry: FretboardGeometry = GRG121SP_GEOMETRY
): number {
  return analyzePhysicalSpan(frets, geometry).reachMm;
}

export function analyzeStringLayout(frets: readonly (number | null)[]): StringLayoutMetrics {
  const playedStrings = frets.flatMap((fret, stringIndex) => fret === null ? [] : [stringIndex]);
  if (playedStrings.length === 0) {
    return {
      playedStringCount: 0,
      firstPlayedString: null,
      lastPlayedString: null,
      internalMutedStrings: [],
      stringSkipCount: 0,
      contiguousPlayedStrings: true
    };
  }
  const firstPlayedString = playedStrings[0];
  const lastPlayedString = playedStrings[playedStrings.length - 1];
  const internalMutedStrings: number[] = [];
  for (let stringIndex = firstPlayedString; stringIndex <= lastPlayedString; stringIndex++) {
    if (frets[stringIndex] === null) internalMutedStrings.push(stringIndex);
  }
  return {
    playedStringCount: playedStrings.length,
    firstPlayedString,
    lastPlayedString,
    internalMutedStrings,
    stringSkipCount: internalMutedStrings.length,
    contiguousPlayedStrings: internalMutedStrings.length === 0
  };
}

function resolveHandGeometry(hand?: Partial<HandGeometryProfile>): HandGeometryProfile {
  const fingerLengthsMm = hand?.fingerLengthsMm ?? DEFAULT_HAND_GEOMETRY.fingerLengthsMm;
  if (
    fingerLengthsMm.length !== 4
    || fingerLengthsMm.some(length => !Number.isFinite(length) || length <= 0)
  ) {
    throw new Error('fingerLengthsMm must contain four positive lengths');
  }
  const defaultAverage = DEFAULT_HAND_GEOMETRY.fingerLengthsMm.reduce((sum, length) => sum + length, 0) / 4;
  const average = fingerLengthsMm.reduce((sum, length) => sum + length, 0) / 4;
  const scale = average / defaultAverage;
  const maxReachMm = hand?.maxReachMm ?? DEFAULT_HAND_GEOMETRY.maxReachMm * scale;
  const maxLateralMm = hand?.maxLateralMm ?? DEFAULT_HAND_GEOMETRY.maxLateralMm * scale;
  if (!Number.isFinite(maxReachMm) || maxReachMm <= 0) {
    throw new Error('maxReachMm must be positive');
  }
  if (!Number.isFinite(maxLateralMm) || maxLateralMm <= 0) {
    throw new Error('maxLateralMm must be positive');
  }
  return {
    fingerLengthsMm: [...fingerLengthsMm] as [number, number, number, number],
    maxReachMm,
    maxLateralMm
  };
}

function hasOpenStringAcrossBarre(
  frets: readonly (number | null)[],
  fromString: number,
  toString: number
): boolean {
  for (let stringIndex = fromString; stringIndex <= toString; stringIndex++) {
    if (frets[stringIndex] === 0) return true;
  }
  return false;
}

function createBarreCandidates(frets: readonly (number | null)[]): FingeringUnit[] {
  const byFret = new Map<number, number[]>();
  frets.forEach((fret, stringIndex) => {
    if (fret !== null && fret > 0) {
      const strings = byFret.get(fret) ?? [];
      strings.push(stringIndex);
      byFret.set(fret, strings);
    }
  });
  const candidates: FingeringUnit[] = [];
  for (const [fret, strings] of byFret) {
    for (let start = 0; start < strings.length - 1; start++) {
      for (let end = start + 1; end < strings.length; end++) {
        const fromString = strings[start];
        const toString = strings[end];
        if (hasOpenStringAcrossBarre(frets, fromString, toString)) continue;
        let blocked = false;
        for (let stringIndex = fromString; stringIndex <= toString; stringIndex++) {
          const crossedFret = frets[stringIndex];
          if (crossedFret === null || crossedFret < fret) {
            blocked = true;
            break;
          }
        }
        if (blocked) continue;
        const soundingStrings = strings.filter(stringIndex => stringIndex >= fromString && stringIndex <= toString);
        candidates.push({ fret, strings: soundingStrings, fromString, toString, barre: true });
      }
    }
  }
  return candidates;
}

function unitCost(units: readonly FingeringUnit[]): number {
  return units.reduce((cost, unit) => cost + (unit.barre ? unit.toString - unit.fromString : 0), 0);
}

interface AssignedFingeringUnit extends FingeringUnit {
  finger: number;
}

interface UnitPoint {
  longitudinalMm: number;
  lateralMm: number;
  surfaceRiseMm: number;
}

function unitPoint(
  unit: FingeringUnit,
  geometry: FretboardGeometry
): UnitPoint {
  const stringIndexes: number[] = [];
  for (let stringIndex = unit.fromString; stringIndex <= unit.toString; stringIndex++) {
    stringIndexes.push(stringIndex);
  }
  const points = stringIndexes.map(stringIndex => getStringFretPosition(stringIndex, unit.fret, geometry));
  return {
    longitudinalMm: points.reduce((sum, point) => sum + point.distanceFromNutMm, 0) / points.length,
    lateralMm: points.reduce((sum, point) => sum + point.lateralMm, 0) / points.length,
    surfaceRiseMm: points.reduce((sum, point) => sum + point.surfaceRiseMm, 0) / points.length
  };
}

function distanceBetweenUnits(
  first: FingeringUnit,
  second: FingeringUnit,
  geometry: FretboardGeometry
): number {
  const a = unitPoint(first, geometry);
  const b = unitPoint(second, geometry);
  return Math.hypot(
    a.longitudinalMm - b.longitudinalMm,
    a.lateralMm - b.lateralMm,
    a.surfaceRiseMm - b.surfaceRiseMm
  );
}

function maximumFingerPairReachMm(
  firstFinger: number,
  secondFinger: number,
  hand: HandGeometryProfile
): number {
  const firstLength = hand.fingerLengthsMm[firstFinger - 1];
  const secondLength = hand.fingerLengthsMm[secondFinger - 1];
  const fingerGap = Math.abs(firstFinger - secondFinger);
  const firstScale = firstLength / DEFAULT_HAND_GEOMETRY.fingerLengthsMm[firstFinger - 1];
  const secondScale = secondLength / DEFAULT_HAND_GEOMETRY.fingerLengthsMm[secondFinger - 1];
  const baselineReach = Math.min(
    DEFAULT_HAND_GEOMETRY.fingerLengthsMm[firstFinger - 1],
    DEFAULT_HAND_GEOMETRY.fingerLengthsMm[secondFinger - 1]
  ) * 0.55 + 13 + fingerGap * 12;
  return baselineReach * Math.min(firstScale, secondScale);
}

function maximumBarreStrings(finger: number, hand: HandGeometryProfile): number {
  const baseline = [6, 4, 4, 3][finger - 1];
  const scale = hand.fingerLengthsMm[finger - 1] / DEFAULT_HAND_GEOMETRY.fingerLengthsMm[finger - 1];
  return Math.max(2, Math.min(6, Math.floor(baseline * scale)));
}

function assignmentIsValid(
  assignments: readonly AssignedFingeringUnit[],
  hand: HandGeometryProfile,
  geometry: FretboardGeometry
): boolean {
  for (const assignment of assignments) {
    if (
      assignment.barre
      && assignment.toString - assignment.fromString + 1 > maximumBarreStrings(assignment.finger, hand)
    ) {
      return false;
    }
  }
  for (let firstIndex = 0; firstIndex < assignments.length; firstIndex++) {
    for (let secondIndex = firstIndex + 1; secondIndex < assignments.length; secondIndex++) {
      const first = assignments[firstIndex];
      const second = assignments[secondIndex];
      if (first.fret < second.fret && first.finger >= second.finger) return false;
      if (first.fret > second.fret && first.finger <= second.finger) return false;
      const distance = distanceBetweenUnits(first, second, geometry);
      if (distance > maximumFingerPairReachMm(first.finger, second.finger, hand)) return false;
    }
  }
  return true;
}

function assignFingers(
  units: readonly FingeringUnit[],
  hand: HandGeometryProfile,
  geometry: FretboardGeometry
): AssignedFingeringUnit[] | null {
  let best: AssignedFingeringUnit[] | null = null;
  let bestCost = Number.POSITIVE_INFINITY;

  const search = (unitIndex: number, usedFingers: Set<number>, assigned: AssignedFingeringUnit[]): void => {
    if (unitIndex === units.length) {
      if (!assignmentIsValid(assigned, hand, geometry)) return;
      const cost = assigned.reduce((total, unit) => {
        const barreCost = unit.barre ? unit.finger * (unit.toString - unit.fromString + 1) : 0;
        return total + barreCost;
      }, 0);
      if (cost < bestCost) {
        bestCost = cost;
        best = assigned.map(unit => ({ ...unit, strings: [...unit.strings] }));
      }
      return;
    }
    for (let finger = 1; finger <= 4; finger++) {
      if (usedFingers.has(finger)) continue;
      const next = { ...units[unitIndex], strings: [...units[unitIndex].strings], finger };
      const partial = [...assigned, next];
      if (!assignmentIsValid(partial, hand, geometry)) continue;
      usedFingers.add(finger);
      search(unitIndex + 1, usedFingers, partial);
      usedFingers.delete(finger);
    }
  };

  search(0, new Set<number>(), []);
  return best;
}

export function solveFingering(
  frets: readonly (number | null)[],
  options: FingeringOptions = {}
): FingeringSolution {
  const geometry = options.geometry ?? GRG121SP_GEOMETRY;
  assertGeometry(geometry);
  const hand = resolveHandGeometry(options.hand);
  if (
    frets.length !== geometry.numStrings
    || frets.some(fret => fret !== null && (!Number.isInteger(fret) || fret < 0 || fret > geometry.numFrets))
  ) {
    return { valid: false, reason: 'invalid-fret' };
  }
  const physicalSpan = analyzePhysicalSpan(frets, geometry);
  if (physicalSpan.reachMm > hand.maxReachMm || physicalSpan.lateralMm > hand.maxLateralMm) {
    return { valid: false, reason: 'anatomical-reach' };
  }
  const layout = analyzeStringLayout(frets);
  const notes = frets.flatMap((fret, stringIndex) =>
    fret !== null && fret > 0 ? [{ fret, stringIndex, key: `${stringIndex}:${fret}` }] : []
  );
  if (notes.length === 0) {
    return {
      valid: true,
      fingers: frets.map(() => null),
      fingerCount: 0,
      placements: [],
      barres: [],
      physicalSpan,
      reachUtilization: 0,
      lateralUtilization: 0,
      internalMutedStrings: [...layout.internalMutedStrings],
      stringSkipCount: layout.stringSkipCount
    };
  }
  const candidates = createBarreCandidates(frets);
  let best: { units: FingeringUnit[]; assigned: AssignedFingeringUnit[]; cost: number } | null = null;
  let coveredWithoutAssignment = false;

  const search = (covered: Set<string>, units: FingeringUnit[]): void => {
    if (units.length > 4) return;
    if (best && units.length > best.units.length) return;
    const next = notes.find(note => !covered.has(note.key));
    if (!next) {
      coveredWithoutAssignment = true;
      const assigned = assignFingers(units, hand, geometry);
      if (!assigned) return;
      const cost = unitCost(units);
      if (!best || units.length < best.units.length || (units.length === best.units.length && cost < best.cost)) {
        best = {
          units: units.map(unit => ({ ...unit, strings: [...unit.strings] })),
          assigned,
          cost
        };
      }
      return;
    }
    const individual: FingeringUnit = {
      fret: next.fret,
      strings: [next.stringIndex],
      fromString: next.stringIndex,
      toString: next.stringIndex,
      barre: false
    };
    const individualCovered = new Set(covered);
    individualCovered.add(next.key);
    search(individualCovered, [...units, individual]);

    for (const candidate of candidates) {
      if (candidate.fret !== next.fret || !candidate.strings.includes(next.stringIndex)) continue;
      const candidateCovered = new Set(covered);
      candidate.strings.forEach(stringIndex => candidateCovered.add(`${stringIndex}:${candidate.fret}`));
      search(candidateCovered, [...units, candidate]);
    }
  };

  search(new Set<string>(), []);
  const solution = best as { units: FingeringUnit[]; assigned: AssignedFingeringUnit[]; cost: number } | null;
  if (!solution) {
    const blockedOpenBarre = Array.from(new Set(notes.map(note => note.fret))).some(fret => {
      const strings = notes.filter(note => note.fret === fret).map(note => note.stringIndex);
      return strings.length >= 2 && hasOpenStringAcrossBarre(frets, Math.min(...strings), Math.max(...strings));
    });
    if (coveredWithoutAssignment) return { valid: false, reason: 'no-valid-finger-assignment' };
    return { valid: false, reason: blockedOpenBarre ? 'open-string-crosses-barre' : 'too-many-fingers' };
  }

  const ordered = [...solution.assigned].sort((a, b) => a.finger - b.finger);
  const fingers: (number | null)[] = frets.map(() => null);
  const placements: FingerPlacement[] = ordered.map(unit => {
    const finger = unit.finger;
    unit.strings.forEach(stringIndex => {
      fingers[stringIndex] = finger;
    });
    return { finger, fret: unit.fret, strings: [...unit.strings], barre: unit.barre };
  });
  const barres: Barre[] = ordered.flatMap(unit =>
    unit.barre
      ? [{
          finger: unit.finger,
          fret: unit.fret,
          fromString: unit.fromString,
          toString: unit.toString,
          soundingStrings: [...unit.strings]
        }]
      : []
  );
  return {
    valid: true,
    fingers,
    fingerCount: ordered.length,
    placements,
    barres,
    physicalSpan,
    reachUtilization: physicalSpan.reachMm / hand.maxReachMm,
    lateralUtilization: physicalSpan.lateralMm / hand.maxLateralMm,
    internalMutedStrings: [...layout.internalMutedStrings],
    stringSkipCount: layout.stringSkipCount
  };
}

export function canonicalShapeId(frets: readonly (number | null)[]): string {
  const firstPlayed = frets.findIndex(fret => fret !== null);
  if (firstPlayed === -1) return 'shape:empty';
  let lastPlayed = frets.length - 1;
  while (lastPlayed >= firstPlayed && frets[lastPlayed] === null) lastPlayed--;
  const playedFrets = frets.filter((fret): fret is number => fret !== null && fret > 0);
  const anchor = playedFrets.length > 0 ? Math.min(...playedFrets) : 0;
  const tokens = frets.slice(firstPlayed, lastPlayed + 1).map(fret => {
    if (fret === null) return 'x';
    if (fret === 0) return 'o';
    return String(fret - anchor);
  });
  return `shape:${tokens.join('.')}`;
}

function voicingCenterFret(frets: readonly (number | null)[]): number {
  const fretted = frets.filter((fret): fret is number => fret !== null && fret > 0);
  return fretted.length === 0 ? 0 : fretted.reduce((sum, fret) => sum + fret, 0) / fretted.length;
}

function voicingCenterMm(
  frets: readonly (number | null)[],
  geometry: FretboardGeometry
): number {
  const fretted = frets.filter((fret): fret is number => fret !== null && fret > 0);
  if (fretted.length === 0) return 0;
  return fretted.reduce((sum, fret) => sum + fretDistanceFromNutMm(fret, geometry), 0) / fretted.length;
}

function placementPoint(
  solution: ValidFingeringSolution,
  finger: number,
  geometry: FretboardGeometry
): UnitPoint | null {
  const placement = solution.placements.find(candidate => candidate.finger === finger);
  if (!placement) return null;
  const barre = solution.barres.find(candidate => candidate.finger === finger);
  const unit: FingeringUnit = barre
    ? {
        fret: barre.fret,
        strings: [...barre.soundingStrings],
        fromString: barre.fromString,
        toString: barre.toString,
        barre: true
      }
    : {
        fret: placement.fret,
        strings: [...placement.strings],
        fromString: Math.min(...placement.strings),
        toString: Math.max(...placement.strings),
        barre: false
      };
  return unitPoint(unit, geometry);
}

function placementSignature(solution: ValidFingeringSolution, finger: number): string | null {
  const placement = solution.placements.find(candidate => candidate.finger === finger);
  if (!placement) return null;
  const barre = solution.barres.find(candidate => candidate.finger === finger);
  return [
    placement.fret,
    placement.strings.join('.'),
    barre?.fromString ?? '',
    barre?.toString ?? ''
  ].join(':');
}

export function computeTransitionMetrics(
  fromFrets: readonly (number | null)[],
  toFrets: readonly (number | null)[],
  geometry: FretboardGeometry = GRG121SP_GEOMETRY
): TransitionMetrics {
  assertGeometry(geometry);
  if (fromFrets.length !== toFrets.length) {
    throw new Error('transition voicings must have the same string count');
  }
  if (fromFrets.length !== geometry.numStrings) {
    throw new Error(`expected ${geometry.numStrings} fret values`);
  }
  const pivotStrings: number[] = [];
  for (let stringIndex = 0; stringIndex < fromFrets.length; stringIndex++) {
    const fromFret = fromFrets[stringIndex];
    if (fromFret !== null && fromFret > 0 && fromFret === toFrets[stringIndex]) {
      pivotStrings.push(stringIndex);
    }
  }
  const fromFingering = solveFingering(fromFrets, { geometry });
  const toFingering = solveFingering(toFrets, { geometry });
  const fingerPivotStrings = fromFingering.valid && toFingering.valid
    ? pivotStrings.filter(stringIndex => {
        const fromFinger = fromFingering.fingers[stringIndex];
        const toFinger = toFingering.fingers[stringIndex];
        return fromFinger !== null && fromFinger === toFinger;
      })
    : [];
  let movedFingerCount = 0;
  let releasedFingerCount = 0;
  let placedFingerCount = 0;
  let fingerTravelMm = 0;
  let barreChangeCount = 0;
  if (fromFingering.valid && toFingering.valid) {
    for (let finger = 1; finger <= 4; finger++) {
      const fromSignature = placementSignature(fromFingering, finger);
      const toSignature = placementSignature(toFingering, finger);
      if (fromSignature === toSignature) continue;
      movedFingerCount++;
      if (fromSignature === null) placedFingerCount++;
      if (toSignature === null) releasedFingerCount++;
      const fromPoint = placementPoint(fromFingering, finger, geometry);
      const toPoint = placementPoint(toFingering, finger, geometry);
      if (fromPoint && toPoint) {
        fingerTravelMm += Math.hypot(
          fromPoint.longitudinalMm - toPoint.longitudinalMm,
          fromPoint.lateralMm - toPoint.lateralMm,
          fromPoint.surfaceRiseMm - toPoint.surfaceRiseMm
        );
      }
      const fromBarre = fromFingering.barres.find(barre => barre.finger === finger);
      const toBarre = toFingering.barres.find(barre => barre.finger === finger);
      const fromBarreSignature = fromBarre
        ? `${fromBarre.fret}:${fromBarre.fromString}:${fromBarre.toString}`
        : null;
      const toBarreSignature = toBarre
        ? `${toBarre.fret}:${toBarre.fromString}:${toBarre.toString}`
        : null;
      if (fromBarreSignature !== toBarreSignature) barreChangeCount++;
    }
  }
  const mutingChangeCount = fromFrets.reduce<number>((count, fret, stringIndex) =>
    count + ((fret === null) !== (toFrets[stringIndex] === null) ? 1 : 0), 0);
  const fromLayout = analyzeStringLayout(fromFrets);
  const toLayout = analyzeStringLayout(toFrets);
  const fromCenterFret = voicingCenterFret(fromFrets);
  const toCenterFret = voicingCenterFret(toFrets);
  const fromCenterMm = voicingCenterMm(fromFrets, geometry);
  const toCenterMm = voicingCenterMm(toFrets, geometry);
  const signedCenterShiftFrets = toCenterFret - fromCenterFret;
  const signedCenterShiftMm = toCenterMm - fromCenterMm;
  return {
    pivotCount: pivotStrings.length,
    pivotStrings,
    fromCenterFret,
    toCenterFret,
    signedCenterShiftFrets,
    centerShiftFrets: Math.abs(signedCenterShiftFrets),
    fromCenterMm,
    toCenterMm,
    signedCenterShiftMm,
    centerShiftMm: Math.abs(signedCenterShiftMm),
    retainedFretCount: pivotStrings.length,
    fingerPivotCount: fingerPivotStrings.length,
    fingerPivotStrings,
    movedFingerCount,
    releasedFingerCount,
    placedFingerCount,
    fingerTravelMm,
    barreChangeCount,
    mutingChangeCount,
    fromStringSkipCount: fromLayout.stringSkipCount,
    toStringSkipCount: toLayout.stringSkipCount,
    stringSkipDelta: toLayout.stringSkipCount - fromLayout.stringSkipCount
  };
}
