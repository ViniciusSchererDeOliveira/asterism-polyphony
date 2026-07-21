import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import type { GuitarConfig, VoicingAnalysis } from '@guitar-paradigm/core';
import { ChessMovesPanel, FretboardVisualizer } from '@guitar-paradigm/web';

const config: GuitarConfig = {
  numStrings: 6,
  numFrets: 24,
  tuning: ['E2', 'A2', 'D3', 'G3', 'C4', 'F4']
};

const analysis: VoicingAnalysis = {
  chordType: 'major',
  actualChordSymbol: 'C',
  noteRoles: [
    { note: 'C', role: 'root', stringIdx: 4, fret: 0, midi: 60, interval: 0, deltaString: 0, deltaFret: 0 },
    { note: 'E', role: 'third', stringIdx: 5, fret: 11, midi: 76, interval: 4, deltaString: 1, deltaFret: 11 },
    { note: 'G', role: 'fifth', stringIdx: 3, fret: 0, midi: 55, interval: 7, deltaString: -1, deltaFret: 0 }
  ],
  flags: [],
  shapeId: 'movement-board-contract',
  pivotCount: 0
};

const boundaryFallbackAnalysis: VoicingAnalysis = {
  chordType: 'major',
  actualChordSymbol: 'E',
  noteRoles: [
    { note: 'E', role: 'root', stringIdx: 0, fret: 0, midi: 40, interval: 0, deltaString: 0, deltaFret: 0 },
    { note: 'G#', role: 'third', stringIdx: 0, fret: 4, midi: 44, interval: 4, deltaString: 0, deltaFret: 4 }
  ],
  flags: [],
  shapeId: 'rook-fallback-contract',
  pivotCount: 0
};

function renderBoard(highlightedNoteIdx: number) {
  return renderToString(React.createElement(FretboardVisualizer, {
    config,
    voicing: null,
    preset: 'worship',
    analysis,
    highlightedNoteIdx
  }));
}

function renderRulebook(pinnedIdx: number) {
  return renderToString(React.createElement(ChessMovesPanel, {
    analysis,
    config,
    hoveredIdx: null,
    pinnedIdx,
    onHover: () => undefined,
    onPin: () => undefined
  }));
}

function renderBoundaryFallback(component: 'board' | 'rulebook') {
  if (component === 'board') {
    return renderToString(React.createElement(FretboardVisualizer, {
      config,
      voicing: null,
      preset: 'worship',
      analysis: boundaryFallbackAnalysis,
      highlightedNoteIdx: 1
    }));
  }

  return renderToString(React.createElement(ChessMovesPanel, {
    analysis: boundaryFallbackAnalysis,
    config,
    hoveredIdx: null,
    pinnedIdx: 1,
    onHover: () => undefined,
    onPin: () => undefined
  }));
}

export const movementBoardTests = [
  {
    name: 'MOVEMENT_BOARD_1: Root selection renders an anchor without a route',
    fn: () => {
      const board = renderBoard(0);
      const rulebook = renderRulebook(0);

      assert.match(board, /data-piece-tone="root"/);
      assert.doesNotMatch(board, /data-degree-route=/);
      assert.doesNotMatch(board, /data-route-segment=/);
      assert.match(rulebook, /Root selected · Anchor only/);
      assert.match(rulebook, /NO PATH/);
      assert.match(rulebook, /data-layout-state="anchor-only"/);
      assert.doesNotMatch(rulebook, /movement-card--travel/);
    }
  },
  {
    name: 'MOVEMENT_BOARD_2: Third moves the root portal before the canonical Bishop route',
    fn: () => {
      const board = renderBoard(1);
      const rulebook = renderRulebook(1);

      assert.match(board, /data-degree-route="III"/);
      assert.match(board, /data-route-tone="third"/);
      assert.match(board, /route--third/);
      assert.match(board, /data-movement-order="portal-before-route"/);
      assert.match(board, /data-route-origin="S5\/F12"/);
      assert.match(board, /data-route-landing="S6\/F11"/);
      assert.match(board, /data-portal-entry="S5\/F0"/);
      assert.match(board, /data-portal-exit="S5\/F12"/);
      assert.match(board, /data-route-segment="degree"/);
      assert.match(board, /data-route-segment="portal"/);
      assert.match(board, /data-rule-piece="bishop"/);
      assert.match(board, /data-route-segment="portal"[^>]*data-sequence-step="1"/);
      assert.match(board, /data-route-segment="degree"[^>]*data-sequence-step="2"/);
      assert.match(board, /\+1 OCT/);
      assert.match(board, /data-portal-pitch="C4"/);
      assert.match(board, /data-portal-pitch="C5"/);
      assert.doesNotMatch(board, /data-boundary-fallback=/);
      assert.match(rulebook, /data-movement-order="portal-before-route"/);
      assert.match(rulebook, /data-layout-state="degree-route"/);
      assert.match(rulebook, /data-rule-piece="bishop"/);
      assert.match(rulebook, /data-portal-order="before-rule"/);
      assert.match(rulebook, /data-portal-pitch="C4"/);
      assert.match(rulebook, /data-portal-pitch="C5"/);
    }
  },
  {
    name: 'MOVEMENT_BOARD_3: Fifth and portal use distinct semantic identities',
    fn: () => {
      const board = renderBoard(2);
      const rulebook = renderRulebook(2);
      const portalPairCount = board.match(/data-portal-pair="P1"/g)?.length ?? 0;

      assert.match(board, /data-route-tone="fifth"/);
      assert.match(board, /route--fifth/);
      assert.match(board, /data-movement-order="route-before-portal"/);
      assert.match(board, /data-boundary-fallback="nut"/);
      assert.match(board, /data-route-origin="S5\/F0"/);
      assert.match(board, /data-route-landing="S6\/F2"/);
      assert.match(board, /data-portal-entry="S6\/F2"/);
      assert.match(board, /data-portal-exit="S4\/F0"/);
      assert.match(board, /data-route-segment="portal"/);
      assert.match(board, /data-route-segment="degree"[^>]*data-sequence-step="1"/);
      assert.match(board, /data-route-segment="portal"[^>]*data-sequence-step="2"/);
      assert.ok(portalPairCount >= 5);
      assert.match(board, /data-portal-end="in"/);
      assert.match(board, /data-portal-end="out"/);
      assert.match(board, /−1 OCT/);
      assert.match(rulebook, /data-portal-pair="P1"/);
      assert.match(rulebook, /data-portal-end="in"/);
      assert.match(rulebook, /data-portal-end="out"/);
      assert.match(rulebook, /data-movement-order="route-before-portal"/);
      assert.match(rulebook, /data-boundary-fallback="nut"/);
      assert.match(rulebook, /BOUNDARY FALLBACK/);
      assert.match(rulebook, /−1 OCT/);
    }
  },
  {
    name: 'MOVEMENT_BOARD_4: Boundary fallback renders the selected Rook instead of the canonical Bishop',
    fn: () => {
      const board = renderBoundaryFallback('board');
      const rulebook = renderBoundaryFallback('rulebook');

      assert.match(board, /data-rule-piece="rook"/);
      assert.match(board, /data-route-piece="rook"[^>]*>[\s\S]*?data-chess-piece="rook"/);
      assert.match(rulebook, /data-rule-piece="rook"/);
      assert.match(rulebook, /data-route-piece="rook"[^>]*>[\s\S]*?data-chess-piece="rook"/);
      assert.match(rulebook, /canonical[\s\S]*?BISHOP/);
      assert.match(rulebook, /ROOK[\s\S]*?→4/);
    }
  }
];
