/** Latencia artificial opcional para probar estados de carga (MOCK_LATENCY_MS). */
export function simulateLatency(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Copia profunda para que los consumidores no muten los mocks compartidos. */
export function clone<T>(value: T): T {
  return structuredClone(value);
}
