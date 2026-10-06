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
