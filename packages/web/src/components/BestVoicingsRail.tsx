import type { ChordVoicing, GuitarConfig } from '@guitar-paradigm/core';
import { FiBookmark, FiStar } from 'react-icons/fi';

interface BestVoicingsRailProps {
  voicings: ChordVoicing[];
  selectedVoicing: ChordVoicing | null;
  preferredShapeIds: string[];
  config: GuitarConfig;
  onSelect: (voicing: ChordVoicing) => void;
  onPin: (voicing: ChordVoicing) => void;
  onPreferenceToggle: (shapeId: string) => void;
}

function sameVoicing(left: ChordVoicing | null, right: ChordVoicing) {
  return left?.frets.join(',') === right.frets.join(',');
}

export function BestVoicingsRail({
  voicings,
  selectedVoicing,
  preferredShapeIds,
  config,
  onSelect,
  onPin,
  onPreferenceToggle
}: BestVoicingsRailProps) {
  return (
    <aside className="voicings-rail" aria-label="Best voicings">
      <div className="voicings-rail__heading">
        <span>Best voicings</span>
        <small>Top 3 by total fit</small>
      </div>
      <div className="voicings-rail__list">
        {voicings.slice(0, 3).map((voicing, index) => {
          const selected = sameVoicing(selectedVoicing, voicing);
          const shapeId = voicing.shapeId;
          return (
            <article key={`${voicing.frets.join('-')}-${index}`} className={`voicing-rank-card ${selected ? 'is-selected' : ''}`}>
              <button
                type="button"
                className="voicing-rank-card__main"
                aria-pressed={selected}
                aria-label={`Select ranked voicing ${index + 1}`}
                onClick={() => onSelect(voicing)}
              >
                <span className="voicing-rank-card__rank">0{index + 1}</span>
                <span className="voicing-rank-card__score">
                  <strong>{Math.round(voicing.overallScore ?? voicing.playabilityScore)}</strong>
                  <small>total fit</small>
                </span>
                <span className="voicing-rank-card__frets">
                  {voicing.frets.map((fret, stringIndex) => (
                    <span key={stringIndex} title={config.tuning[stringIndex]}>{fret === null ? '×' : fret}</span>
                  ))}
                </span>
                <span className="voicing-rank-card__metrics">
                  <span>Ergo <strong>{Math.round(voicing.playabilityScore)}</strong></span>
                  <span>Clarity <strong>{Math.round(voicing.frequencyScore ?? 100)}</strong></span>
                </span>
              </button>
              <div className="voicing-rank-card__actions">
                <button type="button" title="Add to progression" aria-label={`Add ranked voicing ${index + 1} to progression`} onClick={() => onPin(voicing)}><FiBookmark aria-hidden="true" /></button>
                {shapeId && (
                  <button
                    type="button"
                    title="Prefer this reusable shape"
                    aria-label={preferredShapeIds.includes(shapeId) ? 'Remove preferred shape' : 'Prefer this reusable shape'}
                    aria-pressed={preferredShapeIds.includes(shapeId)}
                    className={preferredShapeIds.includes(shapeId) ? 'is-active' : ''}
                    onClick={() => onPreferenceToggle(shapeId)}
                  >
                    <FiStar aria-hidden="true" />
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <div className="voicings-rail__legend">
        <span><i className="legend-swatch legend-swatch--root" /> Root</span>
        <span><i className="legend-swatch legend-swatch--third" /> Third</span>
        <span><i className="legend-swatch legend-swatch--fifth" /> Fifth</span>
      </div>
    </aside>
  );
}
