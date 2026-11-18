import { NextResponse } from "next/server";
import { FOODREPO_API_BASE } from "./api-config";

export interface BackendFetchOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
}

export interface BackendResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
  isWakingUp?: boolean;
}

export function isConnectionOrTimeoutError(err: unknown): boolean {
  const errorObj = err as Record<string, any> | undefined;
  const code = errorObj?.cause?.code || errorObj?.code;
  const message = String(errorObj?.message || "").toLowerCase();
  return (
    code === "ETIMEDOUT" ||
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND" ||
    code === "UND_ERR_CONNECT_TIMEOUT" ||
    errorObj?.name === "TimeoutError" ||
    message.includes("fetch failed") ||
    message.includes("timed out") ||
    message.includes("timeout") ||
    message.includes("network error")
  );
}

export async function fetchFromBackendApi<T = unknown>(
  pathOrUrl: string,
  options: BackendFetchOptions = {},
): Promise<BackendResponse<T>> {
  const {
    timeoutMs = 15000,
    retries = 1,
    retryDelayMs = 1200,
    ...fetchInit
  } = options;

  const url =
    pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")
      ? pathOrUrl
      : `${FOODREPO_API_BASE}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;

  let attempt = 0;
  const maxAttempts = 1 + Math.max(0, retries);

  while (attempt < maxAttempts) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort("Timeout"), timeoutMs);

    if (fetchInit.signal) {
      fetchInit.signal.addEventListener("abort", () => {
        controller.abort(fetchInit.signal?.reason);
      });
    }

    try {
      const response = await fetch(url, {
        ...fetchInit,
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          ...(fetchInit.headers || {}),
        },
      });

      clearTimeout(timeoutId);

      const contentType = response.headers.get("content-type") || "";
      let data: Record<string, unknown>;

      if (contentType.includes("application/json")) {
        try {
          data = (await response.json()) as Record<string, unknown>;
        } catch {
          data = { error: "Failed to parse JSON response" };
        }
      } else {
        const text = await response.text();
        data = {
          error: response.statusText || "Non-JSON response from backend",
          message: text.slice(0, 300),
        };
      }

      // If backend returns a transient gateway error (502/503/504) and we have retries left, retry
      if (
        (response.status === 502 ||
          response.status === 503 ||
          response.status === 504) &&
        attempt < maxAttempts
      ) {
        console.warn(
          `[BackendClient] Backend returned ${response.status} on attempt ${attempt}. Retrying in ${retryDelayMs}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        continue;
      }

      const isWakingUp =
        response.status === 502 ||
        response.status === 503 ||
        response.status === 504;

      if (!response.ok && isWakingUp) {
        if (typeof data === "object" && data !== null) {
          data.isWakingUp = true;
          data.error =
            data.error ||
            "The FoodRepo database service is currently starting up. Please try again in a few moments.";
        }
      }

      return {
        ok: response.ok,
        status: response.status,
        data: data as unknown as T,
        isWakingUp,
      };
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const isTransient = isConnectionOrTimeoutError(err);
      const errMessage = (err as Error)?.message || String(err);

      if (isTransient && attempt < maxAttempts) {
        console.warn(
          `[BackendClient] Transient network error on attempt ${attempt} (${errMessage}). Retrying in ${retryDelayMs}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        continue;
      }

      console.error(
        `[BackendClient] Fetch failed for ${url} (attempt ${attempt}/${maxAttempts}):`,
        err,
      );

      return {
        ok: false,
        status: 503,
        data: {
          error:
            "The FoodRepo database service is currently starting up or temporarily unavailable. Please retry in a few moments.",
          code: isTransient ? "BACKEND_UNAVAILABLE" : "SERVER_ERROR",
          details: errMessage,
          isWakingUp: isTransient,
        } as unknown as T,
        isWakingUp: isTransient,
      };
    }
  }

  return {
    ok: false,
    status: 503,
    data: {
      error:
        "The FoodRepo database service did not respond in time. It may still be starting up.",
      code: "BACKEND_TIMEOUT",
      isWakingUp: true,
    } as unknown as T,
    isWakingUp: true,
  };
}

export function jsonResponse(
  backendResult: BackendResponse,
  headers: Record<string, string> = {},
): NextResponse {
  return NextResponse.json(backendResult.data, {
    status: backendResult.status,
    headers: {
      "X-Powered-By": "foodrepo-api (NestJS)",
      ...headers,
    },
  });
}
