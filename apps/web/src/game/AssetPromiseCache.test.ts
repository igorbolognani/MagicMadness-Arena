import { describe, expect, it, vi } from "vitest";
import { AssetPromiseCache } from "./AssetPromiseCache";

describe("AssetPromiseCache", () => {
  it("deduplicates concurrent preload and instantiate requests", async () => {
    const factory = vi.fn(async () => ({ id: "asset" }));
    const cache = new AssetPromiseCache<{ id: string }>();
    const [first, second] = await Promise.all([cache.get("hero", factory), cache.get("hero", factory)]);
    expect(first).toBe(second);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(cache.size()).toBe(1);
  });

  it("evicts a failed request so an explicit retry can recover", async () => {
    const cache = new AssetPromiseCache<string>();
    await expect(cache.get("hero", async () => { throw new Error("missing"); })).rejects.toThrow("missing");
    await expect(cache.get("hero", async () => "loaded")).resolves.toBe("loaded");
  });
});
