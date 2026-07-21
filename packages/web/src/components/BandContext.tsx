import React from 'react';

export type BandContextMode = 'style' | 'traditional';
export type BandInstrument = 'bass' | 'keyboard' | 'secondGuitar' | 'vocals';

interface BandContextProps {
  mode: BandContextMode;
  instruments: BandInstrument[];
  onModeChange: (mode: BandContextMode) => void;
  onInstrumentsChange: (instruments: BandInstrument[]) => void;
  calibrationEnabled?: boolean;
  onCalibrationEnabledChange?: (enabled: boolean) => void;
}

const instrumentOptions: Array<{ value: BandInstrument; label: string }> = [
  { value: 'bass', label: 'Bass' },
  { value: 'keyboard', label: 'Keyboard' },
  { value: 'secondGuitar', label: 'Second Guitar' },
  { value: 'vocals', label: 'Vocals' }
];

export const BandContext: React.FC<BandContextProps> = ({
  mode,
  instruments,
  onModeChange,
  onInstrumentsChange,
  calibrationEnabled = false,
  onCalibrationEnabledChange
}) => {
  const toggleInstrument = (instrument: BandInstrument) => {
    const nextInstruments = instruments.includes(instrument)
      ? instruments.filter(current => current !== instrument)
      : [...instruments, instrument];

    onInstrumentsChange(nextInstruments);
  };

  return (
    <div className="flex flex-col gap-3 p-3 border border-slate-700 rounded-lg bg-slate-800/40">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold tracking-wider text-slate-300 uppercase">
          Band Context
        </h3>
        <div className="flex p-0.5 bg-slate-950/60 border border-slate-800 rounded-md">
          <button
            type="button"
            aria-pressed={mode === 'traditional'}
            onClick={() => onModeChange('traditional')}
            className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors ${
              mode === 'traditional'
                ? 'bg-teal-600 text-slate-950'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
            }`}
          >
            Traditional
          </button>
          <button
            type="button"
            aria-pressed={mode === 'style'}
            onClick={() => onModeChange('style')}
            className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors ${
              mode === 'style'
                ? 'bg-teal-600 text-slate-950'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
            }`}
          >
            Style-aware
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {instrumentOptions.map(option => {
          const checked = instruments.includes(option.value);
          const id = `band-instrument-${option.value}`;

          return (
            <label
              key={option.value}
              htmlFor={id}
              className={`flex items-center gap-2 px-2 py-1.5 border rounded cursor-pointer select-none transition-colors ${
                checked
                  ? 'bg-slate-900/80 border-teal-700/70 text-slate-200'
                  : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <input
                id={id}
                type="checkbox"
                checked={checked}
                onChange={() => toggleInstrument(option.value)}
                className="w-3.5 h-3.5 rounded text-teal-600 bg-slate-950 border-slate-700 focus:ring-teal-500 focus:ring-offset-slate-900"
              />
              <span className="text-[11px] font-medium">{option.label}</span>
            </label>
          );
        })}
      </div>

      {onCalibrationEnabledChange && (
        <label className="flex items-center gap-2 px-2 py-1.5 border border-slate-800 rounded bg-slate-900/40 text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            checked={calibrationEnabled}
            onChange={(event) => onCalibrationEnabledChange(event.target.checked)}
            className="w-3.5 h-3.5 rounded text-teal-600 bg-slate-950 border-slate-700 focus:ring-teal-500 focus:ring-offset-slate-900"
          />
          <span className="text-[11px] font-medium">Use my preferred shapes</span>
        </label>
      )}
    </div>
  );
};
