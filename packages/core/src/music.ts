export type VoicingMode = 'style' | 'traditional';

export type EnsembleInstrument =
  | 'guitar'
  | 'bass'
  | 'keyboard'
  | 'secondGuitar'
  | 'vocals'
  | 'drums'
  | 'other';

export interface EnsembleContext {
  mode: VoicingMode;
  instruments: readonly EnsembleInstrument[];
}

export type ChordSuffix =
  | ''
  | 'm'
  | 'sus4'
  | 'sus2'
  | 'dim'
  | 'maj7'
  | 'min9'
  | 'm9'
  | '7'
  | 'maj9'
  | 'm7'
  | 'min7'
  | 'add9'
  | '5'
  | '6'
  | '9'
  | 'dim7'
  | 'm7b5'
  | 'aug'
  | '11'
  | 'm11'
  | '13'
  | 'm13';

export interface ChordDefinition {
  suffix: ChordSuffix;
  requiredIntervals: readonly number[];
  optionalIntervals: readonly number[];
}

export interface ParsedChord {
  symbol: string;
  root: string;
  rootPitchClass: number;
  suffix: ChordSuffix;
  definition: ChordDefinition;
  requiredIntervals: readonly number[];
  optionalIntervals: readonly number[];
  chordIntervals: readonly number[];
  requiredPitchClasses: readonly number[];
  optionalPitchClasses: readonly number[];
  chordPitchClasses: readonly number[];
}

export interface ChordTensionPolicy {
  allowedIntervals: readonly number[];
  requiredIntervals?: readonly number[];
}

export interface ChordValidationOptions {
  context?: EnsembleContext;
  tensionPolicy?: ChordTensionPolicy;
  requireComplete?: boolean;
}

export interface ChordPitchClassValidation {
  valid: boolean;
  exact: boolean;
  pitchClasses: readonly number[];
  allowedPitchClasses: readonly number[];
  missingRequiredPitchClasses: readonly number[];
  foreignPitchClasses: readonly number[];
  tensionPitchClasses: readonly number[];
}

export interface RecognizedChord {
  symbol: string;
  root: string;
  rootPitchClass: number;
  suffix: ChordSuffix;
  pitchClasses: readonly number[];
  omittedOptionalIntervals: readonly number[];
  complete: boolean;
}

export const CHORD_DEFINITIONS: Readonly<Record<ChordSuffix, ChordDefinition>> = {
  '': { suffix: '', requiredIntervals: [0, 4], optionalIntervals: [7] },
  m: { suffix: 'm', requiredIntervals: [0, 3], optionalIntervals: [7] },
  sus4: { suffix: 'sus4', requiredIntervals: [0, 5], optionalIntervals: [7] },
  sus2: { suffix: 'sus2', requiredIntervals: [0, 2], optionalIntervals: [7] },
  dim: { suffix: 'dim', requiredIntervals: [0, 3, 6], optionalIntervals: [] },
  maj7: { suffix: 'maj7', requiredIntervals: [0, 4, 11], optionalIntervals: [7] },
  min9: { suffix: 'min9', requiredIntervals: [0, 3, 10, 2], optionalIntervals: [7] },
  m9: { suffix: 'm9', requiredIntervals: [0, 3, 10, 2], optionalIntervals: [7] },
  '7': { suffix: '7', requiredIntervals: [0, 4, 10], optionalIntervals: [7] },
  maj9: { suffix: 'maj9', requiredIntervals: [0, 4, 11, 2], optionalIntervals: [7] },
  m7: { suffix: 'm7', requiredIntervals: [0, 3, 10], optionalIntervals: [7] },
  min7: { suffix: 'min7', requiredIntervals: [0, 3, 10], optionalIntervals: [7] },
  add9: { suffix: 'add9', requiredIntervals: [0, 4, 2], optionalIntervals: [7] },
  '5': { suffix: '5', requiredIntervals: [0, 7], optionalIntervals: [] },
  '6': { suffix: '6', requiredIntervals: [0, 4, 9], optionalIntervals: [7] },
  '9': { suffix: '9', requiredIntervals: [0, 4, 10, 2], optionalIntervals: [7] },
  dim7: { suffix: 'dim7', requiredIntervals: [0, 3, 6, 9], optionalIntervals: [] },
  m7b5: { suffix: 'm7b5', requiredIntervals: [0, 3, 6, 10], optionalIntervals: [] },
  aug: { suffix: 'aug', requiredIntervals: [0, 4, 8], optionalIntervals: [] },
  '11': { suffix: '11', requiredIntervals: [0, 10, 2, 5], optionalIntervals: [4, 7] },
  m11: { suffix: 'm11', requiredIntervals: [0, 3, 10, 5], optionalIntervals: [2, 7] },
  '13': { suffix: '13', requiredIntervals: [0, 4, 10, 9], optionalIntervals: [2, 5, 7] },
  m13: { suffix: 'm13', requiredIntervals: [0, 3, 10, 9], optionalIntervals: [2, 5, 7] }
};

export const INTERVAL_ROLE_LABELS: Readonly<Record<number, string>> = {
  0: 'Root',
  1: 'Minor 2nd / Flat 9th',
  2: 'Major 2nd / 9th',
  3: 'Minor 3rd',
  4: 'Major 3rd',
  5: 'Perfect 4th / 11th',
  6: 'Tritone / Flat 5th',
  7: 'Perfect 5th',
  8: 'Minor 6th / Flat 13th',
  9: 'Major 6th / 13th',
  10: 'Minor 7th',
  11: 'Major 7th'
};

const NOTE_PITCH_CLASSES: Readonly<Record<string, number>> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11
};

const PITCH_CLASS_NAMES: readonly string[] = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B'
];

const CANONICAL_SUFFIXES: readonly ChordSuffix[] = [
  '5',
  'dim7',
  'm7b5',
  'aug',
  'dim',
  'maj9',
  'm9',
  '9',
  'm11',
  '11',
  'm13',
  '13',
  'maj7',
  'm7',
  'add9',
  '6',
  'sus2',
  'sus4',
  'm',
  ''
];

const DEFAULT_VALIDATION_CONTEXT: EnsembleContext = {
  mode: 'traditional',
  instruments: ['guitar']
};

function normalizePitchClass(value: number): number {
  return ((value % 12) + 12) % 12;
}

function uniquePitchClasses(values: readonly number[]): number[] {
  return [...new Set(values.map(normalizePitchClass))].sort((left, right) => left - right);
}

export function noteNameToPitchClass(noteName: string): number {
  const match = noteName.match(/^([A-G])([#b]?)$/i);
  if (!match) {
    throw new Error(`Invalid note name: ${noteName}`);
  }

  const letter = match[1].toUpperCase();
  const accidental = match[2].toLowerCase();
  const naturalPitchClass = NOTE_PITCH_CLASSES[letter];
  const accidentalOffset = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0;
  return normalizePitchClass(naturalPitchClass + accidentalOffset);
}

export function getIntervalRoleLabel(interval: number): string {
  return INTERVAL_ROLE_LABELS[normalizePitchClass(interval)];
}

export function parseChord(symbol: string): ParsedChord {
  const normalizedSymbol = symbol.trim();
  const match = normalizedSymbol.match(/^([A-G])([#b]?)(.*)$/i);
  if (!match) {
    throw new Error(`Invalid chord format: ${symbol}`);
  }

  const accidental = match[2].toLowerCase();
  const root = `${match[1].toUpperCase()}${accidental}`;
  const suffix = match[3].trim().toLowerCase();
  if (!(suffix in CHORD_DEFINITIONS)) {
    throw new Error(`Unsupported chord suffix: ${suffix}`);
  }

  const typedSuffix = suffix as ChordSuffix;
  const definition = CHORD_DEFINITIONS[typedSuffix];
  const rootPitchClass = noteNameToPitchClass(root);
  const requiredIntervals = [...definition.requiredIntervals];
  const optionalIntervals = [...definition.optionalIntervals];
  const chordIntervals = [...requiredIntervals, ...optionalIntervals];
  const toPitchClass = (interval: number) => normalizePitchClass(rootPitchClass + interval);

  return {
    symbol: normalizedSymbol,
    root,
    rootPitchClass,
    suffix: typedSuffix,
    definition,
    requiredIntervals,
    optionalIntervals,
    chordIntervals,
    requiredPitchClasses: requiredIntervals.map(toPitchClass),
    optionalPitchClasses: optionalIntervals.map(toPitchClass),
    chordPitchClasses: chordIntervals.map(toPitchClass)
  };
}

export function rootRequired(context: EnsembleContext): boolean {
  return context.mode === 'traditional' || !context.instruments.includes('bass');
}

export const isRootRequired = rootRequired;

export function getRequiredIntervals(
  definition: ChordDefinition,
  context: EnsembleContext
): readonly number[] {
  const traditionalTriads: readonly ChordSuffix[] = ['', 'm', 'sus4', 'sus2'];
  const baseIntervals = context.mode === 'traditional' && traditionalTriads.includes(definition.suffix)
    ? [...definition.requiredIntervals, ...definition.optionalIntervals]
    : [...definition.requiredIntervals];
  if (rootRequired(context)) {
    return baseIntervals;
  }
  return baseIntervals.filter(interval => normalizePitchClass(interval) !== 0);
}

export function validateChordPitchClasses(
  pitchClasses: readonly number[],
  chord: string | ParsedChord,
  options: ChordValidationOptions = {}
): ChordPitchClassValidation {
  const parsedChord = typeof chord === 'string' ? parseChord(chord) : chord;
  const normalizedPitchClasses = uniquePitchClasses(pitchClasses);
  const requiredIntervals = getRequiredIntervals(
    parsedChord.definition,
    options.context ?? DEFAULT_VALIDATION_CONTEXT
  );
  const requiredTensionIntervals = uniquePitchClasses(options.tensionPolicy?.requiredIntervals ?? []);
  const tensionIntervals = uniquePitchClasses([
    ...(options.tensionPolicy?.allowedIntervals ?? []),
    ...requiredTensionIntervals
  ]);
  const basePitchClasses = uniquePitchClasses(parsedChord.chordPitchClasses);
  const tensionPitchClasses = tensionIntervals.map(interval =>
    normalizePitchClass(parsedChord.rootPitchClass + interval)
  );
  const allowedPitchClasses = uniquePitchClasses([...basePitchClasses, ...tensionPitchClasses]);
  const requiredPitchClasses = uniquePitchClasses([
    ...requiredIntervals.map(interval => parsedChord.rootPitchClass + interval),
    ...requiredTensionIntervals.map(interval => parsedChord.rootPitchClass + interval)
  ]);
  const missingRequiredPitchClasses = requiredPitchClasses.filter(
    pitchClass => !normalizedPitchClasses.includes(pitchClass)
  );
  const foreignPitchClasses = normalizedPitchClasses.filter(
    pitchClass => !allowedPitchClasses.includes(pitchClass)
  );
  const presentTensionPitchClasses = normalizedPitchClasses.filter(
    pitchClass => tensionPitchClasses.includes(pitchClass) && !basePitchClasses.includes(pitchClass)
  );
  const complete = options.requireComplete !== false
    ? missingRequiredPitchClasses.length === 0
    : true;

  return {
    valid: complete && foreignPitchClasses.length === 0,
    exact: complete && foreignPitchClasses.length === 0 && presentTensionPitchClasses.length === 0,
    pitchClasses: normalizedPitchClasses,
    allowedPitchClasses,
    missingRequiredPitchClasses,
    foreignPitchClasses,
    tensionPitchClasses: presentTensionPitchClasses
  };
}

export function recognizeChordSymbol(
  pitchClasses: readonly number[],
  preferredRoot?: string | number
): RecognizedChord | null {
  const normalizedPitchClasses = uniquePitchClasses(pitchClasses);
  if (normalizedPitchClasses.length < 2) {
    return null;
  }

  const preferredRootPitchClass = typeof preferredRoot === 'string'
    ? noteNameToPitchClass(preferredRoot)
    : preferredRoot === undefined
      ? undefined
      : normalizePitchClass(preferredRoot);
  const candidateRoots = preferredRootPitchClass === undefined
    ? normalizedPitchClasses
    : [preferredRootPitchClass];
  const candidates: Array<RecognizedChord & { score: number }> = [];

  for (const rootPitchClass of candidateRoots) {
    for (const suffix of CANONICAL_SUFFIXES) {
      const definition = CHORD_DEFINITIONS[suffix];
      const presentIntervals = uniquePitchClasses(
        normalizedPitchClasses.map(pitchClass => pitchClass - rootPitchClass)
      );
      const allowedIntervals = uniquePitchClasses([
        ...definition.requiredIntervals,
        ...definition.optionalIntervals
      ]);
      const requiredIntervals = uniquePitchClasses(definition.requiredIntervals);
      if (
        requiredIntervals.some(interval => !presentIntervals.includes(interval)) ||
        presentIntervals.some(interval => !allowedIntervals.includes(interval))
      ) {
        continue;
      }

      const omittedOptionalIntervals = uniquePitchClasses(definition.optionalIntervals).filter(
        interval => !presentIntervals.includes(interval)
      );
      const root = typeof preferredRoot === 'string'
        ? `${preferredRoot[0].toUpperCase()}${preferredRoot.slice(1).toLowerCase()}`
        : PITCH_CLASS_NAMES[rootPitchClass];
      candidates.push({
        symbol: `${root}${suffix}`,
        root,
        rootPitchClass,
        suffix,
        pitchClasses: normalizedPitchClasses,
        omittedOptionalIntervals,
        complete: omittedOptionalIntervals.length === 0,
        score: requiredIntervals.length * 100 + presentIntervals.length * 10 - omittedOptionalIntervals.length
      });
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((left, right) => right.score - left.score);
  if (
    preferredRootPitchClass === undefined &&
    candidates.length > 1 &&
    candidates[0].score === candidates[1].score
  ) {
    return null;
  }

  const { score: _score, ...recognizedChord } = candidates[0];
  return recognizedChord;
}
