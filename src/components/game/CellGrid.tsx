import { memo } from 'react';
import {
  BOARD_CELL_COUNT,
  BOARD_COLS,
  BOARD_ROWS,
  PLAYER_ROW_START,
} from '../../data/constants';

interface CellGridProps {
  /** Identity of the current selection; '' when nothing is selected. */
  selKey: string;
  /** Sorted list of occupied cell indices, joined — the memo key for the layer. */
  occupiedKey: string;
  plan: boolean;
  onTapCell: (r: number, c: number) => void;
}

function cellClass(mine: boolean, dropTarget: boolean): string {
  if (!mine) return 'om-cell';
  return dropTarget ? 'om-cell om-cell--mine om-cell--drop' : 'om-cell om-cell--mine';
}

function CellGridImpl({ selKey, occupiedKey, onTapCell }: CellGridProps) {
  const occupied = new Set(occupiedKey ? occupiedKey.split(',') : []);
  return (
    <div
      className="om-board__grid"
      style={{
        gridTemplateColumns: `repeat(${BOARD_COLS},1fr)`,
        gridTemplateRows: `repeat(${BOARD_ROWS},1fr)`,
      }}
    >
      {Array.from({ length: BOARD_CELL_COUNT }, (_, i) => {
        const r = Math.floor(i / BOARD_COLS);
        const c = i % BOARD_COLS;
        const mine = r >= PLAYER_ROW_START;
        const dropTarget = mine && !!selKey && !occupied.has(String(i));
        return (
          <button
            key={i}
            type="button"
            className={cellClass(mine, dropTarget)}
            onClick={() => onTapCell(r, c)}
          />
        );
      })}
    </div>
  );
}

export const CellGrid = memo(CellGridImpl);
