import { memo } from 'react';
import type { ChordVoicing, GuitarConfig } from '@guitar-paradigm/core';
import { FiBookmark, FiStar } from 'react-icons/fi';
import { voicingClassification } from '../voicingClassification';

interface VoicingCardProps {
  voicing: ChordVoicing;
  isSelected: boolean;
  onClick: (voicing: ChordVoicing) => void;
  onPin?: (voicing: ChordVoicing) => void;
  isPreferred?: boolean;
  onPreferenceToggle?: (shapeId: string) => void;
  config: GuitarConfig;
}

export const VoicingCard = memo(({
  voicing,
  isSelected,
  onClick,
  onPin,
  isPreferred = false,
  onPreferenceToggle,
  config
}: VoicingCardProps) => {
  const score = voicing.overallScore ?? voicing.playabilityScore;

  return (
    <article className={`voicing-card ${isSelected ? 'is-selected' : ''}`}>
      <button
        type="button"
        className="voicing-card__main"
        aria-pressed={isSelected}
        onClick={() => onClick(voicing)}
      >
        <span className="voicing-card__tab">[{voicing.frets.map((fret) => fret === null ? 'x' : fret).join('-')}]</span>
        <span className="voicing-card__exact">
          {voicingClassification(voicing)}{voicing.actualChordSymbol ? ` · ${voicing.actualChordSymbol}` : ''}
        </span>
        <span className="voicing-card__score">Total {score.toFixed(1)}</span>
        <span className="voicing-card__metrics">
          <span>Playability <strong>{voicing.playabilityScore.toFixed(1)}</strong></span>
          <span>Clarity <strong>{(voicing.frequencyScore ?? 100).toFixed(1)}</strong></span>
          <span>Style <strong>{voicing.styleScore.toFixed(1)}</strong></span>
          <span>Move <strong>{(voicing.transitionScore ?? 100).toFixed(1)}</strong></span>
        </span>
        <span className="voicing-card__strings">
          {voicing.frets.map((fret, index) => <span key={index}>{config.tuning[index]}:{fret === null ? 'x' : fret}</span>)}
        </span>
      </button>
      <div className="voicing-card__actions">
        {onPin && <button type="button" onClick={() => onPin(voicing)} title="Add to progression" aria-label="Add voicing to progression"><FiBookmark aria-hidden="true" /></button>}
        {onPreferenceToggle && voicing.shapeId && (
          <button
            type="button"
            className={isPreferred ? 'is-active' : ''}
            onClick={() => onPreferenceToggle(voicing.shapeId!)}
            title="Prefer this reusable shape"
            aria-label={isPreferred ? 'Remove preferred shape' : 'Prefer this reusable shape'}
            aria-pressed={isPreferred}
          >
            <FiStar aria-hidden="true" />
          </button>
        )}
      </div>
    </article>
  );
});
