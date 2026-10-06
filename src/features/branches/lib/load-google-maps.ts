const SCRIPT_ID = "google-maps-js";
const CALLBACK = "__ecomovilidadMapsReady";

let loader: Promise<void> | null = null;

/**
 * Carga Google Maps JavaScript API una sola vez. Se rechaza si la red o la
 * API key fallan; quien la invoque debe volver al mapa de referencia.
 */
export function loadGoogleMaps(apiKey: string, timeoutMs = 8000): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("Solo disponible en el navegador"));
  if (typeof window.google?.maps?.importLibrary === "function") return Promise.resolve();
  if (loader) return loader;

  loader = new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("Tiempo de carga de Google Maps agotado")), timeoutMs);
    const callbacks = window as unknown as Record<string, (() => void) | undefined>;
    callbacks[CALLBACK] = () => {
      window.clearTimeout(timer);
      resolve();
    };

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&loading=async&language=es&region=CO&callback=${CALLBACK}`;
    script.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error("No se pudo cargar Google Maps"));
    };
    document.head.append(script);
  }).catch((error: unknown) => {
    loader = null;
    throw error;
  });

  return loader;
}
