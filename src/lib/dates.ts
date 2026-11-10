const bogotaDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Bogota",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Fecha actual en Colombia con formato AAAA-MM-DD. */
export function todayInBogota(now: Date = new Date()): string {
  return bogotaDate.format(now);
}

/** Suma días a una fecha AAAA-MM-DD, sin depender de la zona horaria. */
export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}
