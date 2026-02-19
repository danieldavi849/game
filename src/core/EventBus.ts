type EventCallback = (...args: unknown[]) => void;

/** Pub/sub event system for decoupled communication between systems */
export class EventBus {
  private listeners: Map<string, EventCallback[]> = new Map();

  /** Subscribe to an event */
  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  /** Unsubscribe from an event */
  off(event: string, callback: EventCallback): void {
    const cbs = this.listeners.get(event);
    if (!cbs) return;
    const idx = cbs.indexOf(callback);
    if (idx >= 0) cbs.splice(idx, 1);
  }

  /** Emit an event to all listeners */
  emit(event: string, ...args: unknown[]): void {
    const cbs = this.listeners.get(event);
    if (!cbs) return;
    for (let i = 0; i < cbs.length; i++) {
      cbs[i](...args);
    }
  }

  /** Remove all listeners */
  clear(): void {
    this.listeners.clear();
  }
}
