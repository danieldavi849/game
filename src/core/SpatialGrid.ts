/** Grid-based spatial partitioning for collision broadphase */
export class SpatialGrid {
  private cellSize: number;
  private cells: Map<string, number[]> = new Map();

  constructor(cellSize: number) {
    this.cellSize = cellSize;
  }

  /** Clear all cells */
  clear(): void {
    this.cells.clear();
  }

  /** Insert an entity at a position with radius */
  insert(entityId: number, x: number, y: number, radius: number): void {
    const minCX = Math.floor((x - radius) / this.cellSize);
    const maxCX = Math.floor((x + radius) / this.cellSize);
    const minCY = Math.floor((y - radius) / this.cellSize);
    const maxCY = Math.floor((y + radius) / this.cellSize);

    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        const key = `${cx},${cy}`;
        let cell = this.cells.get(key);
        if (!cell) {
          cell = [];
          this.cells.set(key, cell);
        }
        cell.push(entityId);
      }
    }
  }

  /** Query all potential collision partners near a position */
  query(x: number, y: number, radius: number): number[] {
    const result: number[] = [];
    const seen = new Set<number>();

    const minCX = Math.floor((x - radius) / this.cellSize);
    const maxCX = Math.floor((x + radius) / this.cellSize);
    const minCY = Math.floor((y - radius) / this.cellSize);
    const maxCY = Math.floor((y + radius) / this.cellSize);

    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        const key = `${cx},${cy}`;
        const cell = this.cells.get(key);
        if (!cell) continue;
        for (let i = 0; i < cell.length; i++) {
          const id = cell[i];
          if (!seen.has(id)) {
            seen.add(id);
            result.push(id);
          }
        }
      }
    }

    return result;
  }
}
