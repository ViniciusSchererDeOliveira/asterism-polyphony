import {
  analyzeAllFourthsDegreeMovement,
  parseNoteToMidi,
  type DegreeMovementAnalysis,
  type GuitarConfig,
  type NoteRoleDetail,
  type VoicingAnalysis
} from '@guitar-paradigm/core';

export interface MovementDestination {
  role: NoteRoleDetail;
  index: number;
  movement: DegreeMovementAnalysis;
}

export interface MovementPresentation {
  allFourths: boolean;
  roles: NoteRoleDetail[];
  rootIndex: number;
  anchorIndex: number;
  anchor: NoteRoleDetail | undefined;
  destinations: MovementDestination[];
}

export function buildMovementPresentation(
  analysis: VoicingAnalysis | null | undefined,
  config: GuitarConfig
): MovementPresentation {
  const roles = analysis?.noteRoles ?? [];
  const rootIndex = roles.findIndex(role => role.interval === 0);
  const proxyIndex = roles.findIndex(role => role.deltaString === 0 && role.deltaFret === 0);
  const anchorIndex = rootIndex >= 0 ? rootIndex : Math.max(0, proxyIndex);
  const anchor = roles[anchorIndex];
  const allFourths = config.tuning.every((note, index) => (
    index === 0 || parseNoteToMidi(note) - parseNoteToMidi(config.tuning[index - 1]) === 5
  ));
  const uniqueRoles = roles
    .map((role, index) => ({ role, index }))
    .filter(({ role }, position, all) => all.findIndex(item => item.role.interval === role.interval) === position);
  const ordered = [
    uniqueRoles.find(({ role }) => role.interval === 3 || role.interval === 4),
    uniqueRoles.find(({ role }) => role.interval === 7),
    ...uniqueRoles.filter(({ role, index }) => (
      index !== anchorIndex
      && role.interval !== 3
      && role.interval !== 4
      && role.interval !== 7
    ))
  ]
    .filter((item): item is { role: NoteRoleDetail; index: number } => Boolean(item))
    .filter(item => item.index !== anchorIndex);
  const destinations = allFourths && anchor
    ? ordered.map(item => ({
      ...item,
      movement: analyzeAllFourthsDegreeMovement(anchor, item.role, config)
    }))
    : [];

  return { allFourths, roles, rootIndex, anchorIndex, anchor, destinations };
}
