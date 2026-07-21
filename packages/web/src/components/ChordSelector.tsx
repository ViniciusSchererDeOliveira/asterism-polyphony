import React from 'react';

interface ChordSelectorProps {
  rootNote: string;
  chord: string;
  globalKey: string;
  onChange: (rootNote: string, chord: string, globalKey: string) => void;
}

export const ROOT_NOTES = [
  'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'
];

export const GLOBAL_KEYS = [
  'C Major', 'G Major', 'D Major', 'A Major', 'E Major', 'B Major', 'F# Major', 'C# Major',
  'F Major', 'Bb Major', 'Eb Major', 'Ab Major', 'Db Major', 'Gb Major', 'Cb Major',
  'A Minor', 'E Minor', 'B Minor', 'F# Minor', 'C# Minor', 'G# Minor', 'D# Minor', 'A# Minor',
  'D Minor', 'G Minor', 'C Minor', 'F Minor', 'Bb Minor', 'Eb Minor', 'Ab Minor'
];

export const CHORD_SUFFIXES = [
  { value: '', label: 'Major' },
  { value: 'm', label: 'Minor' },
  { value: '5', label: 'Power Chord (5)' },
  { value: 'sus4', label: 'Suspended 4 (sus4)' },
  { value: 'sus2', label: 'Suspended 2 (sus2)' },
  { value: '7', label: 'Dominant 7 (7)' },
  { value: 'maj7', label: 'Major 7 (maj7)' },
  { value: 'm7', label: 'Minor 7 (m7)' },
  { value: 'm9', label: 'Minor 9 (m9)' },
  { value: 'maj9', label: 'Major 9 (maj9)' },
  { value: '9', label: 'Dominant 9 (9)' },
  { value: 'dim', label: 'Diminished' },
  { value: 'dim7', label: 'Diminished 7' },
  { value: 'm7b5', label: 'Minor 7 Flat 5' },
  { value: 'aug', label: 'Augmented' },
  { value: '11', label: '11th' },
  { value: 'm11', label: 'Minor 11th' },
  { value: '13', label: '13th' },
  { value: 'm13', label: 'Minor 13th' }
];

export const ChordSelector: React.FC<ChordSelectorProps> = ({
  rootNote,
  chord,
  globalKey,
  onChange
}) => {
  return (
    <div className="flex flex-col gap-4 p-4 border border-slate-700 rounded-lg bg-slate-800/40">
      <h3 className="text-sm font-semibold tracking-wider text-slate-300 uppercase">
        Chord Selection
      </h3>
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-400">Root Note</label>
          <select
            value={rootNote}
            onChange={(e) => onChange(e.target.value, chord, globalKey)}
            className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-teal-500"
          >
            {ROOT_NOTES.map((note) => (
              <option key={note} value={note}>
                {note}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-400">Chord Suffix</label>
          <select
            value={chord}
            onChange={(e) => onChange(rootNote, e.target.value, globalKey)}
            className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-teal-500"
          >
            {CHORD_SUFFIXES.map((suffix) => (
              <option key={suffix.value} value={suffix.value}>
                {suffix.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-400">Global Key</label>
          <select
            value={globalKey}
            onChange={(e) => onChange(rootNote, chord, e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-teal-500"
          >
            {GLOBAL_KEYS.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
