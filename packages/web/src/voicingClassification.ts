import type { ChordVoicing } from '@guitar-paradigm/core';

const DEGREE_LABELS: Record<number, string> = {
  0: 'I',
  1: '♭II',
  2: 'II',
  3: '♭III',
  4: 'III',
  5: 'IV',
  6: '♭V',
  7: 'V',
  8: '♭VI',
  9: 'VI',
  10: '♭VII',
  11: 'VII'
};

export function voicingClassification(voicing: ChordVoicing | null): string {
  if (!voicing) return 'Searching exact voicings';
  const omitted = voicing.omittedIntervals ?? [];
  const extensions = voicing.droneIntervals ?? [];
  if (omitted.includes(0)) return 'Ensemble-complete · bass supplies I';
  if (omitted.length > 0) {
    const degrees = omitted.map(interval => DEGREE_LABELS[interval] ?? `${interval} ST`).join(', ');
    return `Valid shell · ${degrees} omitted`;
  }
  if (extensions.length > 0) return 'Extended guitar voicing';
  return voicing.exactChord === false ? 'Valid guitar voicing' : 'Exact guitar voicing';
}
