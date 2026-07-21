import React, { useId } from 'react';
import {
  type ChordVoicing,
  type DegreeRule,
  type DegreeRuleBlock,
  type GuitarConfig,
  type VoicingAnalysis
} from '@guitar-paradigm/core';
import { PieceGlyph, degreeTone, degreeToneClass, intervalRoman } from './PieceGlyph.js';
import { buildMovementPresentation } from './movementPresentation.js';

interface FretboardVisualizerProps {
  config: GuitarConfig;
  voicing: ChordVoicing | null;
  preset: 'worship' | 'jrock' | 'mathrock' | 'metalcore';
  rootNote?: string;
  analysis?: VoicingAnalysis | null;
  highlightedNoteIdx?: number | null;
  isPreview?: boolean;
  onPieceHover?: (idx: number | null) => void;
  onPiecePin?: (idx: number | null) => void;
}

const BOARD_WIDTH = 1280;
const BOARD_HEIGHT = 392;
const LEFT = 92;
const RIGHT = 20;
const TOP = 56;
const NECK_HEIGHT = 280;

function arrow(value: number, positive: string, negative: string) {
  if (value === 0) return '—';
  return `${value > 0 ? positive : negative}${Math.abs(value)}`;
}

function movementNotation(rule: Pick<DegreeRule, 'deltaString' | 'deltaFret'>) {
  const strings = arrow(rule.deltaString, '↑', '↓');
  const frets = arrow(rule.deltaFret, '→', '←');
  if (rule.deltaString === 0) return frets;
  if (rule.deltaFret === 0) return strings;
  return `${strings} / ${frets}`;
}

function octaveLabel(value: number) {
  if (value === 0) return '0 OCT · UNISON';
  return `${value > 0 ? '+' : '−'}${Math.abs(value)} OCT`;
}

function pitchedMidi(note: string, midi: number) {
  return `${note}${Math.floor(midi / 12) - 1}`;
}

function pieceLabel(piece: DegreeRule['piece']) {
  return piece.toUpperCase();
}

function boundaryLabel(block?: DegreeRuleBlock) {
  if (block === 'nut') return 'NUT';
  if (block === 'fretboard-end') return 'FRET LIMIT';
  if (block === 'string-boundary') return 'STRING LIMIT';
  return '';
}

function routeCoordinate(point: { stringIdx: number; fret: number }) {
  return `S${point.stringIdx + 1}/F${point.fret}`;
}

export function FretboardVisualizer({
  config,
  voicing,
  analysis,
  highlightedNoteIdx,
  isPreview,
  onPieceHover,
  onPiecePin
}: FretboardVisualizerProps) {
  const lineId = useId().replace(/:/g, '');
  const fretCount = Math.max(config.numFrets, 1);
  const fretWidth = (BOARD_WIDTH - LEFT - RIGHT) / fretCount;
  const stringGap = NECK_HEIGHT / Math.max(1, config.numStrings - 1);
  const presentation = buildMovementPresentation(analysis, config);
  const { roles, allFourths, anchor } = presentation;

  const xForFret = (fret: number) => fret === 0 ? LEFT - 32 : LEFT + (fret - 0.5) * fretWidth;
  const yForString = (stringIndex: number) => TOP + (config.numStrings - 1 - stringIndex) * stringGap;

  const movementLegs = presentation.destinations.map(({ role, index, movement }) => ({
    destination: role,
    destinationIndex: index,
    movement
  }));
  const fallbackActiveIndex = presentation.destinations[0]?.index ?? -1;
  const activeIndex = highlightedNoteIdx ?? fallbackActiveIndex;
  const portalId = 'P1';

  const rulePath = (
    rule: DegreeRule,
    originX: number,
    originY: number,
    destinationX: number,
    destinationY: number
  ) => {
    if (rule.geometry === 'axis' || rule.geometry === 'exact-diagonal') {
      return `M ${originX} ${originY} L ${destinationX} ${destinationY}`;
    }
    return `M ${originX} ${originY} L ${originX} ${destinationY} L ${destinationX} ${destinationY}`;
  };

  return (
    <div className="fretboard-shell">
      <div className="fretboard-shell__meta">
        <span>{config.numFrets}-fret movement board</span>
        <span>{allFourths ? 'All Fourths' : 'Custom tuning'} · {config.tuning.map(note => note.replace(/-?\d+$/, '')).join(' ')}</span>
        {isPreview && <strong>Progression preview</strong>}
      </div>
      <div className="fretboard-board">
        <svg viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`} role="img" aria-label="All-fourths fretboard with degree rules and explicit register portals">
          <defs>
            <marker id={`${lineId}-arrow`} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <path d="M 0 0 L 7 3.5 L 0 7 Z" fill="context-stroke" />
            </marker>
          </defs>
          <rect x={LEFT} y={TOP} width={BOARD_WIDTH - LEFT - RIGHT} height={NECK_HEIGHT} className="fretboard-board__ground" />

          {Array.from({ length: fretCount }).map((_, index) => (
            <rect
              key={index}
              x={LEFT + index * fretWidth}
              y={TOP}
              width={fretWidth}
              height={NECK_HEIGHT}
              className={index % 2 === 0 ? 'fretboard-board__cell' : 'fretboard-board__cell fretboard-board__cell--alternate'}
            />
          ))}

          {Array.from({ length: fretCount + 1 }).map((_, index) => (
            <line
              key={index}
              x1={LEFT + index * fretWidth}
              y1={TOP}
              x2={LEFT + index * fretWidth}
              y2={TOP + NECK_HEIGHT}
              className={index === 0 ? 'fretboard-board__nut' : 'fretboard-board__fret'}
            />
          ))}

          {config.tuning.map((note, stringIndex) => {
            const y = yForString(stringIndex);
            return (
              <g key={`${note}-${stringIndex}`}>
                <line x1={LEFT} y1={y} x2={BOARD_WIDTH - RIGHT} y2={y} className="fretboard-board__string" />
                <text x={LEFT - 52} y={y + 5} className="fretboard-board__tuning">{note}</text>
              </g>
            );
          })}

          {Array.from({ length: fretCount }).map((_, index) => (
            <text key={index} x={xForFret(index + 1)} y={TOP - 24} textAnchor="middle" className="fretboard-board__number">
              {index + 1}
            </text>
          ))}

          {voicing?.barres?.map((barre, index) => {
            const topString = Math.max(barre.fromString, barre.toString);
            const bottomString = Math.min(barre.fromString, barre.toString);
            const y1 = yForString(topString);
            const y2 = yForString(bottomString);
            return (
              <rect
                key={`${barre.fret}-${barre.finger}-${index}`}
                x={xForFret(barre.fret) - 9}
                y={Math.min(y1, y2) - 18}
                width={18}
                height={Math.abs(y2 - y1) + 36}
                rx={9}
                className="fretboard-board__barre"
              />
            );
          })}

          {movementLegs.filter(({ destinationIndex }) => destinationIndex === activeIndex).map(({ destination, destinationIndex, movement }) => {
            const rule = movement.selectedRule;
            const portal = movement.portal;
            const routeOriginX = xForFret(movement.route.origin.fret);
            const routeOriginY = yForString(movement.route.origin.stringIdx);
            const routeLandingX = xForFret(movement.route.landing.fret);
            const routeLandingY = yForString(movement.route.landing.stringIdx);
            const portalEntryX = portal ? xForFret(portal.entry.fret) : 0;
            const portalEntryY = portal ? yForString(portal.entry.stringIdx) : 0;
            const portalExitX = portal ? xForFret(portal.exit.fret) : 0;
            const portalExitY = portal ? yForString(portal.exit.stringIdx) : 0;
            const elbowX = routeOriginX;
            const elbowY = routeLandingY;
            const routeClass = rule.geometry === 'exact-diagonal'
              ? 'is-diagonal'
              : rule.geometry === 'composite'
                ? 'is-stepped'
                : 'is-axis';
            const directLabelX = (routeOriginX + routeLandingX) / 2;
            const directLabelY = (routeOriginY + routeLandingY) / 2 - 11;
            const portalNote = portal?.placement === 'before-rule' ? anchor?.note ?? destination.note : destination.note;
            const portalOrder = portal?.placement === 'before-rule'
              ? 'BEFORE RULE'
              : `AFTER RULE · ${boundaryLabel(portal?.fallbackBy)}`;
            const movementOrder = movement.route.order === 'portal-first'
              ? 'portal-before-route'
              : movement.route.order === 'rule-first'
                ? 'route-before-portal'
                : 'route-only';
            const portalBeforeRule = portal?.placement === 'before-rule';
            const portalEntryLabelX = portalBeforeRule ? portalEntryX + 13 : portalEntryX + 20;
            const portalEntryLabelY = portalBeforeRule ? portalEntryY + 23 : portalEntryY + 31;
            const portalExitLabelX = portalBeforeRule ? portalExitX + 24 : portalExitX + 31;
            const portalExitLabelY = portalBeforeRule ? portalExitY + 27 : portalExitY + 28;
            const portalStatusX = portalBeforeRule
              ? (portalEntryX + portalExitX) / 2 + 16
              : LEFT + 180;
            const portalStatusY = portalBeforeRule
              ? (portalEntryY + portalExitY) / 2 + 18
              : TOP + NECK_HEIGHT + 25;

            return (
              <g
                key={`${lineId}-${destination.interval}-${destinationIndex}`}
                className={`movement-trail ${degreeToneClass(destination.interval, 'route')} ${routeClass} ${portal ? 'has-portal' : ''} is-active`}
                data-degree-route={intervalRoman(destination.interval)}
                data-route-tone={degreeTone(destination.interval)}
                data-rule-piece={rule.piece}
                data-movement-order={movementOrder}
                data-route-origin={routeCoordinate(movement.route.origin)}
                data-route-landing={routeCoordinate(movement.route.landing)}
                data-portal-order={portal?.placement}
                data-boundary-fallback={portal?.fallbackBy}
                data-portal-entry={portal ? routeCoordinate(portal.entry) : undefined}
                data-portal-exit={portal ? routeCoordinate(portal.exit) : undefined}
              >
                <path
                  className="movement-trail__rule"
                  data-route-segment="degree"
                  data-sequence-step={portalBeforeRule ? '2' : '1'}
                  d={rulePath(rule, routeOriginX, routeOriginY, routeLandingX, routeLandingY)}
                  markerEnd={`url(#${lineId}-arrow)`}
                />
                {rule.geometry === 'composite' && (
                  <>
                    <rect x={elbowX - 4} y={elbowY - 4} width={8} height={8} className="movement-trail__joint" />
                    <text x={routeOriginX + 34} y={(routeOriginY + elbowY) / 2 - 3} className="movement-trail__label movement-trail__detail">
                      ① {arrow(rule.deltaString, '↑', '↓')}
                    </text>
                    <text x={(elbowX + routeLandingX) / 2} y={routeLandingY - 11} textAnchor="middle" className="movement-trail__label movement-trail__detail">
                      ② {arrow(rule.deltaFret, '→', '←')}
                    </text>
                  </>
                )}
                {rule.geometry !== 'composite' && (
                  <text
                    x={rule.geometry === 'exact-diagonal' ? Math.min(routeOriginX, routeLandingX) - 14 : directLabelX}
                    y={rule.geometry === 'exact-diagonal' ? Math.min(routeOriginY, routeLandingY) - 11 : directLabelY}
                    textAnchor={rule.geometry === 'exact-diagonal' ? 'end' : 'middle'}
                    className="movement-trail__label movement-trail__detail"
                  >
                    {intervalRoman(destination.interval)} · {pieceLabel(rule.piece)} · {rule.geometry === 'exact-diagonal'
                      ? `EXACT ${Math.abs(rule.deltaString)}=${Math.abs(rule.deltaFret)}`
                      : movementNotation(rule)}
                  </text>
                )}

                {portal && (
                  <>
                    <path
                      className="movement-trail__portal"
                      data-route-segment="portal"
                      data-portal-pair={portalId}
                      data-sequence-step={portalBeforeRule ? '1' : '2'}
                      d={`M ${portalEntryX} ${portalEntryY} L ${portalExitX} ${portalExitY}`}
                      markerEnd={`url(#${lineId}-arrow)`}
                    />
                    <circle
                      cx={portalEntryX}
                      cy={portalEntryY}
                      r={portalBeforeRule ? 31 : 13}
                      className={portalBeforeRule ? 'movement-trail__portal-exit' : 'movement-trail__portal-entry'}
                      data-portal-pair={portalId}
                      data-portal-end="in"
                      data-portal-occupancy={portalBeforeRule ? 'piece' : 'free'}
                    />
                    <circle
                      cx={portalEntryX}
                      cy={portalEntryY}
                      r={portalBeforeRule ? 27 : 6}
                      className={portalBeforeRule ? 'movement-trail__portal-exit-inner' : 'movement-trail__portal-core'}
                      data-portal-pair={portalId}
                    />
                    <circle
                      cx={portalExitX}
                      cy={portalExitY}
                      r={portalBeforeRule ? 13 : 31}
                      className={portalBeforeRule ? 'movement-trail__portal-entry' : 'movement-trail__portal-exit'}
                      data-portal-pair={portalId}
                      data-portal-end="out"
                      data-portal-occupancy={portalBeforeRule ? 'free' : 'piece'}
                    />
                    <circle
                      cx={portalExitX}
                      cy={portalExitY}
                      r={portalBeforeRule ? 6 : 27}
                      className={portalBeforeRule ? 'movement-trail__portal-core' : 'movement-trail__portal-exit-inner'}
                      data-portal-pair={portalId}
                    />
                    <text
                      x={portalEntryLabelX}
                      y={portalEntryLabelY}
                      className="movement-trail__label movement-trail__label--portal-point movement-trail__detail"
                      data-portal-pitch={pitchedMidi(portalNote, portal.entry.midi)}
                    >
                      {portalId} · IN · {pitchedMidi(portalNote, portal.entry.midi)}
                    </text>
                    <text
                      x={portalExitLabelX}
                      y={portalExitLabelY}
                      className="movement-trail__label movement-trail__label--portal-point movement-trail__detail"
                      data-portal-pitch={pitchedMidi(portalNote, portal.exit.midi)}
                    >
                      {portalId} · OUT · {pitchedMidi(portalNote, portal.exit.midi)}
                    </text>
                    <text
                      x={portalStatusX}
                      y={portalStatusY}
                      textAnchor={portalBeforeRule ? 'middle' : 'start'}
                      className="movement-trail__label movement-trail__label--portal movement-trail__detail"
                    >
                      {portalId} · {octaveLabel(portal.octaveDelta)} · {portalOrder}
                    </text>
                  </>
                )}
              </g>
            );
          })}

          {voicing?.frets.map((fret, stringIndex) => {
            if (fret !== null) return null;
            return <text key={stringIndex} x={LEFT - 30} y={yForString(stringIndex) + 5} textAnchor="middle" className="fretboard-board__muted">×</text>;
          })}
        </svg>

        {roles.map((role, index) => {
          const finger = voicing?.fingers[role.stringIdx];
          const active = activeIndex === index;
          return (
            <button
              key={`${role.stringIdx}-${role.fret}-${role.interval}`}
              type="button"
              className={`fret-piece ${degreeToneClass(role.interval, 'piece')} ${active ? 'is-active' : ''}`}
              data-piece-tone={degreeTone(role.interval)}
              style={{ left: `${xForFret(role.fret) / BOARD_WIDTH * 100}%`, top: `${yForString(role.stringIdx) / BOARD_HEIGHT * 100}%` }}
              aria-label={`${role.note}, ${role.role}, string ${role.stringIdx + 1}, fret ${role.fret}`}
              aria-pressed={active}
              onMouseEnter={() => onPieceHover?.(index)}
              onMouseLeave={() => onPieceHover?.(null)}
              onFocus={() => onPieceHover?.(index)}
              onBlur={() => onPieceHover?.(null)}
              onClick={() => onPiecePin?.(active ? null : index)}
            >
              <PieceGlyph interval={role.interval} size={24} />
              <span>{intervalRoman(role.interval)}</span>
              {finger !== null && finger !== undefined && <small>{finger}</small>}
            </button>
          );
        })}
      </div>
      <p className="fretboard-shell__hint">
        {allFourths
          ? 'Root = anchor only · Gold before solid by default · Gold after solid = boundary fallback · Equal axes = diagonal'
          : 'Chess movement rules pause outside all-fourths tuning.'}
      </p>
    </div>
  );
}
