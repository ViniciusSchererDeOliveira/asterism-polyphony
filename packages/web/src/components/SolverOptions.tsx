import React from 'react';

export type ToneProfileSelection = 'auto' | 'clean' | 'crunch' | 'highGain';

interface SolverOptionsProps {
  allowExtensions: boolean;
  allowRootlessWithBass: boolean;
  toneProfile: ToneProfileSelection;
  minimumClarity: number;
  bassSelected: boolean;
  onAllowExtensionsChange: (enabled: boolean) => void;
  onAllowRootlessWithBassChange: (enabled: boolean) => void;
  onToneProfileChange: (profile: ToneProfileSelection) => void;
  onMinimumClarityChange: (value: number) => void;
}

export const SolverOptions: React.FC<SolverOptionsProps> = ({
  allowExtensions,
  allowRootlessWithBass,
  toneProfile,
  minimumClarity,
  bassSelected,
  onAllowExtensionsChange,
  onAllowRootlessWithBassChange,
  onToneProfileChange,
  onMinimumClarityChange
}) => (
  <div className="flex flex-col gap-3 p-3 border border-slate-700 rounded-lg bg-slate-800/40">
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-xs font-semibold tracking-wider text-slate-300 uppercase">
        Solver Policy
      </h3>
      <span className="px-2 py-1 text-[9px] font-bold tracking-wider uppercase rounded border border-emerald-700/60 bg-emerald-950/40 text-emerald-400">
        Strict ergonomics
      </span>
    </div>

    <label className="flex items-start gap-2 px-2 py-2 border border-slate-800 rounded bg-slate-900/40 text-slate-300 cursor-pointer">
      <input
        type="checkbox"
        checked={allowExtensions}
        onChange={(event) => onAllowExtensionsChange(event.target.checked)}
        className="w-3.5 h-3.5 mt-0.5 rounded text-teal-600 bg-slate-950 border-slate-700 focus:ring-teal-500 focus:ring-offset-slate-900"
      />
      <span className="flex flex-col gap-0.5">
        <span className="text-[11px] font-medium">Allow stylistic tensions</span>
        <span className="text-[9px] leading-relaxed text-slate-500">
          Off keeps every generated pitch inside the selected chord.
        </span>
      </span>
    </label>

    <label className={`flex items-start gap-2 px-2 py-2 border rounded bg-slate-900/40 ${
      bassSelected ? 'border-slate-800 text-slate-300 cursor-pointer' : 'border-slate-900 text-slate-600 cursor-not-allowed'
    }`}>
      <input
        type="checkbox"
        checked={bassSelected && allowRootlessWithBass}
        disabled={!bassSelected}
        onChange={(event) => onAllowRootlessWithBassChange(event.target.checked)}
        className="w-3.5 h-3.5 mt-0.5 rounded text-teal-600 bg-slate-950 border-slate-700 focus:ring-teal-500 focus:ring-offset-slate-900 disabled:opacity-40"
      />
      <span className="flex flex-col gap-0.5">
        <span className="text-[11px] font-medium">Allow bass-completed rootless shapes</span>
        <span className="text-[9px] leading-relaxed text-slate-500">
          The complete ensemble must still form the exact selected chord.
        </span>
      </span>
    </label>

    <div className="grid grid-cols-2 gap-2">
      <label className="flex flex-col gap-1 text-[10px] font-medium text-slate-400">
        Tone model
        <select
          value={toneProfile}
          onChange={(event) => onToneProfileChange(event.target.value as ToneProfileSelection)}
          className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1.5 text-[11px] focus:outline-none focus:border-teal-500"
        >
          <option value="auto">Style default</option>
          <option value="clean">Clean</option>
          <option value="crunch">Crunch</option>
          <option value="highGain">High gain</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-[10px] font-medium text-slate-400">
        Minimum clarity: {minimumClarity}
        <input
          type="range"
          min={35}
          max={80}
          step={5}
          value={minimumClarity}
          onChange={(event) => onMinimumClarityChange(Number.parseInt(event.target.value, 10))}
          className="w-full h-1.5 mt-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-teal-500"
        />
      </label>
    </div>
  </div>
);
