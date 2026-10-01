export interface PointerSample { pointerId: number; clientX: number; clientY: number; button?: number }
/** Tracks the complete path, not only the start/end distance. */
export class TapTracker {
  private pointers = new Set<number>();
  private origin: PointerSample | null = null;
  private moved = false;
  down(e: PointerSample): void {
    this.pointers.add(e.pointerId);
    if (this.pointers.size === 1) { this.origin = (e.button ?? 0) === 0 ? { pointerId: e.pointerId, clientX: e.clientX, clientY: e.clientY } : null; this.moved = false; }
    else this.moved = true;
  }
  move(e: PointerSample): void {
    if (this.origin && e.pointerId === this.origin.pointerId && Math.hypot(e.clientX - this.origin.clientX, e.clientY - this.origin.clientY) > 6) this.moved = true;
  }
  up(e: PointerSample): boolean {
    this.move(e);
    const tap = this.pointers.size === 1 && this.origin?.pointerId === e.pointerId && !this.moved;
    this.pointers.delete(e.pointerId);
    if (this.pointers.size === 0) this.origin = null;
    return tap;
  }
  cancel(): void { this.pointers.clear(); this.origin = null; this.moved = true; }
}
