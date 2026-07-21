import React, { useState, useEffect } from 'react';
import { GuitarConfig } from '@guitar-paradigm/core';

interface GuitarConfiguratorProps {
  config: GuitarConfig;
  onChange: (config: GuitarConfig) => void;
}

const TUNING_PRESETS: Record<number, Record<string, string[]>> = {
  4: {
    'allFourths': ['E1', 'A1', 'D2', 'G2'],
    'standard': ['E1', 'A1', 'D2', 'G2'],
    'dropD': ['D1', 'A1', 'D2', 'G2']
  },
  5: {
    'allFourths': ['B0', 'E1', 'A1', 'D2', 'G2'],
    'standard': ['B0', 'E1', 'A1', 'D2', 'G2'],
    'dropD': ['A0', 'E1', 'A1', 'D2', 'G2']
  },
  6: {
    'allFourths': ['E2', 'A2', 'D3', 'G3', 'C4', 'F4'],
    'standard': ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
    'dropD': ['D2', 'A2', 'D3', 'G3', 'B3', 'E4']
  },
  7: {
    'allFourths': ['B1', 'E2', 'A2', 'D3', 'G3', 'C4', 'F4'],
    'standard': ['B1', 'E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
    'dropD': ['A1', 'E2', 'A2', 'D3', 'G3', 'B3', 'E4']
  },
  8: {
    'allFourths': ['F#1', 'B1', 'E2', 'A2', 'D3', 'G3', 'C4', 'F4'],
    'standard': ['F#1', 'B1', 'E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
    'dropD': ['E1', 'B1', 'E2', 'A2', 'D3', 'G3', 'B3', 'E4']
  }
};

const NOTE_REGEX = /^([A-G]#?|Bb?|Db?|Eb?|Gb?|Ab?)(-?\d+)$/;

export const GuitarConfigurator: React.FC<GuitarConfiguratorProps> = ({
  config,
  onChange
}) => {
  const [localTuning, setLocalTuning] = useState<string[]>(config.tuning);
  const [errors, setErrors] = useState<boolean[]>(Array(config.numStrings).fill(false));
  const [preset, setPreset] = useState<string>('allFourths');

  useEffect(() => {
    setLocalTuning(config.tuning);
    setErrors(Array(config.numStrings).fill(false));
  }, [config.tuning, config.numStrings]);

  const handleStringCountChange = (numStrings: number) => {
    const defaultPreset = TUNING_PRESETS[numStrings]?.[preset] || 
                          TUNING_PRESETS[numStrings]?.['allFourths'] || 
                          Array(numStrings).fill('E2');
    onChange({
      ...config,
      numStrings,
      tuning: defaultPreset
    });
  };

  const handleFretCountChange = (numFrets: number) => {
    onChange({
      ...config,
      numFrets
    });
  };

  const handlePresetChange = (selectedPreset: string) => {
    setPreset(selectedPreset);
    if (selectedPreset === 'custom') return;
    const newTuning = TUNING_PRESETS[config.numStrings]?.[selectedPreset];
    if (newTuning) {
      onChange({
        ...config,
        tuning: newTuning
      });
    }
  };

  const handleTuningValueChange = (index: number, val: string) => {
    const updated = [...localTuning];
    updated[index] = val;
    setLocalTuning(updated);

    const isInvalid = !NOTE_REGEX.test(val);
    const updatedErrors = [...errors];
    updatedErrors[index] = isInvalid;
    setErrors(updatedErrors);

    if (!isInvalid && updatedErrors.every(err => !err)) {
      onChange({
        ...config,
        tuning: updated
      });
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 border border-slate-700 rounded-lg bg-slate-800/40">
      <h3 className="text-sm font-semibold tracking-wider text-slate-300 uppercase">
        Guitar Configuration
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-400">Strings</label>
          <select
            value={config.numStrings}
            onChange={(e) => handleStringCountChange(parseInt(e.target.value, 10))}
            className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-teal-500"
          >
            {[4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>
                {n} Strings
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-400">Frets</label>
          <select
            value={config.numFrets}
            onChange={(e) => handleFretCountChange(parseInt(e.target.value, 10))}
            className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-teal-500"
          >
            {[12, 15, 17, 19, 21, 24].map((n) => (
              <option key={n} value={n}>
                {n} Frets
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-slate-400">Tuning Preset</label>
        <select
          value={preset}
          onChange={(e) => handlePresetChange(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-teal-500"
        >
          <option value="allFourths">All Fourths</option>
          <option value="standard">Standard Tuning</option>
          <option value="dropD">Drop Tuning</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-slate-400">
          String Tuning (Low to High)
        </label>
        <div className="grid grid-cols-6 gap-2">
          {localTuning.map((note, idx) => (
            <div key={idx} className="flex flex-col gap-1 items-center">
              <span className="text-[10px] text-slate-500 font-mono">S{idx + 1}</span>
              <input
                type="text"
                value={note}
                onChange={(e) => handleTuningValueChange(idx, e.target.value)}
                className={`w-full text-center bg-slate-950 border ${
                  errors[idx] ? 'border-red-500 focus:border-red-500' : 'border-slate-800 focus:border-teal-500'
                } text-slate-200 rounded py-1 px-0.5 text-xs font-mono focus:outline-none`}
              />
            </div>
          ))}
        </div>
        {errors.some(Boolean) && (
          <p className="text-[10px] text-red-500">
            Invalid note name format (e.g. E2, F#3, Bb4).
          </p>
        )}
      </div>
    </div>
  );
};
