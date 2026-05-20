import type { Cell } from './types';

interface CellBlockProps {
  cell: Cell;
  isCurrent: boolean;
}

function padCellText(name: string): string {
  const target = 4;
  if (name.length >= target) return name.slice(0, target);
  const left = Math.floor((target - name.length) / 2);
  const right = target - name.length - left;
  return ' '.repeat(left) + name + ' '.repeat(right);
}

export function CellBlock({ cell, isCurrent }: CellBlockProps) {
  const displayName = (() => {
    if (!cell.explored) return '[  ??  ]';
    const inner = padCellText(cell.name);
    return `[${inner}]`;
  })();

  const classes = [
    'cell',
    !cell.explored && 'cell--unexplored',
    isCurrent && 'cell--current',
    cell.explored && `cell--${cell.type}`,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} title={cell.explored ? `${cell.name} (${cell.type})` : '未探索'}>
      <span className="cell__text">{displayName}</span>
      {isCurrent && <span className="cell__indicator">◆ 当前</span>}
    </div>
  );
}
