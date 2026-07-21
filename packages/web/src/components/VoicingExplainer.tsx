import React from 'react';
import type {
  ChordVoicing,
  GateDiagnostics,
  ScoreDimension,
  SolverProvenance,
  VoicingAnalysis,
  VoicingScoreBreakdown
} from '@guitar-paradigm/core';
import { FiActivity } from 'react-icons/fi';

interface FrequencyDiagnosis {
  score: number;
  profile: string;
  roughnessScore: number;
  densityScore: number;
  duplicationScore: number;
  ensemblePenalty: number;
}

interface VoicingExplainerProps {
  analysis: VoicingAnalysis | null;
  voicing?: ChordVoicing | null;
  provenance?: SolverProvenance | null;
  searchTruncated?: boolean;
  gateDiagnostics?: GateDiagnostics | null;
  frequencyDiagnosis?: FrequencyDiagnosis | null;
}

const SCORE_LABELS: Record<ScoreDimension, string> = {
  playability: 'Playability',
  frequency: 'Clarity',
  harmonic: 'Harmony',
  style: 'Style',
  traditional: 'Traditional',
  transition: 'Transition',
  position: 'Position'
};

export const VoicingExplainer: React.FC<VoicingExplainerProps> = ({
  analysis,
  voicing,
  provenance,
  searchTruncated = false,
  gateDiagnostics,
  frequencyDiagnosis
}) => {
  if (!analysis) return null;

  const scoreEntries = voicing?.scoreBreakdown
    ? Object.entries(voicing.scoreBreakdown.components) as Array<[
      ScoreDimension,
      VoicingScoreBreakdown['components'][ScoreDimension]
    ]>
    : [];

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 mt-4 shadow-lg shadow-black/20">
      <h3 className="text-emerald-400 font-mono font-bold text-sm mb-3">
        Voicing Analysis: {analysis.actualChordSymbol} · {analysis.chordType}
      </h3>
      
      <div className="flex flex-wrap gap-2 mb-4">
        {analysis.flags.map((flag, idx) => (
          <span 
            key={idx} 
            className={`px-2 py-1 text-[10px] font-bold rounded uppercase tracking-wider ${
              flag.type === 'positive' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
              flag.type === 'warning' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
              'bg-slate-700/50 text-slate-300 border border-slate-600/50'
            }`}
          >
            {flag.label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {analysis.noteRoles.map((role, idx) => (
          <div key={idx} className="bg-slate-950/50 rounded p-2 flex flex-col border border-slate-800/50">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-mono font-bold text-white">{role.note}</span>
              <span className="text-[9px] font-mono text-slate-400">Str: {role.stringIdx + 1} | Fret: {role.fret}</span>
            </div>
            <span className="text-[10px] text-teal-400 font-medium uppercase">{role.role}</span>
          </div>
        ))}
      </div>

      {frequencyDiagnosis && (
        <div className="mt-4 border-t border-slate-800 pt-4">
          <h4 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-3">
            <FiActivity className="inline mr-1" aria-hidden="true" /> Frequency Diagnosis
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <div className="bg-slate-950/60 rounded p-2.5 border border-slate-800/50">
              <div className="text-[9px] uppercase tracking-wider text-slate-500 mb-1">Spectral Clarity</div>
              <div className={`text-lg font-mono font-bold ${
                frequencyDiagnosis.score >= 80 ? 'text-emerald-400'
                : frequencyDiagnosis.score >= 55 ? 'text-amber-400'
                : 'text-red-400'
              }`}>
                {frequencyDiagnosis.score.toFixed(0)}
                <span className="text-[9px] text-slate-500 ml-1">/100</span>
              </div>
            </div>
            <div className="bg-slate-950/60 rounded p-2.5 border border-slate-800/50">
              <div className="text-[9px] uppercase tracking-wider text-slate-500 mb-1">Tone Profile</div>
              <div className="text-xs font-bold text-teal-400 capitalize">{frequencyDiagnosis.profile}</div>
            </div>
            <div className="bg-slate-950/60 rounded p-2.5 border border-slate-800/50">
              <div className="text-[9px] uppercase tracking-wider text-slate-500 mb-1">Roughness</div>
              <div className="text-xs font-mono font-bold text-slate-300">{frequencyDiagnosis.roughnessScore.toFixed(0)}</div>
            </div>
            <div className="bg-slate-950/60 rounded p-2.5 border border-slate-800/50">
              <div className="text-[9px] uppercase tracking-wider text-slate-500 mb-1">Register Density</div>
              <div className="text-xs font-mono font-bold text-slate-300">{frequencyDiagnosis.densityScore.toFixed(0)}</div>
            </div>
            <div className="bg-slate-950/60 rounded p-2.5 border border-slate-800/50">
              <div className="text-[9px] uppercase tracking-wider text-slate-500 mb-1">Duplication</div>
              <div className="text-xs font-mono font-bold text-slate-300">{frequencyDiagnosis.duplicationScore.toFixed(0)}</div>
            </div>
            <div className="bg-slate-950/60 rounded p-2.5 border border-slate-800/50">
              <div className="text-[9px] uppercase tracking-wider text-slate-500 mb-1">Ensemble Masking</div>
              <div className="text-xs font-mono font-bold text-slate-300">-{frequencyDiagnosis.ensemblePenalty.toFixed(0)}</div>
            </div>
          </div>
        </div>
      )}

      {voicing?.scoreBreakdown && (
        <div className="mt-4 border-t border-slate-800 pt-4">
          <h4 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-3">Score composition</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {scoreEntries.map(([dimension, component]) => (
              <div key={dimension} className="bg-slate-950/60 rounded p-2.5 border border-slate-800/50">
                <div className="text-[9px] uppercase tracking-wider text-slate-500 mb-1">{SCORE_LABELS[dimension]}</div>
                <div className="text-xs font-mono text-slate-300">
                  {component.score.toFixed(1)} × {(component.normalizedWeight * 100).toFixed(1)}%
                </div>
                <strong className="text-sm font-mono text-teal-400">+{component.contribution.toFixed(2)}</strong>
              </div>
            ))}
          </div>
          <p className="text-[10px] font-mono text-slate-400 mt-3">
            Base {voicing.scoreBreakdown.baseScore.toFixed(2)} · shape bonus {voicing.scoreBreakdown.bonuses.preferredShape.toFixed(0)} · total {voicing.scoreBreakdown.totalScore.toFixed(2)}
          </p>
        </div>
      )}

      {provenance && (
        <div className="mt-4 border-t border-slate-800 pt-4">
          <h4 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-3">Solver provenance</h4>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] font-mono">
            <div><dt className="text-slate-500">Request</dt><dd className="text-slate-300">{provenance.requestHash}</dd></div>
            <div><dt className="text-slate-500">Solver</dt><dd className="text-slate-300">{provenance.solverVersion}</dd></div>
            <div><dt className="text-slate-500">Policies</dt><dd className="text-slate-300">{provenance.policies.rankingVersion} · {provenance.policies.styleVersion}</dd></div>
            <div><dt className="text-slate-500">Search</dt><dd className="text-slate-300">{provenance.search.strategy} · budget {provenance.search.budget}{searchTruncated ? ' · partial' : ' · exhausted'}</dd></div>
          </dl>
          {gateDiagnostics && (
            <p className="text-[10px] font-mono text-slate-400 mt-3">
              Gates · accepted {gateDiagnostics.accepted} · harmonic {gateDiagnostics.rejected.harmonic} · physical {gateDiagnostics.rejected.physical} · continuity {gateDiagnostics.rejected.stringContinuity} · acoustic {gateDiagnostics.rejected.acoustic} · style {gateDiagnostics.rejected.style}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
