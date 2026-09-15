export type VfxQuality = "high" | "medium" | "low";

export const VFX_QUALITY_BUDGETS = {
  high: { particles: 720, projectiles: 64, impacts: 48, rings: 96, trails: 48, fields: 18, previews: 8 },
  medium: { particles: 420, projectiles: 48, impacts: 32, rings: 64, trails: 32, fields: 14, previews: 8 },
  low: { particles: 220, projectiles: 32, impacts: 20, rings: 40, trails: 18, fields: 10, previews: 8 },
} as const;

export class KeyedObjectPool<T> {
  private readonly idle = new Map<string, T[]>();
  private readonly active = new Map<string, number>();
  private totalActive = 0;
  private created = 0;
  private rejected = 0;

  constructor(private readonly limits: { maxActive: number; maxActivePerKey: number; maxIdlePerKey: number }) {}

  acquire(key: string, factory: () => T): T | null {
    const keyActive = this.active.get(key) ?? 0;
    if (this.totalActive >= this.limits.maxActive || keyActive >= this.limits.maxActivePerKey) { this.rejected += 1; return null; }
    const bucket = this.idle.get(key);
    let value = bucket?.pop();
    if (!value) { value = factory(); this.created += 1; }
    this.totalActive += 1;
    this.active.set(key, keyActive + 1);
    return value;
  }

  release(key: string, value: T): boolean {
    const keyActive = this.active.get(key) ?? 0;
    if (keyActive <= 0) return false;
    this.totalActive -= 1;
    this.active.set(key, keyActive - 1);
    const bucket = this.idle.get(key) ?? [];
    if (bucket.length >= this.limits.maxIdlePerKey) return false;
    bucket.push(value);
    this.idle.set(key, bucket);
    return true;
  }

  stats(): { active: number; idle: number; created: number; rejected: number; capacity: number; byKey: Record<string, { active: number; idle: number }> } {
    let idle = 0;
    this.idle.forEach((bucket) => { idle += bucket.length; });
    const keys = new Set([...this.idle.keys(), ...this.active.keys()]);
    const byKey = Object.fromEntries([...keys].map((key) => [key, { active: this.active.get(key) ?? 0, idle: this.idle.get(key)?.length ?? 0 }]));
    return { active: this.totalActive, idle, created: this.created, rejected: this.rejected, capacity: this.limits.maxActive, byKey };
  }

  dispose(disposeValue: (value: T) => void): void {
    this.idle.forEach((bucket) => bucket.forEach(disposeValue));
    this.idle.clear();
    this.active.clear();
    this.totalActive = 0;
    this.created = 0;
    this.rejected = 0;
  }
}

/** Cosmetic capacity may degrade detail, but must never hide a live game object. */
export class GameplayObjectPool<T> {
  private readonly detailed: KeyedObjectPool<T>;
  private readonly fallbacks = new Set<T>();

  constructor(limits: { maxActive: number; maxActivePerKey: number; maxIdlePerKey: number }) {
    this.detailed = new KeyedObjectPool<T>(limits);
  }

  acquire(key: string, factory: () => T, minimalFactory: () => T): T {
    const detailed = this.detailed.acquire(key, factory);
    if (detailed !== null) return detailed;
    const minimal = minimalFactory();
    this.fallbacks.add(minimal);
    return minimal;
  }

  release(key: string, value: T): boolean {
    // Minimal objects are disposed by the caller and never enter cosmetic buckets.
    if (this.fallbacks.delete(value)) return false;
    return this.detailed.release(key, value);
  }

  stats() { return { ...this.detailed.stats(), fallbackActive: this.fallbacks.size }; }

  dispose(disposeValue: (value: T) => void): void {
    this.detailed.dispose(disposeValue);
    // Active objects belong to the scene, which disposes them before the pools.
    this.fallbacks.clear();
  }
}

export function qualityForDevice(): VfxQuality {
  if (typeof navigator === "undefined") return "medium";
  const memory = Number((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4);
  const cores = navigator.hardwareConcurrency || 4;
  if (memory <= 3 || cores <= 4) return "low";
  if (memory >= 8 && cores >= 8) return "high";
  return "medium";
}
