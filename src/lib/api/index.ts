import "server-only";
import { serverEnv } from "@/config/server-env";
import type { ApiClient } from "./contracts";
import { createHttpClient } from "./http-client";
import { createMockApi } from "./mock";
import { createRealApi } from "./real";

function createApiClient(): ApiClient {
  if (serverEnv.apiMode === "real" && serverEnv.apiBaseUrl) {
    return createRealApi(createHttpClient(serverEnv.apiBaseUrl));
  }
  return createMockApi({ latencyMs: serverEnv.mockLatencyMs });
}

/**
 * Punto de entrada único a los datos. API_MODE=mock usa datos de
 * demostración en memoria; API_MODE=real usa FastAPI + PostgreSQL.
 */
export const api: ApiClient = createApiClient();

export const isRealApi = serverEnv.apiMode === "real";

export type * from "./contracts";
export { ApiError, getErrorMessage, isApiError } from "./errors";
