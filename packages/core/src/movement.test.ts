import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeAllFourthsDegreeMovement,
  analyzeRegisterMovement,
  classifyMovementGeometry,
  degreePieceForInterval
} from './movement.js';

describe('all-fourths degree movement', () => {
  const board = { numStrings: 6, numFrets: 24 };
  const root = { midi: 60, interval: 0, stringIdx: 4, fret: 0 };

  it('only classifies equal string and fret counts as a diagonal', () => {
    assert.equal(classifyMovementGeometry(1, 11), 'composite');
    assert.equal(classifyMovementGeometry(1, 1), 'exact-diagonal');
    assert.equal(classifyMovementGeometry(1, 2), 'composite');
    assert.equal(classifyMovementGeometry(0, 4), 'axis');
  });

  it('derives chess pieces from the canonical all-fourths vectors', () => {
    assert.equal(degreePieceForInterval(0), 'king');
    assert.equal(degreePieceForInterval(3), 'knight');
    assert.equal(degreePieceForInterval(4), 'bishop');
    assert.equal(degreePieceForInterval(5), 'rook');
    assert.equal(degreePieceForInterval(7), 'knight');
  });

  it('rejects an outgoing movement rule for the root anchor', () => {
    assert.throws(
      () => analyzeAllFourthsDegreeMovement(root, root, board),
      /root anchor has no outgoing degree rule/
    );
  });

  it('keeps every canonical degree rule pitch-correct on the regular lattice', () => {
    const centeredRoot = { midi: 60, interval: 0, stringIdx: 2, fret: 12 };
    const expectedVectors = [
      [0, 0], [0, 1], [0, 2], [1, -2], [1, -1], [1, 0],
      [1, 1], [1, 2], [2, -2], [2, -1], [2, 0], [2, 1]
    ];

    expectedVectors.slice(1).forEach(([deltaString, deltaFret], interval) => {
      const semitones = 5 * deltaString + deltaFret;
      const movement = analyzeAllFourthsDegreeMovement(
        centeredRoot,
        {
          midi: centeredRoot.midi + semitones,
          interval: interval + 1,
          stringIdx: centeredRoot.stringIdx + deltaString,
          fret: centeredRoot.fret + deltaFret
        },
        board
      );

      assert.equal(movement.primaryRule.deltaString, deltaString);
      assert.equal(movement.primaryRule.deltaFret, deltaFret);
      assert.equal(((semitones % 12) + 12) % 12, interval + 1);
      assert.equal(movement.portal, null);
    });
  });

  it('moves the root portal first when the translated Bishop origin stays on the board', () => {
    const movement = analyzeAllFourthsDegreeMovement(
      root,
      { midi: 76, interval: 4, stringIdx: 5, fret: 11 },
      board
    );

    assert.equal(movement.primaryRule.piece, 'bishop');
    assert.equal(movement.primaryRule.status, 'selected');
    assert.equal(movement.primaryRule.blockedBy, 'nut');
    assert.equal(movement.primaryRule.deltaString, 1);
    assert.equal(movement.primaryRule.deltaFret, -1);
    assert.equal(movement.selectedRule.piece, 'bishop');
    assert.equal(movement.route.order, 'portal-first');
    assert.deepEqual(movement.route.origin, { stringIdx: 4, fret: 12, midi: 72 });
    assert.deepEqual(movement.route.landing, { stringIdx: 5, fret: 11, midi: 76 });
    assert.equal(movement.portal?.kind, 'register');
    assert.equal(movement.portal?.placement, 'before-rule');
    assert.equal(movement.portal?.octaveDelta, 1);
    assert.deepEqual(movement.portal?.entry, { stringIdx: 4, fret: 0, midi: 60 });
    assert.deepEqual(movement.portal?.exit, movement.route.origin);
    assert.equal(movement.portal!.exit.midi - movement.portal!.entry.midi, movement.portal!.octaveDelta * 12);
  });

  it('uses the fifth knight rule before folding to the lower voicing register', () => {
    const movement = analyzeAllFourthsDegreeMovement(
      root,
      { midi: 55, interval: 7, stringIdx: 3, fret: 0 },
      board
    );

    assert.equal(movement.selectedRule.piece, 'knight');
    assert.equal(movement.selectedRule.deltaString, 1);
    assert.equal(movement.selectedRule.deltaFret, 2);
    assert.equal(movement.selectedRule.geometry, 'composite');
    assert.equal(movement.route.order, 'rule-first');
    assert.deepEqual(movement.route.origin, { stringIdx: 4, fret: 0, midi: 60 });
    assert.deepEqual(movement.route.landing, { stringIdx: 5, fret: 2, midi: 67 });
    assert.equal(movement.portal?.kind, 'register');
    assert.equal(movement.portal?.placement, 'after-rule');
    assert.equal(movement.portal?.fallbackBy, 'nut');
    assert.deepEqual(movement.portal?.entry, { stringIdx: 5, fret: 2, midi: 67 });
    assert.deepEqual(movement.portal?.exit, { stringIdx: 3, fret: 0, midi: 55 });
    assert.equal(movement.portal?.octaveDelta, -1);
    assert.equal(Math.abs((movement.portal!.exit.midi - movement.portal!.entry.midi) % 12), 0);
    assert.deepEqual(movement.portal?.entry, movement.selectedRule.landing);
    assert.equal(movement.portal!.exit.midi - movement.portal!.entry.midi, movement.portal!.octaveDelta * 12);
  });

  it('distinguishes a unison reposition from an octave register portal', () => {
    const movement = analyzeAllFourthsDegreeMovement(
      { midi: 55, interval: 0, stringIdx: 2, fret: 5 },
      { midi: 62, interval: 7, stringIdx: 4, fret: 2 },
      board
    );

    assert.equal(movement.portal?.kind, 'unison-reposition');
    assert.equal(movement.portal?.placement, 'before-rule');
    assert.equal(movement.portal?.octaveDelta, 0);
    assert.equal(movement.route.order, 'portal-first');
    assert.deepEqual(movement.route.origin, { stringIdx: 3, fret: 0, midi: 55 });
    assert.deepEqual(movement.route.landing, { stringIdx: 4, fret: 2, midi: 62 });
    assert.deepEqual(movement.portal?.entry, { stringIdx: 2, fret: 5, midi: 55 });
    assert.deepEqual(movement.portal?.exit, movement.route.origin);
    assert.equal(movement.portal?.entry.midi, movement.portal?.exit.midi);
    assert.notDeepEqual(
      [movement.portal?.entry.stringIdx, movement.portal?.entry.fret],
      [movement.portal?.exit.stringIdx, movement.portal?.exit.fret]
    );
  });

  it('omits a portal when the selected rule lands on the voicing itself', () => {
    const movement = analyzeAllFourthsDegreeMovement(
      { midi: 60, interval: 0, stringIdx: 2, fret: 5 },
      { midi: 67, interval: 7, stringIdx: 3, fret: 7 },
      board
    );

    assert.equal(movement.selectedRule.piece, 'knight');
    assert.equal(movement.route.order, 'direct');
    assert.deepEqual(movement.route.origin, { stringIdx: 2, fret: 5, midi: 60 });
    assert.deepEqual(movement.route.landing, { stringIdx: 3, fret: 7, midi: 67 });
    assert.equal(movement.portal, null);
  });

  it('keeps the rule before the portal when the translated root exceeds the fret limit', () => {
    const movement = analyzeAllFourthsDegreeMovement(
      { midi: 61, interval: 0, stringIdx: 4, fret: 1 },
      { midi: 77, interval: 4, stringIdx: 5, fret: 12 },
      { numStrings: 6, numFrets: 12 }
    );

    assert.equal(movement.selectedRule.piece, 'bishop');
    assert.equal(movement.route.order, 'rule-first');
    assert.equal(movement.portal?.placement, 'after-rule');
    assert.equal(movement.portal?.fallbackBy, 'fretboard-end');
    assert.deepEqual(movement.route.origin, { stringIdx: 4, fret: 1, midi: 61 });
    assert.deepEqual(movement.route.landing, { stringIdx: 5, fret: 0, midi: 65 });
    assert.deepEqual(movement.portal?.entry, movement.route.landing);
    assert.deepEqual(movement.portal?.exit, { stringIdx: 5, fret: 12, midi: 77 });
  });

  it('keeps the rule before the portal when the translated root exceeds the string limit', () => {
    const movement = analyzeAllFourthsDegreeMovement(
      { midi: 55, interval: 0, stringIdx: 2, fret: 5 },
      { midi: 62, interval: 7, stringIdx: 0, fret: 22 },
      board
    );

    assert.equal(movement.selectedRule.piece, 'knight');
    assert.equal(movement.route.order, 'rule-first');
    assert.equal(movement.portal?.placement, 'after-rule');
    assert.equal(movement.portal?.fallbackBy, 'string-boundary');
    assert.deepEqual(movement.route.origin, { stringIdx: 2, fret: 5, midi: 55 });
    assert.deepEqual(movement.route.landing, { stringIdx: 3, fret: 7, midi: 62 });
    assert.deepEqual(movement.portal?.entry, movement.route.landing);
    assert.deepEqual(movement.portal?.exit, { stringIdx: 0, fret: 22, midi: 62 });
  });
});

describe('register movement analysis', () => {
  it('separates a descending register fold from the harmonic step', () => {
    const movement = analyzeRegisterMovement(
      { midi: 76, interval: 4 },
      { midi: 55, interval: 7 }
    );

    assert.deepEqual(movement, {
      harmonicSemitones: 3,
      voicingSemitones: -21,
      registerOffsetOctaves: -2,
      logicalDestinationMidi: 79,
      hasRegisterShift: true,
      usesDescendingRegisterFold: true
    });
  });

  it('keeps an ascending register expansion distinct from a portal fold', () => {
    const movement = analyzeRegisterMovement(
      { midi: 60, interval: 0 },
      { midi: 76, interval: 4 }
    );

    assert.equal(movement.harmonicSemitones, 4);
    assert.equal(movement.registerOffsetOctaves, 1);
    assert.equal(movement.hasRegisterShift, true);
    assert.equal(movement.usesDescendingRegisterFold, false);
  });

  it('recognizes a compact movement without register displacement', () => {
    const movement = analyzeRegisterMovement(
      { midi: 64, interval: 4 },
      { midi: 67, interval: 7 }
    );

    assert.equal(movement.harmonicSemitones, 3);
    assert.equal(movement.registerOffsetOctaves, 0);
    assert.equal(movement.hasRegisterShift, false);
    assert.equal(movement.usesDescendingRegisterFold, false);
  });
});
