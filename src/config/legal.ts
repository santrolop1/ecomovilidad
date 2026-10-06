/**
 * Versión vigente de la política de tratamiento de datos (Ley 1581). Debe
 * coincidir con PRIVACY_POLICY_VERSION del backend: si difiere, FastAPI
 * rechaza el registro o el pedido (409) en lugar de guardar evidencia falsa.
 */
export const PRIVACY_POLICY_VERSION = "2026-10-06";
