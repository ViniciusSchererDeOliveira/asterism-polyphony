export interface HarmonicPosition {
  midi: number;
  interval: number;
}

export interface RegisterMovement {
  harmonicSemitones: number;
  voicingSemitones: number;
  registerOffsetOctaves: number;
  logicalDestinationMidi: number;
  hasRegisterShift: boolean;
  usesDescendingRegisterFold: boolean;
}

export type MovementGeometry = 'anchor' | 'axis' | 'exact-diagonal' | 'composite';
export type DegreePiece = 'king' | 'rook' | 'bishop' | 'knight' | 'queen';
export type DegreeRuleStatus = 'selected' | 'available' | 'blocked';
export type DegreeRuleBlock = 'nut' | 'fretboard-end' | 'string-boundary';

export interface AllFourthsPosition extends HarmonicPosition {
  stringIdx: number;
  fret: number;
}

export interface AllFourthsBoard {
  numStrings: number;
  numFrets: number;
}

export interface DegreeRuleLanding {
  stringIdx: number;
  fret: number;
  midi: number;
}

export interface DegreeRule {
  id: string;
  degreeInterval: number;
  piece: DegreePiece;
  deltaString: number;
  deltaFret: number;
  semitoneDelta: number;
  octaveOffset: number;
  geometry: MovementGeometry;
}

export interface DegreeRuleOption extends DegreeRule {
  landing: DegreeRuleLanding;
  status: DegreeRuleStatus;
  blockedBy?: DegreeRuleBlock;
}

export interface DegreePortal {
  kind: 'register' | 'unison-reposition';
  placement: 'before-rule' | 'after-rule';
  entry: DegreeRuleLanding;
  exit: DegreeRuleLanding;
  octaveDelta: number;
  fallbackBy?: DegreeRuleBlock;
}

export interface DegreeRoute {
  order: 'direct' | 'portal-first' | 'rule-first';
  origin: DegreeRuleLanding;
  landing: DegreeRuleLanding;
}

export interface DegreeMovementAnalysis {
  degreeInterval: number;
  primaryRule: DegreeRuleOption;
  selectedRule: DegreeRuleOption;
  rules: DegreeRuleOption[];
  route: DegreeRoute;
  portal: DegreePortal | null;
}

const PRIMARY_VECTORS: Record<number, readonly [number, number]> = {
  0: [0, 0],
  1: [0, 1],
  2: [0, 2],
  3: [1, -2],
  4: [1, -1],
  5: [1, 0],
  6: [1, 1],
  7: [1, 2],
  8: [2, -2],
  9: [2, -1],
  10: [2, 0],
  11: [2, 1]
};

function normalizeInterval(value: number): number {
  return ((value % 12) + 12) % 12;
}

function ruleCost(rule: Pick<DegreeRule, 'deltaString' | 'deltaFret'>): number {
  return Math.abs(rule.deltaString) * 1.75 + Math.abs(rule.deltaFret);
}

function ruleBlock(landing: DegreeRuleLanding, board: AllFourthsBoard): DegreeRuleBlock | undefined {
  if (landing.stringIdx < 0 || landing.stringIdx >= board.numStrings) return 'string-boundary';
  if (landing.fret < 0) return 'nut';
  if (landing.fret > board.numFrets) return 'fretboard-end';
  return undefined;
}

function point(position: AllFourthsPosition | DegreeRuleLanding): DegreeRuleLanding {
  return {
    stringIdx: position.stringIdx,
    fret: position.fret,
    midi: position.midi
  };
}

function samePoint(left: DegreeRuleLanding, right: DegreeRuleLanding): boolean {
  return left.stringIdx === right.stringIdx
    && left.fret === right.fret
    && left.midi === right.midi;
}

function createRule(
  id: string,
  degreeInterval: number,
  deltaString: number,
  deltaFret: number,
  anchor: AllFourthsPosition,
  board: AllFourthsBoard
): DegreeRuleOption {
  const semitoneDelta = 5 * deltaString + deltaFret;
  const octaveOffset = (semitoneDelta - degreeInterval) / 12;
  if (!Number.isInteger(octaveOffset)) {
    throw new Error('Degree rule does not preserve the requested pitch class');
  }

  const landing = {
    stringIdx: anchor.stringIdx + deltaString,
    fret: anchor.fret + deltaFret,
    midi: anchor.midi + semitoneDelta
  };
  const blockedBy = ruleBlock(landing, board);
  return {
    id,
    degreeInterval,
    piece: degreePieceForVector(deltaString, deltaFret),
    deltaString,
    deltaFret,
    semitoneDelta,
    octaveOffset,
    geometry: classifyMovementGeometry(deltaString, deltaFret),
    landing,
    status: blockedBy ? 'blocked' : 'available',
    ...(blockedBy ? { blockedBy } : {})
  };
}

export function classifyMovementGeometry(deltaString: number, deltaFret: number): MovementGeometry {
  if (deltaString === 0 && deltaFret === 0) return 'anchor';
  if (deltaString === 0 || deltaFret === 0) return 'axis';
  if (Math.abs(deltaString) === Math.abs(deltaFret)) return 'exact-diagonal';
  return 'composite';
}

export function degreePieceForVector(deltaString: number, deltaFret: number): DegreePiece {
  const geometry = classifyMovementGeometry(deltaString, deltaFret);
  if (geometry === 'anchor') return 'king';
  if (geometry === 'axis') return 'rook';
  if (geometry === 'exact-diagonal') return 'bishop';
  const dimensions = [Math.abs(deltaString), Math.abs(deltaFret)].sort((a, b) => a - b);
  if (dimensions[0] === 1 && dimensions[1] === 2) return 'knight';
  return 'queen';
}

export function degreePieceForInterval(interval: number): DegreePiece {
  const normalized = normalizeInterval(interval);
  const [deltaString, deltaFret] = PRIMARY_VECTORS[normalized];
  return degreePieceForVector(deltaString, deltaFret);
}

export function analyzeAllFourthsDegreeMovement(
  anchor: AllFourthsPosition,
  destination: AllFourthsPosition,
  board: AllFourthsBoard
): DegreeMovementAnalysis {
  const degreeInterval = normalizeInterval(destination.interval - anchor.interval);
  if (degreeInterval === 0) {
    throw new Error('The root anchor has no outgoing degree rule');
  }
  const physicalSemitones = 5 * (destination.stringIdx - anchor.stringIdx)
    + destination.fret - anchor.fret;
  if (physicalSemitones !== destination.midi - anchor.midi) {
    throw new Error('Positions do not describe an all-fourths fretboard');
  }
  if (!Number.isInteger((destination.midi - anchor.midi - degreeInterval) / 12)) {
    throw new Error('Destination MIDI and degree describe different pitch classes');
  }

  const [primaryStrings, primaryFrets] = PRIMARY_VECTORS[degreeInterval];
  const candidates = [
    createRule('primary', degreeInterval, primaryStrings, primaryFrets, anchor, board),
    createRule('same-string-up', degreeInterval, 0, degreeInterval, anchor, board),
    createRule('one-string-up', degreeInterval, 1, degreeInterval - 5, anchor, board),
    createRule('two-strings-up', degreeInterval, 2, degreeInterval - 10, anchor, board),
    createRule('same-string-down', degreeInterval, 0, degreeInterval - 12, anchor, board),
    createRule('one-string-down', degreeInterval, -1, degreeInterval + 5, anchor, board),
    createRule('two-strings-down', degreeInterval, -2, degreeInterval + 10, anchor, board)
  ];
  const uniqueRules = candidates.filter((candidate, index, all) => (
    all.findIndex(rule => (
      rule.deltaString === candidate.deltaString && rule.deltaFret === candidate.deltaFret
    )) === index
  ));
  const primaryRule = uniqueRules[0];
  const destinationPoint = point(destination);
  const routePriority = (rule: DegreeRuleOption) => {
    if (samePoint(rule.landing, destinationPoint)) return 0;
    const translatedOrigin = {
      stringIdx: destination.stringIdx - rule.deltaString,
      fret: destination.fret - rule.deltaFret,
      midi: destination.midi - rule.semitoneDelta
    };
    if (ruleBlock(translatedOrigin, board) === undefined) return 1;
    if (rule.status === 'available') return 2;
    return 3;
  };
  const primaryPriority = routePriority(primaryRule);
  const alternativeRules = uniqueRules
    .slice(1)
    .filter(rule => routePriority(rule) < 3)
    .sort((left, right) => (
      routePriority(left) - routePriority(right) || ruleCost(left) - ruleCost(right)
    ));
  const selectedCandidate = primaryPriority < 3 ? primaryRule : alternativeRules[0];

  if (!selectedCandidate) {
    throw new Error('No playable all-fourths degree rule exists from this anchor');
  }

  const rules = uniqueRules.map(rule => (
    rule === selectedCandidate ? { ...rule, status: 'selected' as const } : rule
  ));
  const selectedRule = rules.find(rule => rule.status === 'selected')!;
  const resolvedPrimary = rules[0];
  const anchorPoint = point(anchor);
  const directLanding = samePoint(selectedRule.landing, destinationPoint);
  const translatedOrigin = {
    stringIdx: destination.stringIdx - selectedRule.deltaString,
    fret: destination.fret - selectedRule.deltaFret,
    midi: destination.midi - selectedRule.semitoneDelta
  };
  const translatedOriginBlock = ruleBlock(translatedOrigin, board);

  if (directLanding) {
    return {
      degreeInterval,
      primaryRule: resolvedPrimary,
      selectedRule,
      rules,
      route: {
        order: 'direct',
        origin: anchorPoint,
        landing: destinationPoint
      },
      portal: null
    };
  }

  const portalBeforeRule = translatedOriginBlock === undefined;
  const routeOrigin = portalBeforeRule ? translatedOrigin : anchorPoint;
  const routeLanding = portalBeforeRule ? destinationPoint : selectedRule.landing;
  const portalEntry = portalBeforeRule ? anchorPoint : selectedRule.landing;
  const portalExit = portalBeforeRule ? translatedOrigin : destinationPoint;
  const rawPortalOctaves = (portalExit.midi - portalEntry.midi) / 12;
  const portalOctaves = Object.is(rawPortalOctaves, -0) ? 0 : rawPortalOctaves;

  if (!Number.isInteger(portalOctaves)) {
    throw new Error('Portal endpoints do not preserve pitch class');
  }

  return {
    degreeInterval,
    primaryRule: resolvedPrimary,
    selectedRule,
    rules,
    route: {
      order: portalBeforeRule ? 'portal-first' : 'rule-first',
      origin: routeOrigin,
      landing: routeLanding
    },
    portal: {
      kind: portalOctaves === 0 ? 'unison-reposition' : 'register',
      placement: portalBeforeRule ? 'before-rule' : 'after-rule',
      entry: portalEntry,
      exit: portalExit,
      octaveDelta: portalOctaves,
      ...(translatedOriginBlock ? { fallbackBy: translatedOriginBlock } : {})
    }
  };
}

export function analyzeRegisterMovement(
  origin: HarmonicPosition,
  destination: HarmonicPosition
): RegisterMovement {
  const harmonicSemitones = normalizeInterval(destination.interval - origin.interval);
  const voicingSemitones = destination.midi - origin.midi;
  const octaveDelta = (voicingSemitones - harmonicSemitones) / 12;

  if (!Number.isInteger(octaveDelta)) {
    throw new Error('MIDI positions and harmonic intervals describe different pitch classes');
  }

  return {
    harmonicSemitones,
    voicingSemitones,
    registerOffsetOctaves: octaveDelta,
    logicalDestinationMidi: origin.midi + harmonicSemitones,
    hasRegisterShift: octaveDelta !== 0,
    usesDescendingRegisterFold: harmonicSemitones > 0 && voicingSemitones < 0 && octaveDelta < 0
  };
}
