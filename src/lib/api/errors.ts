export type ApiErrorCode =
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "VALIDATION_ERROR"
  | "INVALID_RESPONSE"
  | "OUT_OF_STOCK"
  | "SERVICE_UNAVAILABLE"
  | "UNKNOWN";

/** Error normalizado de la capa de API. Los componentes solo conocen este tipo. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;

  constructor(code: ApiErrorCode, message: string, status = 0) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** Mensaje apto para mostrar al usuario. */
export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) return error.message;
  return "No pudimos completar la solicitud. Revisa tu conexión e inténtalo de nuevo.";
}
