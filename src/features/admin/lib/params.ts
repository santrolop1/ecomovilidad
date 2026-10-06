/** Lectura segura de parámetros de búsqueda del panel. */
export type RawParams = Record<string, string | string[] | undefined>;

export function param(params: RawParams, key: string): string | undefined {
  const value = params[key];
  const first = Array.isArray(value) ? value[0] : value;
  return first?.trim() ? first.trim().slice(0, 80) : undefined;
}

export function pageParam(params: RawParams): number {
  const page = Number(param(params, "page"));
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function oneOf<T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined {
  return allowed.find((item) => item === value);
}
