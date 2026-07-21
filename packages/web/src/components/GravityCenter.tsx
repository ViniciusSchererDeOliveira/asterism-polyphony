import React from 'react';

interface GravityCenterProps {
  gravityCenter: number;
  onChange: (value: number) => void;
}

export const GravityCenter: React.FC<GravityCenterProps> = ({ gravityCenter, onChange }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 mt-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold tracking-wider text-slate-300 uppercase">
          Gravity Center (Fret Bias)
        </h3>
        <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded">
          {gravityCenter}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <input
          type="range"
          min="0"
          max="15"
          value={gravityCenter}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          className="w-full accent-teal-500 bg-slate-700 h-1.5 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
          <span>0 (Open)</span>
          <span>7 (Mid)</span>
          <span>15 (High)</span>
        </div>
      </div>
    </div>
  );
};
