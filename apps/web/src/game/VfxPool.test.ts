import { describe, expect, it, vi } from "vitest";
import { KeyedObjectPool, VFX_QUALITY_BUDGETS } from "./VfxPool";

describe("VFX object pooling", () => {
  it("reuses released objects and enforces active limits", () => {
    const pool = new KeyedObjectPool<{ id: number }>({ maxActive: 2, maxActivePerKey: 2, maxIdlePerKey: 2 });
    const factory = vi.fn(() => ({ id: 1 }));
    const first = pool.acquire("impact", factory);
    const second = pool.acquire("impact", factory);
    expect(pool.acquire("impact", () => ({ id: 3 }))).toBeNull();
    expect(first && pool.release("impact", first)).toBe(true);
    expect(pool.acquire("impact", () => ({ id: 3 }))).toBe(first);
    expect(second).not.toBeNull();
    expect(factory).toHaveBeenCalledTimes(2);
    expect(pool.stats()).toMatchObject({ active: 2, idle: 0, created: 2, rejected: 1, capacity: 2 });
  });

  it("preserves preview capacity while mobile budgets degrade cosmetic particles", () => {
    expect(VFX_QUALITY_BUDGETS.low.previews).toBe(VFX_QUALITY_BUDGETS.high.previews);
    expect(VFX_QUALITY_BUDGETS.low.particles).toBeLessThan(VFX_QUALITY_BUDGETS.high.particles);
  });
});
