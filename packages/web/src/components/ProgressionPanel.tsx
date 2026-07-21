import type { ChordVoicing, GuitarConfig } from '@guitar-paradigm/core';
import { FiX } from 'react-icons/fi';

interface ProgressionPanelProps {
  voicings: ChordVoicing[];
  activePreviewIdx: number | null;
  onPreviewToggle: (idx: number | null) => void;
  onRemove: (idx: number) => void;
  config: GuitarConfig;
}

export function ProgressionPanel({ voicings, activePreviewIdx, onPreviewToggle, onRemove, config }: ProgressionPanelProps) {
  if (voicings.length === 0) return null;

  return (
    <section className="progression-panel" aria-label="Pinned progression">
      <div className="progression-panel__heading">
        <strong>Progression</strong>
        <span>{voicings.length} pinned</span>
      </div>
      <div className="progression-panel__list">
        {voicings.map((voicing, index) => (
          <article key={`${voicing.frets.join('-')}-${index}`} className={activePreviewIdx === index ? 'is-active' : ''}>
            <button
              type="button"
              className="progression-panel__preview"
              aria-pressed={activePreviewIdx === index}
              aria-label={`Preview progression voicing ${index + 1}`}
              onClick={() => onPreviewToggle(activePreviewIdx === index ? null : index)}
            >
              <span>{voicing.actualChordSymbol ?? 'Voicing'}</span>
              <span>{voicing.frets.map((fret, stringIndex) => <i key={stringIndex} title={config.tuning[stringIndex]}>{fret === null ? '×' : fret}</i>)}</span>
            </button>
            <button type="button" className="progression-panel__remove" aria-label={`Remove progression voicing ${index + 1}`} onClick={() => onRemove(index)} title="Remove from progression"><FiX aria-hidden="true" /></button>
          </article>
        ))}
      </div>
    </section>
  );
}
