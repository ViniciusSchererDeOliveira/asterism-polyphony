import type { ChordVoicing, VoicingAnalysis } from '@guitar-paradigm/core';
import celestialOrrery from '../assets/celestial-botanical-orrery.png';
import { voicingClassification } from '../voicingClassification';
import { PieceGlyph, intervalRoman } from './PieceGlyph';

interface ChordHeroProps {
  chordSymbol: string;
  globalKey: string;
  analysis: VoicingAnalysis | null;
  voicing: ChordVoicing | null;
}

export function ChordHero({ chordSymbol, globalKey, analysis, voicing }: ChordHeroProps) {
  const roles = analysis?.noteRoles.filter((role, index, all) => all.findIndex(item => item.interval === role.interval) === index) ?? [];
  const classification = voicingClassification(voicing);

  return (
    <section className="chord-hero">
      <div className="chord-hero__copy">
        <span className="chord-hero__eyebrow">Current constellation · {globalKey}</span>
        <div className="chord-hero__title-row">
          <h1>{chordSymbol}</h1>
          <span className="exact-badge">{classification}</span>
        </div>
        <p>{analysis?.chordType ?? 'Searching exact voicings'} arranged as a geometric movement pattern for all-fourths tuning.</p>
        <div className="degree-orbit" aria-label="Chord degrees">
          {roles.map((role) => (
            <span key={role.interval} className={`degree-orbit__item degree-${role.interval}`}>
              <PieceGlyph interval={role.interval} label={role.role} size={20} />
              <strong>{intervalRoman(role.interval)}</strong>
              <small>{role.note}</small>
            </span>
          ))}
        </div>
      </div>
      <img className="chord-hero__art" src={celestialOrrery} alt="Celestial botanical orrery in cobalt and antique gold" />
    </section>
  );
}
