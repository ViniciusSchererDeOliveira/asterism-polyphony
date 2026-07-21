import { GiCompass, GiPolarStar } from 'react-icons/gi';
import { FiSliders } from 'react-icons/fi';
import { CHORD_SUFFIXES, GLOBAL_KEYS, ROOT_NOTES } from './ChordSelector';

export type StylePreset = 'worship' | 'jrock' | 'mathrock' | 'metalcore';
export type WorkspaceTab = 'generate' | 'learn';

interface CodexHeaderProps {
  rootNote: string;
  chord: string;
  globalKey: string;
  stylePreset: StylePreset;
  activeTab: WorkspaceTab;
  drawerOpen: boolean;
  onChordChange: (rootNote: string, chord: string, globalKey: string) => void;
  onStyleChange: (style: StylePreset) => void;
  onTabChange: (tab: WorkspaceTab) => void;
  onDrawerToggle: () => void;
}

const STYLES: { value: StylePreset; label: string }[] = [
  { value: 'worship', label: 'Worship' },
  { value: 'jrock', label: 'J-Rock' },
  { value: 'mathrock', label: 'Math Rock' },
  { value: 'metalcore', label: 'Metalcore' }
];

export function CodexHeader({
  rootNote,
  chord,
  globalKey,
  stylePreset,
  activeTab,
  drawerOpen,
  onChordChange,
  onStyleChange,
  onTabChange,
  onDrawerToggle
}: CodexHeaderProps) {
  return (
    <header className="codex-header">
      <div className="codex-brand">
        <span className="codex-brand__mark"><GiCompass aria-hidden="true" /></span>
        <span>
          <strong>Asterism Polyphony</strong>
          <small>All Fourths Guitar Codex</small>
        </span>
      </div>

      <div className="codex-controls" aria-label="Chord and style controls">
        <label className="codex-field codex-field--compact">
          <span>Root</span>
          <select value={rootNote} onChange={(event) => onChordChange(event.target.value, chord, globalKey)}>
            {ROOT_NOTES.map((note) => <option key={note} value={note}>{note}</option>)}
          </select>
        </label>
        <label className="codex-field codex-field--chord">
          <span>Chord</span>
          <select value={chord} onChange={(event) => onChordChange(rootNote, event.target.value, globalKey)}>
            {CHORD_SUFFIXES.map((suffix) => <option key={suffix.value} value={suffix.value}>{suffix.label}</option>)}
          </select>
        </label>
        <label className="codex-field codex-field--key">
          <span>Key</span>
          <select value={globalKey} onChange={(event) => onChordChange(rootNote, chord, event.target.value)}>
            {GLOBAL_KEYS.map((key) => <option key={key} value={key}>{key}</option>)}
          </select>
        </label>
        <label className="codex-field codex-field--style">
          <span>Style</span>
          <select value={stylePreset} onChange={(event) => onStyleChange(event.target.value as StylePreset)}>
            {STYLES.map((style) => <option key={style.value} value={style.value}>{style.label}</option>)}
          </select>
        </label>
      </div>

      <div className="codex-actions">
        <button
          type="button"
          className={`codex-icon-button ${drawerOpen ? 'is-active' : ''}`}
          aria-expanded={drawerOpen}
          aria-controls="solver-configuration"
          onClick={onDrawerToggle}
        >
          <FiSliders aria-hidden="true" />
          <span>Guitar &amp; Hand</span>
        </button>
        <div className="codex-tabs" role="group" aria-label="Workspace mode">
          <button type="button" aria-pressed={activeTab === 'learn'} onClick={() => onTabChange('learn')}>
            <GiPolarStar aria-hidden="true" /> Learn
          </button>
          <button type="button" aria-pressed={activeTab === 'generate'} onClick={() => onTabChange('generate')}>
            Generate
          </button>
        </div>
      </div>
    </header>
  );
}
