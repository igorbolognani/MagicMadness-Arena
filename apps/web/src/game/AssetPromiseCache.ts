export class AssetPromiseCache<T> {
  private readonly values = new Map<string, Promise<T>>();

  get(key: string, factory: () => Promise<T>): Promise<T> {
    const cached = this.values.get(key);
    if (cached) return cached;
    const pending = factory().catch((error) => {
      if (this.values.get(key) === pending) this.values.delete(key);
      throw error;
    });
    this.values.set(key, pending);
    return pending;
  }

  size(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
}
