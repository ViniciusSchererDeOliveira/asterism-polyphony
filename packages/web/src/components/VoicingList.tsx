import React, { useState } from 'react';
import { ChordVoicing, GuitarConfig } from '@guitar-paradigm/core';
import { VoicingCard } from './VoicingCard';
import { GiGuitar } from 'react-icons/gi';

interface VoicingListProps {
  voicings: ChordVoicing[];
  selectedVoicing: ChordVoicing | null;
  onSelect: (voicing: ChordVoicing) => void;
  onPin?: (voicing: ChordVoicing) => void;
  preferredShapeIds?: string[];
  onPreferenceToggle?: (shapeId: string) => void;
  config: GuitarConfig;
}

export const VoicingList: React.FC<VoicingListProps> = ({
  voicings,
  selectedVoicing,
  onSelect,
  onPin,
  preferredShapeIds = [],
  onPreferenceToggle,
  config
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const totalPages = Math.ceil(voicings.length / itemsPerPage);
  
  const currentVoicings = voicings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  if (voicings.length === 0) {
    return (
      <div className="voicings-empty">
        <GiGuitar aria-hidden="true" />
        <h4>No voicings found</h4>
        <p>
          No exact voicing passed the ergonomic, spectral, and style gates. Lower minimum clarity or adjust the hand constraints.
        </p>
      </div>
    );
  }

  return (
    <div className="voicings-list">
      <div className="voicings-list__heading">
        <h3>Generated voicings ({voicings.length})</h3>
        <span>Sorted by total fit</span>
      </div>
      
      <div className="voicings-list__items">
        {currentVoicings.map((voicing, idx) => (
          <VoicingCard
            key={(currentPage - 1) * itemsPerPage + idx}
            voicing={voicing}
            isSelected={
              selectedVoicing !== null &&
              selectedVoicing.frets.join(',') === voicing.frets.join(',')
            }
            onClick={onSelect}
            onPin={onPin}
            isPreferred={voicing.shapeId ? preferredShapeIds.includes(voicing.shapeId) : false}
            onPreferenceToggle={onPreferenceToggle}
            config={config}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="voicings-list__pagination">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
