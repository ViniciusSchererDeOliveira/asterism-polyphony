import { useEffect, useMemo, useState } from 'react';
import {
  analyzeVoicing,
  type ChordVoicing,
  type FingerConstraints,
  type GuitarConfig
} from '@guitar-paradigm/core';
import { BestVoicingsRail } from './components/BestVoicingsRail';
import { ChessMovesPanel } from './components/ChessMovesPanel';
import { ChordHero } from './components/ChordHero';
import { CodexHeader, type StylePreset, type WorkspaceTab } from './components/CodexHeader';
import { ConfigurationDrawer } from './components/ConfigurationDrawer';
import { FretboardVisualizer } from './components/FretboardVisualizer';
import { ProgressionPanel } from './components/ProgressionPanel';
import { SolverStatus } from './components/SolverStatus';
import { VoicingExplainer } from './components/VoicingExplainer';
import { VoicingList } from './components/VoicingList';
import type { BandContextMode, BandInstrument } from './components/BandContext';
import type { ToneProfileSelection } from './components/SolverOptions';
import { useVoicings } from './hooks/useVoicings';
import { previewIndexAfterRemoval } from './progressionState';

const DEFAULT_GUITAR: GuitarConfig = {
  numStrings: 6,
  numFrets: 24,
  tuning: ['E2', 'A2', 'D3', 'G3', 'C4', 'F4'],
  scaleLengthMm: 648,
  nutWidthMm: 43,
  widthAtLastFretMm: 58,
  fretboardRadiusMm: 400,
  stringSpacingMm: 10.5
};

const DEFAULT_CONSTRAINTS: FingerConstraints = {
  indexLength: 7.5,
  middleLength: 8,
  ringLength: 7.5,
  pinkyLength: 6,
  maxSpan: 4,
  tendonMuting: true
};

function voicingKey(voicing: ChordVoicing) {
  return voicing.frets.join(',');
}

export default function App() {
  const [rootNote, setRootNote] = useState('C');
  const [chord, setChord] = useState('');
  const [globalKey, setGlobalKey] = useState('C Major');
  const [stylePreset, setStylePreset] = useState<StylePreset>('worship');
  const [gravityCenter, setGravityCenter] = useState(7);
  const [voicingMode, setVoicingMode] = useState<BandContextMode>('style');
  const [bandInstruments, setBandInstruments] = useState<BandInstrument[]>([]);
  const [calibrationEnabled, setCalibrationEnabled] = useState(false);
  const [preferredShapeIds, setPreferredShapeIds] = useState<string[]>([]);
  const [allowExtensions, setAllowExtensions] = useState(false);
  const [allowRootlessWithBass, setAllowRootlessWithBass] = useState(true);
  const [toneProfile, setToneProfile] = useState<ToneProfileSelection>('auto');
  const [minimumClarity, setMinimumClarity] = useState(55);
  const [guitarConfig, setGuitarConfig] = useState<GuitarConfig>(DEFAULT_GUITAR);
  const [fingerConstraints, setFingerConstraints] = useState<FingerConstraints>(DEFAULT_CONSTRAINTS);
  const [selectedVoicing, setSelectedVoicing] = useState<ChordVoicing | null>(null);
  const [hoveredNoteIdx, setHoveredNoteIdx] = useState<number | null>(null);
  const [pinnedNoteIdx, setPinnedNoteIdx] = useState<number | null>(null);
  const [pinnedVoicings, setPinnedVoicings] = useState<ChordVoicing[]>([]);
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('learn');
  const [configurationOpen, setConfigurationOpen] = useState(false);

  const request = useMemo(() => ({
    chord: rootNote + chord,
    rootNote,
    globalKey,
    gravityCenter,
    mode: voicingMode,
    ensemble: bandInstruments,
    preferenceProfile: {
      enabled: calibrationEnabled,
      preferredShapeIds
    },
    policy: {
      allowExtensions,
      allowRootlessWithBass,
      acousticProfile: toneProfile,
      minimumClarity
    },
    stylePreset,
    fingerConstraints,
    guitarConfig,
    contextVoicings: pinnedVoicings
  }), [
    rootNote,
    chord,
    globalKey,
    gravityCenter,
    voicingMode,
    bandInstruments,
    calibrationEnabled,
    preferredShapeIds,
    allowExtensions,
    allowRootlessWithBass,
    toneProfile,
    minimumClarity,
    stylePreset,
    fingerConstraints,
    guitarConfig,
    pinnedVoicings
  ]);

  const voicingSearch = useVoicings(request);
  const voicings = voicingSearch.data;

  useEffect(() => {
    setSelectedVoicing((current) => {
      if (voicings.length === 0) return null;
      const match = current && voicings.find((voicing) => voicingKey(voicing) === voicingKey(current));
      return match ?? voicings[0];
    });
  }, [voicings]);

  useEffect(() => {
    setHoveredNoteIdx(null);
    setPinnedNoteIdx(null);
  }, [stylePreset, globalKey, rootNote, chord, gravityCenter, voicingMode, bandInstruments]);

  const activeDisplayVoicing = previewIdx !== null ? pinnedVoicings[previewIdx] ?? selectedVoicing : selectedVoicing;
  const activeAnalysis = useMemo(
    () => activeDisplayVoicing ? analyzeVoicing(activeDisplayVoicing, request) : null,
    [activeDisplayVoicing, request]
  );
  const chordDisplayName = chord === '' ? `${rootNote} Major` : activeAnalysis?.actualChordSymbol ?? `${rootNote}${chord}`;

  const frequencyDiagnosis = useMemo(() => {
    if (!activeDisplayVoicing?.spectralClarity) return null;
    const spectral = activeDisplayVoicing.spectralClarity;
    return {
      score: activeDisplayVoicing.frequencyScore ?? spectral.score,
      profile: spectral.profile,
      roughnessScore: spectral.components.roughness.score,
      densityScore: spectral.components.registerDensity.score,
      duplicationScore: spectral.components.duplication.score,
      ensemblePenalty: activeDisplayVoicing.ensembleClarityPenalty ?? 0
    };
  }, [activeDisplayVoicing]);

  const handlePinVoicing = (voicing: ChordVoicing) => {
    setPinnedVoicings((current) => [...current, voicing]);
  };

  const handleRemovePin = (index: number) => {
    setPinnedVoicings((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setPreviewIdx((current) => previewIndexAfterRemoval(current, index));
  };

  const togglePreference = (shapeId: string) => {
    setPreferredShapeIds((current) => current.includes(shapeId)
      ? current.filter((id) => id !== shapeId)
      : [...current, shapeId]
    );
  };

  return (
    <div className="codex-app" data-visual-theme="orrery">
      <CodexHeader
        rootNote={rootNote}
        chord={chord}
        globalKey={globalKey}
        stylePreset={stylePreset}
        activeTab={activeTab}
        drawerOpen={configurationOpen}
        onChordChange={(newRoot, newChord, newKey) => {
          setRootNote(newRoot);
          setChord(newChord);
          setGlobalKey(newKey);
        }}
        onStyleChange={setStylePreset}
        onTabChange={setActiveTab}
        onDrawerToggle={() => setConfigurationOpen((open) => !open)}
      />

      <ConfigurationDrawer
        open={configurationOpen}
        gravityCenter={gravityCenter}
        voicingMode={voicingMode}
        bandInstruments={bandInstruments}
        calibrationEnabled={calibrationEnabled}
        allowExtensions={allowExtensions}
        allowRootlessWithBass={allowRootlessWithBass}
        toneProfile={toneProfile}
        minimumClarity={minimumClarity}
        guitarConfig={guitarConfig}
        fingerConstraints={fingerConstraints}
        onGravityCenterChange={setGravityCenter}
        onModeChange={setVoicingMode}
        onInstrumentsChange={setBandInstruments}
        onCalibrationEnabledChange={setCalibrationEnabled}
        onAllowExtensionsChange={setAllowExtensions}
        onAllowRootlessWithBassChange={setAllowRootlessWithBass}
        onToneProfileChange={setToneProfile}
        onMinimumClarityChange={setMinimumClarity}
        onGuitarChange={setGuitarConfig}
        onHandChange={setFingerConstraints}
      />

      <main className="codex-workspace">
        <BestVoicingsRail
          voicings={voicings}
          selectedVoicing={selectedVoicing}
          preferredShapeIds={preferredShapeIds}
          config={guitarConfig}
          onSelect={setSelectedVoicing}
          onPin={handlePinVoicing}
          onPreferenceToggle={togglePreference}
        />

        <section className="learning-stage">
          <SolverStatus state={voicingSearch} />
          <ChordHero
            chordSymbol={chordDisplayName}
            globalKey={globalKey}
            analysis={activeAnalysis}
            voicing={activeDisplayVoicing}
          />

          <section className="board-panel">
            <div className="board-panel__heading">
              <span>
                <small>Geometric score</small>
                <strong>Fretboard constellation</strong>
              </span>
              {activeDisplayVoicing && (
                <span className="board-panel__fit">
                  <small>Overall fit</small>
                  <strong>{Math.round(activeDisplayVoicing.overallScore ?? activeDisplayVoicing.playabilityScore)}</strong>
                </span>
              )}
            </div>
            <FretboardVisualizer
              config={guitarConfig}
              voicing={activeDisplayVoicing}
              preset={stylePreset}
              rootNote={rootNote}
              analysis={activeAnalysis}
              highlightedNoteIdx={previewIdx !== null ? null : hoveredNoteIdx ?? pinnedNoteIdx}
              isPreview={previewIdx !== null}
              onPieceHover={setHoveredNoteIdx}
              onPiecePin={setPinnedNoteIdx}
            />
          </section>

          <ProgressionPanel
            voicings={pinnedVoicings}
            activePreviewIdx={previewIdx}
            onPreviewToggle={setPreviewIdx}
            onRemove={handleRemovePin}
            config={guitarConfig}
          />

          {activeTab === 'learn' ? (
            <ChessMovesPanel
              analysis={activeAnalysis}
              config={guitarConfig}
              hoveredIdx={hoveredNoteIdx}
              pinnedIdx={pinnedNoteIdx}
              onHover={setHoveredNoteIdx}
              onPin={setPinnedNoteIdx}
            />
          ) : (
            <section className="generated-voicings">
              <VoicingList
                voicings={voicings}
                selectedVoicing={selectedVoicing}
                onSelect={setSelectedVoicing}
                onPin={handlePinVoicing}
                preferredShapeIds={preferredShapeIds}
                onPreferenceToggle={togglePreference}
                config={guitarConfig}
              />
              <details className="analysis-details">
                <summary>Open harmonic and spectral diagnosis</summary>
                <VoicingExplainer
                  analysis={activeAnalysis}
                  voicing={activeDisplayVoicing}
                  provenance={voicingSearch.provenance}
                  searchTruncated={voicingSearch.diagnostics?.truncated}
                  gateDiagnostics={voicingSearch.diagnostics?.gateDiagnostics}
                  frequencyDiagnosis={frequencyDiagnosis}
                />
              </details>
            </section>
          )}
        </section>
      </main>

      <footer className="codex-footer">
        <span>Orrery Rococó · visual theme 02</span>
        <span>All-fourths constraint engine</span>
      </footer>
    </div>
  );
}
