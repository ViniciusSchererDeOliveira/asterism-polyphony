import { noteNameToPitchClass, parseChord } from './music.js';
import type { VoicingRequest } from './contracts.js';

const STYLE_PRESETS = new Set(['worship', 'jrock', 'mathrock', 'metalcore']);
const VOICING_MODES = new Set(['style', 'traditional']);
const ACOUSTIC_PROFILES = new Set(['auto', 'clean', 'crunch', 'highGain']);
const PREFERENCE_WEIGHTS = new Set([
  'playability',
  'frequency',
  'harmonic',
  'style',
  'traditional',
  'transition',
  'position'
]);
const ENSEMBLE_INSTRUMENTS = new Set([
  'guitar',
  'bass',
  'keyboard',
  'secondGuitar',
  'vocals',
  'drums',
  'other'
]);

function requireFinite(value: number, field: string): void {
  if (!Number.isFinite(value)) throw new Error(`${field} must be a finite number`);
}

function requirePositive(value: number, field: string): void {
  requireFinite(value, field);
  if (value <= 0) throw new Error(`${field} must be greater than 0`);
}

function requirePositiveInteger(value: number, field: string): void {
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${field} must be a positive integer`);
}

function validateTuningNote(note: string, index: number): void {
  const match = note.match(/^([A-G])([#b]?)(-?\d+)$/i);
  if (!match) throw new Error(`guitarConfig.tuning[${index}] has an invalid note format`);
  noteNameToPitchClass(`${match[1]}${match[2]}`);
}

function validateEnsemble(request: VoicingRequest): void {
  const ensemble = request.ensemble;
  if (!ensemble) return;
  const mode = Array.isArray(ensemble) ? request.mode : ensemble.mode;
  const instruments = Array.isArray(ensemble) ? ensemble : ensemble.instruments;
  if (mode !== undefined && !VOICING_MODES.has(mode)) {
    throw new Error('mode must be style or traditional');
  }
  for (const instrument of instruments) {
    if (!ENSEMBLE_INSTRUMENTS.has(instrument)) {
      throw new Error(`Unsupported ensemble instrument: ${instrument}`);
    }
  }
}

export function validateVoicingRequest(request: VoicingRequest): void {
  if (!request || typeof request !== 'object') throw new Error('Voicing request is required');

  const parsed = parseChord(request.chord ?? '');
  if (typeof request.rootNote !== 'string' || request.rootNote.length === 0) {
    throw new Error('rootNote is required');
  }
  if (noteNameToPitchClass(request.rootNote) !== parsed.rootPitchClass) {
    throw new Error('rootNote must match the chord root');
  }
  if (!STYLE_PRESETS.has(request.stylePreset)) {
    throw new Error(`Unsupported style preset: ${request.stylePreset}`);
  }
  if (request.mode !== undefined && !VOICING_MODES.has(request.mode)) {
    throw new Error('mode must be style or traditional');
  }

  const guitar = request.guitarConfig;
  if (!guitar || typeof guitar !== 'object') throw new Error('guitarConfig is required');
  if (!Number.isInteger(guitar.numStrings) || guitar.numStrings <= 0) {
    throw new Error('Number of strings must be greater than 0');
  }
  if (!Number.isInteger(guitar.numFrets) || guitar.numFrets < 0) {
    throw new Error('guitarConfig.numFrets must be a non-negative integer');
  }
  if (!Array.isArray(guitar.tuning) || guitar.tuning.length !== guitar.numStrings) {
    throw new Error('Tuning must contain one note per string');
  }
  guitar.tuning.forEach(validateTuningNote);
  for (const [field, value] of Object.entries({
    scaleLengthMm: guitar.scaleLengthMm,
    nutWidthMm: guitar.nutWidthMm,
    widthAtLastFretMm: guitar.widthAtLastFretMm,
    fretboardRadiusMm: guitar.fretboardRadiusMm,
    stringSpacingMm: guitar.stringSpacingMm
  })) {
    if (value !== undefined) requirePositive(value, `guitarConfig.${field}`);
  }

  const fingers = request.fingerConstraints;
  if (!fingers || typeof fingers !== 'object') throw new Error('fingerConstraints is required');
  for (const [field, value] of Object.entries({
    indexLength: fingers.indexLength,
    middleLength: fingers.middleLength,
    ringLength: fingers.ringLength,
    pinkyLength: fingers.pinkyLength
  })) {
    requirePositive(value, `fingerConstraints.${field}`);
  }
  if (!Number.isInteger(fingers.maxSpan) || fingers.maxSpan < 0) {
    throw new Error('fingerConstraints.maxSpan must be a non-negative integer');
  }
  if (typeof fingers.tendonMuting !== 'boolean') {
    throw new Error('fingerConstraints.tendonMuting must be boolean');
  }
  if (fingers.maxReachMm !== undefined) {
    requirePositive(fingers.maxReachMm, 'fingerConstraints.maxReachMm');
  }

  if (request.gravityCenter !== undefined) {
    requireFinite(request.gravityCenter, 'gravityCenter');
    if (request.gravityCenter < 0 || request.gravityCenter > guitar.numFrets) {
      throw new Error('gravityCenter must be within the fretboard');
    }
  }
  if (request.searchRadiusFrets !== undefined) {
    requireFinite(request.searchRadiusFrets, 'searchRadiusFrets');
    if (request.searchRadiusFrets < 0) throw new Error('searchRadiusFrets must be non-negative');
  }
  if (request.searchBudget !== undefined) {
    requirePositiveInteger(request.searchBudget, 'searchBudget');
  }
  if (request.maxResults !== undefined) {
    requirePositiveInteger(request.maxResults, 'maxResults');
  }

  const minimumClarity = request.policy?.minimumClarity;
  if (minimumClarity !== undefined) {
    requireFinite(minimumClarity, 'policy.minimumClarity');
    if (minimumClarity < 0 || minimumClarity > 100) {
      throw new Error('policy.minimumClarity must be between 0 and 100');
    }
  }
  const profile = request.policy?.acousticProfile;
  if (profile !== undefined && !ACOUSTIC_PROFILES.has(profile)) {
    throw new Error(`Unsupported acoustic profile: ${profile}`);
  }
  for (const field of ['allowExtensions', 'allowRootlessWithBass'] as const) {
    const value = request.policy?.[field];
    if (value !== undefined && typeof value !== 'boolean') {
      throw new Error(`policy.${field} must be boolean`);
    }
  }

  const weights = request.preferenceProfile?.weights;
  if (weights) {
    for (const [field, value] of Object.entries(weights)) {
      if (!PREFERENCE_WEIGHTS.has(field)) {
        throw new Error(`Unsupported preference weight: ${field}`);
      }
      requireFinite(value, `preferenceProfile.weights.${field}`);
      if (value < 0) throw new Error(`preferenceProfile.weights.${field} must be non-negative`);
    }
  }
  for (const [index, voicing] of (request.contextVoicings ?? []).entries()) {
    if (voicing.frets.length !== guitar.numStrings) {
      throw new Error(`contextVoicings[${index}] must contain one fret per string`);
    }
    for (const fret of voicing.frets) {
      if (fret !== null && (!Number.isInteger(fret) || fret < 0 || fret > guitar.numFrets)) {
        throw new Error(`contextVoicings[${index}] contains an invalid fret`);
      }
    }
  }
  validateEnsemble(request);
}
