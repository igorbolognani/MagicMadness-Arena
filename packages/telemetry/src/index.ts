export type PerformanceSample = {
  frameMs: number;
  physicsMs: number;
  activeBodies: number;
  projectileCount: number;
  reconciliationDistance?: number;
};

export type TelemetryEvent = {
  name: string;
  at: number;
  attributes: Record<string, string | number | boolean>;
};

export interface TelemetrySink {
  event(event: TelemetryEvent): void;
  performance(sample: PerformanceSample): void;
}

export class MemoryTelemetry implements TelemetrySink {
  readonly events: TelemetryEvent[] = [];
  readonly performanceSamples: PerformanceSample[] = [];

  event(event: TelemetryEvent): void {
    this.events.push(event);
  }

  performance(sample: PerformanceSample): void {
    this.performanceSamples.push(sample);
    if (this.performanceSamples.length > 120) this.performanceSamples.shift();
  }
}
