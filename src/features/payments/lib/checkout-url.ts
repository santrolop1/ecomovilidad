/**
 * Adónde se puede llevar al cliente para pagar. Aunque la URL la arma el
 * backend, el navegador nunca debe saltar a un destino inesperado:
 * - el Web Checkout oficial de Wompi (https://checkout.wompi.co/p/…), o
 * - la pasarela simulada de EcoMovilidad (/pagos/simulador), siempre en el
 *   dominio actual (se ignora el dominio que venga en la URL).
 */
export function isWompiCheckoutUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "checkout.wompi.co" && url.pathname.startsWith("/p/");
  } catch {
    return false;
  }
}

const SIMULATOR_PATH = "/pagos/simulador";
const REFERENCE = /^[A-Za-z0-9-]{3,64}$/;

/** URL a la que navegar, o null si el destino no es válido. */
export function resolveCheckoutTarget(value: string): string | null {
  if (isWompiCheckoutUrl(value)) return value;
  try {
    const url = new URL(value, "http://ecomovilidad.invalid");
    const reference = url.searchParams.get("referencia");
    if (url.pathname === SIMULATOR_PATH && reference && REFERENCE.test(reference)) {
      return `${SIMULATOR_PATH}?referencia=${encodeURIComponent(reference)}`;
    }
  } catch {
    // URL inválida
  }
  return null;
}
