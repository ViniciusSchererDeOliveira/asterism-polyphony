import React from 'react';
import type { GuitarConfig, ChordVoicing } from '@guitar-paradigm/core';

export { FretboardVisualizer } from './components/FretboardVisualizer.js';
export { ChessMovesPanel } from './components/ChessMovesPanel.js';
export { previewIndexAfterRemoval } from './progressionState.js';
export { voicingClassification } from './voicingClassification.js';

export interface FretboardAppProps {
  guitarConfig?: GuitarConfig;
  selectedChord?: string;
  stylePreset?: string;
  selectedVoicing?: ChordVoicing | null;
}

export function FretboardApp({
  guitarConfig = {
    numStrings: 6,
    numFrets: 24,
    tuning: ['E2', 'A2', 'D3', 'G3', 'C4', 'F4']
  },
  selectedChord = 'Cmaj7',
  stylePreset = 'worship',
  selectedVoicing = null
}: FretboardAppProps) {
  const { numStrings, numFrets } = guitarConfig;

  const width = 800;
  const height = 200;
  const paddingX = 40;
  const paddingY = 20;

  const fretSpacing = (width - paddingX * 2) / numFrets;
  const stringSpacing = (height - paddingY * 2) / Math.max(1, numStrings - 1);

  const stringLines: React.ReactNode[] = [];
  for (let i = 0; i < numStrings; i++) {
    const y = paddingY + i * stringSpacing;
    stringLines.push(
      <line
        key={`string-${i}`}
        x1={paddingX}
        y1={y}
        x2={width - paddingX}
        y2={y}
        stroke="black"
        strokeWidth={2}
        className="string-line"
      />
    );
  }

  const fretLines: React.ReactNode[] = [];
  for (let j = 0; j <= numFrets; j++) {
    const x = paddingX + j * fretSpacing;
    fretLines.push(
      <line
        key={`fret-${j}`}
        x1={x}
        y1={paddingY}
        x2={x}
        y2={height - paddingY}
        stroke="gray"
        strokeWidth={j === 0 ? 4 : 1}
        className="fret-line"
      />
    );
  }

  const noteMarkers: React.ReactNode[] = [];
  if (selectedVoicing && Array.isArray(selectedVoicing.frets)) {
    selectedVoicing.frets.forEach((fret, sIndex) => {
      const y = paddingY + sIndex * stringSpacing;
      if (fret === null) {
        noteMarkers.push(
          <text
            key={`muted-${sIndex}`}
            x={paddingX - 15}
            y={y + 5}
            textAnchor="middle"
            fill="red"
            fontSize={14}
            fontWeight="bold"
            className="note-marker-muted"
          >
            X
          </text>
        );
      } else if (fret === 0) {
        noteMarkers.push(
          <circle
            key={`open-${sIndex}`}
            cx={paddingX - 15}
            cy={y}
            r={6}
            fill="none"
            stroke="green"
            strokeWidth={2}
            className="note-marker-open"
          />
        );
      } else if (fret > 0) {
        const x = paddingX + (fret - 0.5) * fretSpacing;
        const finger = selectedVoicing.fingers && selectedVoicing.fingers[sIndex];
        noteMarkers.push(
          <g key={`fretted-${sIndex}`} className="note-marker-fretted">
            <circle cx={x} cy={y} r={8} fill="blue" />
            {finger !== null && finger !== undefined && (
              <text
                x={x}
                y={y + 3}
                textAnchor="middle"
                fill="white"
                fontSize={10}
                fontWeight="bold"
              >
                {finger}
              </text>
            )}
          </g>
        );
      }
    });
  }

  return (
    <div className="fretboard-app-container" style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>Fretboard for {selectedChord} ({stylePreset})</h2>
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={`Fretboard diagram for ${selectedChord} in all-fourths tuning`}
        style={{ background: '#f9f9f9', border: '1px solid #ddd' }}
      >
        {fretLines}
        {stringLines}
        {noteMarkers}
      </svg>
    </div>
  );
}
