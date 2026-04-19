/**
 * Deterministic 5x5 symmetric identicon for an agent_id.
 * Cells are filled based on bits of an FNV-1a hash of the id.
 * Black-on-white only (matches site aesthetic).
 */

const GRID = 5;

function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

export function agentIconCells(agentId: string): boolean[][] {
  const h = fnv1a(agentId);
  const half = Math.ceil(GRID / 2);
  const rows: boolean[][] = [];
  for (let y = 0; y < GRID; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < half; x++) {
      const bit = (h >>> ((y * half + x) % 30)) & 1;
      row.push(bit === 1);
    }
    for (let x = half; x < GRID; x++) {
      row.push(row[GRID - 1 - x]);
    }
    rows.push(row);
  }
  return rows;
}
