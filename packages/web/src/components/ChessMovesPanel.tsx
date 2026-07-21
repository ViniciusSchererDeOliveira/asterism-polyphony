import React from 'react';
import {
  type DegreePiece,
  type DegreeRule,
  type DegreeRuleBlock,
  type DegreeRuleOption,
  type GuitarConfig,
  type NoteRoleDetail,
  type VoicingAnalysis
} from '@guitar-paradigm/core';
import { FiLock, FiMousePointer } from 'react-icons/fi';
import { GiTeleport } from 'react-icons/gi';
import { PieceGlyph, degreeToneClass, intervalRoman } from './PieceGlyph.js';
import { buildMovementPresentation } from './movementPresentation.js';

interface ChessMovesPanelProps {
  analysis: VoicingAnalysis | null;
  config: GuitarConfig;
  hoveredIdx: number | null;
  pinnedIdx: number | null;
  onHover: (idx: number | null) => void;
  onPin: (idx: number | null) => void;
}

function coordinate(role: Pick<NoteRoleDetail, 'stringIdx' | 'fret'>) {
  return `S${role.stringIdx + 1} · F${role.fret}`;
}

function pitchedMidi(note: string, midi: number) {
  return `${note}${Math.floor(midi / 12) - 1}`;
}

function arrow(value: number, positive: string, negative: string) {
  if (value === 0) return '—';
  return `${value > 0 ? positive : negative}${Math.abs(value)}`;
}

function notation(rule: Pick<DegreeRule, 'deltaString' | 'deltaFret'>) {
  const stringMove = arrow(rule.deltaString, '↑', '↓');
  const fretMove = arrow(rule.deltaFret, '→', '←');
  if (rule.deltaString === 0) return fretMove;
  if (rule.deltaFret === 0) return stringMove;
  return `${stringMove} / ${fretMove}`;
}

function pieceLabel(piece: DegreePiece) {
  return piece.toUpperCase();
}

function signedSemitones(value: number) {
  if (value === 0) return '0 ST';
  return `${value > 0 ? '+' : '−'}${Math.abs(value)} ST`;
}

function portalShiftLabel(value: number) {
  if (value === 0) return '0 OCT · UNISON';
  return `${value > 0 ? '+' : '−'}${Math.abs(value)} OCT`;
}

function blockLabel(block?: DegreeRuleBlock) {
  if (block === 'nut') return 'BLOCKED · NUT';
  if (block === 'fretboard-end') return 'BLOCKED · FRET LIMIT';
  if (block === 'string-boundary') return 'BLOCKED · STRING LIMIT';
  return 'AVAILABLE';
}

function boundaryName(block?: DegreeRuleBlock) {
  if (block === 'nut') return 'nut';
  if (block === 'fretboard-end') return 'fret limit';
  if (block === 'string-boundary') return 'string limit';
  return 'board boundary';
}

function visibleRules(rules: DegreeRuleOption[], selected: DegreeRuleOption) {
  const primary = rules[0];
  const compactAlternatives = rules.filter(rule => (
    rule.status === 'available'
    && rule.id !== selected.id
    && rule.id !== primary.id
    && Math.abs(rule.deltaString) * 1.75 + Math.abs(rule.deltaFret) <= 8
  ));
  return [primary, selected, ...compactAlternatives]
    .filter((rule): rule is DegreeRuleOption => Boolean(rule))
    .filter((rule, index, all) => all.findIndex(candidate => candidate.id === rule.id) === index)
    .slice(0, 3);
}

export function ChessMovesPanel({ analysis, config, hoveredIdx, pinnedIdx, onHover, onPin }: ChessMovesPanelProps) {
  if (!analysis || analysis.noteRoles.length === 0) return null;

  const presentation = buildMovementPresentation(analysis, config);
  const { rootIndex, anchorIndex, anchor, allFourths } = presentation;
  if (!anchor) return null;
  const candidates = presentation.destinations;
  const selectedPieceByIndex = new Map(candidates.map(({ index, movement }) => [index, movement.selectedRule.piece]));
  const fallback = candidates[0];
  if (!fallback) return null;
  const requestedIndex = hoveredIdx ?? pinnedIdx;
  const rootSelected = requestedIndex === anchorIndex;
  const active = rootSelected ? null : candidates.find(({ index }) => index === requestedIndex) ?? fallback;
  const destination = active?.role ?? anchor;

  if (!allFourths) {
    return (
      <section className="movement-score movement-score--paused">
        <div className="movement-score__heading">
          <span>
            <small>Degree rulebook</small>
            <strong>All-fourths rules are paused</strong>
          </span>
        </div>
        <p>Restore an all-fourths tuning to use the chess movement grammar.</p>
      </section>
    );
  }

  const movement = rootSelected ? null : active?.movement ?? null;
  const selected = movement?.selectedRule ?? null;
  const rulesShown = movement && selected ? visibleRules(movement.rules, selected) : [];
  const usableShownCount = rulesShown.filter(rule => rule.status !== 'blocked').length;
  const portal = movement?.portal ?? null;
  const primaryBlocked = movement?.primaryRule.status === 'blocked';
  const stringSemitones = (selected?.deltaString ?? 0) * 5;
  const fretSemitones = selected?.deltaFret ?? 0;
  const degreeSemitones = ((destination.interval - anchor.interval) % 12 + 12) % 12;
  const portalId = 'P1';
  const movementOrder = movement?.route.order === 'portal-first'
    ? 'portal-before-route'
    : movement?.route.order === 'rule-first'
      ? 'route-before-portal'
      : 'route-only';
  const portalNote = portal?.placement === 'before-rule' ? anchor.note : destination.note;
  const portalMap = portal ? (
    <div
      className="movement-card__portal-map"
      data-portal-pair={portalId}
      data-portal-order={portal.placement}
      data-boundary-fallback={portal.fallbackBy}
      aria-label={`${portalId} portal from IN to OUT`}
    >
      <span data-portal-end="in" data-portal-pitch={pitchedMidi(portalNote, portal.entry.midi)}>
        <GiTeleport aria-hidden="true" />
        <b>{portalId} · IN</b>
        <small>{pitchedMidi(portalNote, portal.entry.midi)} · S{portal.entry.stringIdx + 1}/F{portal.entry.fret}</small>
      </span>
      <strong>→ {portalShiftLabel(portal.octaveDelta)} →</strong>
      <span data-portal-end="out" data-portal-pitch={pitchedMidi(portalNote, portal.exit.midi)}>
        <GiTeleport aria-hidden="true" />
        <b>{portalId} · OUT</b>
        <small>{pitchedMidi(portalNote, portal.exit.midi)} · S{portal.exit.stringIdx + 1}/F{portal.exit.fret}</small>
      </span>
    </div>
  ) : null;

  return (
    <section className="movement-score">
      <div className="movement-score__heading">
        <span>
          <small>Degree rulebook</small>
          <strong>Each piece owns a route from {rootIndex >= 0 ? 'I' : 'the anchor'}</strong>
        </span>
        <div
          className="movement-score__selectors"
          aria-label="Select destination degree"
          onMouseLeave={() => onHover(null)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node)) onHover(null);
          }}
        >
          {[{ role: anchor, index: anchorIndex }, ...candidates].map(({ role, index }) => (
            <button
              type="button"
              key={`${role.interval}-${index}`}
              className={degreeToneClass(index === anchorIndex ? 0 : role.interval, 'selector')}
              aria-pressed={rootSelected ? index === anchorIndex : active?.index === index}
              onMouseEnter={() => onHover(index)}
              onFocus={() => onHover(index)}
              onClick={() => onPin(pinnedIdx === index ? null : index)}
            >
              <PieceGlyph interval={role.interval} piece={index === anchorIndex ? 'king' : selectedPieceByIndex.get(index)} size={16} /> {index === anchorIndex && rootIndex < 0 ? 'A' : intervalRoman(role.interval)}
            </button>
          ))}
        </div>
      </div>

      <div className="movement-score__grid" data-layout-state={rootSelected ? 'anchor-only' : 'degree-route'}>
        <article className="movement-card movement-card--origin">
          <span className="movement-card__index">01 · Anchor</span>
          <div className="movement-card__piece piece--root">
            <PieceGlyph interval={anchor.interval} piece="king" size={32} />
          </div>
          <div>
            <strong>{anchor.note} · {rootIndex >= 0 ? 'I' : intervalRoman(anchor.interval)}</strong>
            <small>{coordinate(anchor)} · {rootIndex >= 0 ? 'KING · NO MOVE' : 'PROXY · ROOT OMITTED'}</small>
          </div>
          <p>{rootIndex >= 0
            ? 'The red king defines zero. The destination degree owns every outgoing rule.'
            : 'The chord omits I, so this note is an explicit proxy anchor rather than a hidden root.'}</p>
        </article>

        {rootSelected || !movement || !selected ? (
          <article className="movement-card movement-card--root-idle">
            <span className="movement-card__index">02 · Root selected · Anchor only</span>
            <strong className={`movement-card__notation ${degreeToneClass(0, 'route')}`}>
              <PieceGlyph interval={0} piece="king" size={30} />
              NO PATH
            </strong>
            <small className="movement-card__from">I · ROOT · (0, 0)</small>
            <p>The Root defines the origin and never generates a route or portal. Choose a destination piece to reveal its path.</p>
          </article>
        ) : (
          <>
            <article
              className="movement-card movement-card--travel"
              data-movement-order={movementOrder}
              data-boundary-fallback={portal?.fallbackBy}
              data-rule-piece={selected.piece}
            >
              <span className="movement-card__index">
                02 · {intervalRoman(destination.interval)} rule · {rulesShown.length} patterns · {usableShownCount} usable here
                {portal?.placement === 'before-rule' ? ' · portal first' : portal ? ' · boundary fallback' : ''}
              </span>
              {portal?.placement === 'before-rule' && (
                <div className="movement-card__sequence" data-sequence-step="1">
                  <small>{portalId} PORTAL → {pieceLabel(selected.piece)} ROUTE</small>
                  {portalMap}
                </div>
              )}
              <strong className={`movement-card__notation ${degreeToneClass(destination.interval, 'route')}`}>
                <PieceGlyph interval={destination.interval} piece={selected.piece} size={30} />
                {notation(selected)}
              </strong>
              <small className="movement-card__from">
                {portal?.placement === 'before-rule' ? `${portalId} OUT` : rootIndex >= 0 ? 'I' : 'Anchor'} → {intervalRoman(destination.interval)} · {signedSemitones(degreeSemitones)}
              </small>

              <div className="movement-card__steps" data-sequence-step={portal?.placement === 'before-rule' ? '2' : '1'}>
                {selected.deltaString !== 0 && (
                  <span>① {selected.deltaString > 0 ? 'up' : 'down'} {Math.abs(selected.deltaString)} string{Math.abs(selected.deltaString) === 1 ? '' : 's'} · {signedSemitones(stringSemitones)}</span>
                )}
                {selected.deltaFret !== 0 && (
                  <span>{selected.deltaString !== 0 ? '②' : '①'} {selected.deltaFret > 0 ? 'right' : 'left'} {Math.abs(selected.deltaFret)} fret{Math.abs(selected.deltaFret) === 1 ? '' : 's'} · {signedSemitones(fretSemitones)}</span>
                )}
                {selected.geometry === 'exact-diagonal' && <span>exact diagonal · {Math.abs(selected.deltaString)} = {Math.abs(selected.deltaFret)}</span>}
              </div>

              {portal?.placement === 'after-rule' && (
                <div className="movement-card__sequence movement-card__sequence--fallback" data-sequence-step="2">
                  <small>{pieceLabel(selected.piece)} ROUTE → {portalId} PORTAL · BOUNDARY FALLBACK · {boundaryName(portal.fallbackBy)}</small>
                  {portalMap}
                </div>
              )}

              <div className="movement-card__rules" aria-label={`${intervalRoman(destination.interval)} equivalent rules`}>
                {rulesShown.map(rule => (
                  <span key={rule.id} className={`movement-rule movement-rule--${rule.status}`}>
                    <PieceGlyph interval={destination.interval} piece={rule.piece} size={14} />
                    <b>{pieceLabel(rule.piece)} · {notation(rule)}</b>
                    <small>{rule.status === 'selected' ? 'USED HERE' : blockLabel(rule.blockedBy)}</small>
                  </span>
                ))}
              </div>

              <p>{portal?.placement === 'before-rule'
                ? `Gold moves the Root reference ${portalShiftLabel(portal.octaveDelta)} to ${portalId} OUT. The solid ${intervalRoman(destination.interval)} route starts there and lands on the sounded note.`
                : portal
                  ? `The translated Root would cross the ${boundaryName(portal.fallbackBy)}. The solid ${intervalRoman(destination.interval)} route stays on the board first; gold then carries ${portalShiftLabel(portal.octaveDelta)} to ${portalId} OUT.`
                  : 'The selected degree rule lands directly on the sounded voicing; no portal is needed.'}</p>
              {primaryBlocked && (
                <p className="movement-card__reason">
                  The canonical {pieceLabel(movement.primaryRule.piece)} {notation(movement.primaryRule)} is blocked by the {movement.primaryRule.blockedBy === 'nut' ? 'nut' : 'board boundary'}, so the closest valid rule is used.
                </p>
              )}
            </article>

            <article className="movement-card movement-card--destination">
              <span className="movement-card__index">
                03 · Voicing landing {portal?.placement === 'after-rule' ? `· ${portalId} OUT` : portal ? `· route after ${portalId} OUT` : ''}
              </span>
              <div
                className={`movement-card__piece ${degreeToneClass(destination.interval, 'piece')}`}
                data-route-piece={selected.piece}
              >
                <PieceGlyph interval={destination.interval} piece={selected.piece} size={32} />
              </div>
              <div>
                <strong>{pitchedMidi(destination.note, destination.midi)} · {intervalRoman(destination.interval)}</strong>
                <small>{coordinate(destination)}</small>
              </div>
              <p>{portal?.placement === 'before-rule'
                ? `The solid ${intervalRoman(destination.interval)} route lands here after ${portalId} OUT repositioned the Root reference.`
                : portal
                  ? `${portalId} OUT coincides with this sounded note. The portal adds no string or fret movement.`
                  : 'This is the sounded note reached directly by the selected piece route.'}</p>
            </article>
          </>
        )}
      </div>

      <div className="movement-score__footer">
        <span><FiMousePointer /> Hover to preview</span>
        <span><FiLock /> Click to keep the rule visible</span>
        <span>Diagonal = equal axes only</span>
      </div>
    </section>
  );
}
