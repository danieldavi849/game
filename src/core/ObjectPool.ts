/** Generic object pool to avoid GC spikes from frequent allocation */
export class ObjectPool<T> {
  private pool: T[] = [];
  private factory: () => T;
  private reset: (obj: T) => void;

  constructor(factory: () => T, reset: (obj: T) => void, initialSize: number = 0) {
    this.factory = factory;
    this.reset = reset;
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(factory());
    }
  }

  /** Get an object from the pool or create a new one */
  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.factory();
  }

  /** Return an object to the pool */
  release(obj: T): void {
    this.reset(obj);
    this.pool.push(obj);
  }

  /** Current number of available pooled objects */
  get available(): number {
    return this.pool.length;
  }
}
