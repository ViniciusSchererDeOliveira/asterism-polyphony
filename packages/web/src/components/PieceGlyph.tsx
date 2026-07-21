import React from 'react';
import type { IconType } from 'react-icons';
import { degreePieceForInterval, type DegreePiece } from '@guitar-paradigm/core';
import {
  FaChessBishop,
  FaChessKing,
  FaChessKnight,
  FaChessPawn,
  FaChessQueen,
  FaChessRook
} from 'react-icons/fa6';

interface PieceGlyphProps {
  interval: number;
  label?: string;
  piece?: DegreePiece;
  size?: number;
}

export type DegreeTone = 'root' | 'third' | 'fifth' | 'extension';
export type DegreeToneSurface = 'piece' | 'route' | 'selector';

const GLYPHS: Record<DegreePiece, IconType> = {
  king: FaChessKing,
  queen: FaChessQueen,
  knight: FaChessKnight,
  rook: FaChessRook,
  bishop: FaChessBishop
};

export function PieceGlyph({ interval, label, piece, size = 22 }: PieceGlyphProps) {
  const resolvedPiece = piece ?? degreePieceForInterval(interval);
  const Icon = GLYPHS[resolvedPiece] ?? FaChessPawn;
  return <Icon aria-label={label} data-chess-piece={resolvedPiece} role={label ? 'img' : undefined} size={size} />;
}

export function pieceName(interval: number) {
  return degreePieceForInterval(interval);
}

export function degreeTone(interval: number): DegreeTone {
  const normalized = ((interval % 12) + 12) % 12;
  if (normalized === 0) return 'root';
  if (normalized === 3 || normalized === 4) return 'third';
  if (normalized === 7) return 'fifth';
  return 'extension';
}

export function degreeToneClass(interval: number, surface: DegreeToneSurface) {
  return `${surface}--${degreeTone(interval)}`;
}

export function intervalRoman(interval: number) {
  const romans: Record<number, string> = {
    0: 'I',
    1: '♭II',
    2: 'II',
    3: '♭III',
    4: 'III',
    5: 'IV',
    6: '♭V',
    7: 'V',
    8: '♭VI',
    9: 'VI',
    10: '♭VII',
    11: 'VII'
  };
  return romans[interval] ?? '?';
}
