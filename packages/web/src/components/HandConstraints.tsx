import React from 'react';
import { FingerConstraints } from '@guitar-paradigm/core';

interface HandConstraintsProps {
  constraints: FingerConstraints;
  onChange: (constraints: FingerConstraints) => void;
}

export const HandConstraints: React.FC<HandConstraintsProps> = ({
  constraints,
  onChange
}) => {
  const updateConstraint = <K extends keyof FingerConstraints>(
    key: K,
    value: FingerConstraints[K]
  ) => {
    onChange({
      ...constraints,
      [key]: value
    });
  };

  return (
    <div className="flex flex-col gap-4 p-4 border border-slate-700 rounded-lg bg-slate-800/40">
      <h3 className="text-sm font-semibold tracking-wider text-slate-300 uppercase">
        Hand Constraints
      </h3>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center text-xs">
            <span className="font-medium text-slate-400">Max Fret Span</span>
            <span className="font-mono text-teal-400 font-bold">{constraints.maxSpan} frets</span>
          </div>
          <input
            type="range"
            min={3}
            max={8}
            step={1}
            value={constraints.maxSpan}
            onChange={(e) => updateConstraint('maxSpan', parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-teal-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center text-xs">
            <span className="font-medium text-slate-400">Index Finger Length</span>
            <span className="font-mono text-teal-400 font-bold">{constraints.indexLength} cm</span>
          </div>
          <input
            type="range"
            min={5.0}
            max={10.0}
            step={0.1}
            value={constraints.indexLength}
            onChange={(e) => updateConstraint('indexLength', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-teal-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center text-xs">
            <span className="font-medium text-slate-400">Middle Finger Length</span>
            <span className="font-mono text-teal-400 font-bold">{constraints.middleLength} cm</span>
          </div>
          <input
            type="range"
            min={5.5}
            max={10.5}
            step={0.1}
            value={constraints.middleLength}
            onChange={(e) => updateConstraint('middleLength', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-teal-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center text-xs">
            <span className="font-medium text-slate-400">Ring Finger Length</span>
            <span className="font-mono text-teal-400 font-bold">{constraints.ringLength} cm</span>
          </div>
          <input
            type="range"
            min={5.0}
            max={10.0}
            step={0.1}
            value={constraints.ringLength}
            onChange={(e) => updateConstraint('ringLength', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-teal-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center text-xs">
            <span className="font-medium text-slate-400">Pinky Finger Length</span>
            <span className="font-mono text-teal-400 font-bold">{constraints.pinkyLength} cm</span>
          </div>
          <input
            type="range"
            min={4.0}
            max={8.5}
            step={0.1}
            value={constraints.pinkyLength}
            onChange={(e) => updateConstraint('pinkyLength', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-teal-500"
          />
        </div>

        <div className="flex items-center gap-3 mt-1.5 bg-slate-900/40 p-2 border border-slate-800 rounded">
          <input
            type="checkbox"
            id="tendon-muting"
            checked={constraints.tendonMuting}
            onChange={(e) => updateConstraint('tendonMuting', e.target.checked)}
            className="w-4 h-4 rounded text-teal-600 bg-slate-950 border-slate-700 focus:ring-teal-500"
          />
          <label htmlFor="tendon-muting" className="text-xs font-medium text-slate-300 select-none cursor-pointer">
            Enable Tendon Muting Constraints
          </label>
        </div>
      </div>
    </div>
  );
};
