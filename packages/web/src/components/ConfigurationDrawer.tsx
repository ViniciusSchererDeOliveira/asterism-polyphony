import type { FingerConstraints, GuitarConfig } from '@guitar-paradigm/core';
import { GuitarConfigurator } from './GuitarConfigurator';
import { HandConstraints } from './HandConstraints';
import { GravityCenter } from './GravityCenter';
import { BandContext, type BandContextMode, type BandInstrument } from './BandContext';
import { SolverOptions, type ToneProfileSelection } from './SolverOptions';

interface ConfigurationDrawerProps {
  open: boolean;
  gravityCenter: number;
  voicingMode: BandContextMode;
  bandInstruments: BandInstrument[];
  calibrationEnabled: boolean;
  allowExtensions: boolean;
  allowRootlessWithBass: boolean;
  toneProfile: ToneProfileSelection;
  minimumClarity: number;
  guitarConfig: GuitarConfig;
  fingerConstraints: FingerConstraints;
  onGravityCenterChange: (value: number) => void;
  onModeChange: (mode: BandContextMode) => void;
  onInstrumentsChange: (instruments: BandInstrument[]) => void;
  onCalibrationEnabledChange: (enabled: boolean) => void;
  onAllowExtensionsChange: (enabled: boolean) => void;
  onAllowRootlessWithBassChange: (enabled: boolean) => void;
  onToneProfileChange: (profile: ToneProfileSelection) => void;
  onMinimumClarityChange: (value: number) => void;
  onGuitarChange: (config: GuitarConfig) => void;
  onHandChange: (constraints: FingerConstraints) => void;
}

export function ConfigurationDrawer(props: ConfigurationDrawerProps) {
  if (!props.open) return null;

  return (
    <section id="solver-configuration" className="configuration-drawer" aria-label="Guitar and solver configuration">
      <div className="configuration-drawer__heading">
        <span>Instrument observatory</span>
        <strong>All fourths · E A D G C F</strong>
      </div>
      <div className="configuration-drawer__grid codex-config-surface">
        <GravityCenter gravityCenter={props.gravityCenter} onChange={props.onGravityCenterChange} />
        <BandContext
          mode={props.voicingMode}
          instruments={props.bandInstruments}
          onModeChange={props.onModeChange}
          onInstrumentsChange={props.onInstrumentsChange}
          calibrationEnabled={props.calibrationEnabled}
          onCalibrationEnabledChange={props.onCalibrationEnabledChange}
        />
        <SolverOptions
          allowExtensions={props.allowExtensions}
          allowRootlessWithBass={props.allowRootlessWithBass}
          toneProfile={props.toneProfile}
          minimumClarity={props.minimumClarity}
          bassSelected={props.bandInstruments.includes('bass')}
          onAllowExtensionsChange={props.onAllowExtensionsChange}
          onAllowRootlessWithBassChange={props.onAllowRootlessWithBassChange}
          onToneProfileChange={props.onToneProfileChange}
          onMinimumClarityChange={props.onMinimumClarityChange}
        />
        <GuitarConfigurator config={props.guitarConfig} onChange={props.onGuitarChange} />
        <HandConstraints constraints={props.fingerConstraints} onChange={props.onHandChange} />
      </div>
    </section>
  );
}
