import { toast } from "@/hooks/use-toast";
import { clearSession, getAccessToken, getRefreshToken, setTokenPair } from "@/lib/api/token-store";
import type { ApiErrorPayload, CloudreveResponse, TokenPair } from "@/lib/api/types";

const API_BASE = (process.env.NEXT_PUBLIC_CLOUDREVE_API_BASE || "/api/cloudreve").replace(/\/$/, "");
const UNAUTHORIZED_CODES = new Set([401, 403]);

export class ApiError extends Error {
  code?: number;
  status?: number;
  correlationId?: string | null;
  response?: CloudreveResponse;

  constructor(payload: ApiErrorPayload) {
    super(payload.message);
    this.name = "ApiError";
    this.code = payload.code;
    this.status = payload.status;
    this.correlationId = payload.correlationId;
    this.response = payload.response;
  }
}

function localizeApiMessage(message?: string | null) {
  const text = message || "";
  const normalized = text.toLowerCase();

  if (
    normalized.includes("captcha validation failed") ||
    normalized.includes("invalid captcha") ||
    normalized.includes("captcha failed")
  ) {
    return "验证码错误或已失效。";
  }

  if (normalized.includes("object existed") || normalized.includes("already exists")) {
    return "同名文件已存在。";
  }

  if (normalized.includes("lock conflict")) {
    return "文件正在上传或处理中，请稍后重试。";
  }

  if (normalized.includes("page size too short")) {
    return "分页参数无效，请刷新后重试。";
  }

  if (normalized.includes("category cannot be empty")) {
    return "任务分类参数缺失，请刷新后重试。";
  }

  if (normalized.includes("invalid parameters") || normalized.includes("parameter error")) {
    return "参数无效，请检查后重试。";
  }

  if (normalized.includes("share not found") || normalized.includes("share does not exist")) {
    return "分享链接不存在或已失效。";
  }

  if (normalized.includes("entity not exist") || normalized.includes("entity does not exist")) {
    return "文件不存在或已被删除。";
  }

  if (normalized.includes("permission denied") || normalized.includes("access denied") || normalized.includes("forbidden")) {
    return "没有权限执行此操作。";
  }

  if (normalized.includes("invalid password") || normalized.includes("password incorrect") || normalized.includes("wrong password")) {
    return "密码或提取码不正确。";
  }

  if (normalized.includes("internal server error")) {
    return "服务器内部错误，请稍后重试。";
  }

  return text;
}

function localizeApiCode(code?: number) {
  switch (code) {
    case 401:
      return "登录已过期，请重新登录。";
    case 403:
      return "没有权限执行此操作。";
    case 404:
      return "请求的内容不存在。";
    case 409:
      return "资源发生冲突，请刷新后重试。";
    case 40058:
      return "分享链接不存在或已失效。";
    case 40077:
      return "文件不存在或已被删除。";
    default:
      return "";
  }
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: BodyInit | Record<string, unknown> | unknown[] | null;
  query?: Record<string, string | number | boolean | null | undefined>;
  auth?: boolean;
  raw?: boolean;
  okCodes?: number[];
  toastError?: boolean;
  skipRefresh?: boolean;
  timeoutMs?: number;
}

function buildUrl(path: string, query?: RequestOptions["query"]) {
  const isAbsolute = /^https?:\/\//i.test(path);
  const url = new URL(isAbsolute ? path : `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`, window.location.origin);

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  if (isAbsolute) {
    return url.toString();
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

function isJsonBody(body: RequestOptions["body"]) {
  return body !== null && body !== undefined && !(body instanceof FormData) && !(body instanceof Blob) && !(body instanceof ArrayBuffer);
}

function shouldRefresh(error: ApiError) {
  return Boolean(error.status === 401 || error.status === 403 || (error.code && UNAUTHORIZED_CODES.has(error.code)));
}

let refreshPromise: Promise<TokenPair> | null = null;

async function refreshAccessToken() {
  if (!refreshPromise) {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      throw new ApiError({ message: "登录已过期，请重新登录。" });
    }

    refreshPromise = (async () => {
      const response = await fetch(buildUrl("/session/token/refresh"), {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ refresh_token: refreshToken })
      });

      const payload = (await response.json().catch(() => null)) as CloudreveResponse<TokenPair> | null;
      if (!response.ok || !payload || payload.code !== 0 || !payload.data) {
        throw new ApiError({
          status: response.status,
          code: payload?.code,
          message: localizeApiMessage(payload?.msg || payload?.message || payload?.error) || localizeApiCode(payload?.code) || "刷新登录状态失败，请重新登录。",
          correlationId: payload?.correlation_id,
          response: payload ?? undefined
        });
      }

      setTokenPair(payload.data);
      return payload.data;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

async function performRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const auth = options.auth !== false;
  const body = options.body;

  if (auth) {
    const token = getAccessToken();
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
  }

  let requestBody: BodyInit | undefined;
  if (isJsonBody(body)) {
    headers.set("content-type", headers.get("content-type") ?? "application/json");
    requestBody = JSON.stringify(body);
  } else if (body) {
    requestBody = body as BodyInit;
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), options.timeoutMs ?? 30000);

  const response = await fetch(buildUrl(path, options.query), {
    ...options,
    headers,
    body: requestBody,
    signal: options.signal ?? controller.signal
  }).finally(() => {
    window.clearTimeout(timeout);
  });

  if (options.raw) {
    if (!response.ok) {
      throw new ApiError({ status: response.status, message: localizeApiMessage(response.statusText) || "请求失败。" });
    }
    return response as T;
  }

  const payload = (await response.json().catch(() => null)) as CloudreveResponse<T> | null;
  if (!response.ok || !payload) {
    throw new ApiError({
      status: response.status,
      code: payload?.code,
      message: localizeApiMessage(payload?.msg || payload?.message || payload?.error || response.statusText) || localizeApiCode(payload?.code) || "请求失败。",
      response: payload ?? undefined
    });
  }

  const okCodes = new Set([0, ...(options.okCodes ?? [])]);
  if (!okCodes.has(payload.code)) {
    throw new ApiError({
      status: response.status,
      code: payload.code,
      message: localizeApiMessage(payload.msg || payload.message || payload.error) || localizeApiCode(payload.code) || `接口返回错误码 ${payload.code}`,
      correlationId: payload.correlation_id,
      response: payload
    });
  }

  return payload.data as T;
}

export async function request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  try {
    return await performRequest<T>(path, options);
  } catch (error) {
    if (error instanceof ApiError && options.auth !== false && !options.skipRefresh && shouldRefresh(error)) {
      try {
        await refreshAccessToken();
      } catch (refreshError) {
        clearSession();
        if (options.toastError !== false) {
          toast({
            variant: "destructive",
            title: "登录状态失效",
            description: refreshError instanceof Error ? refreshError.message : "请重新登录。"
          });
        }
        throw refreshError;
      }

      try {
        return await performRequest<T>(path, { ...options, skipRefresh: true });
      } catch (retryError) {
        if (retryError instanceof ApiError && shouldRefresh(retryError)) {
          clearSession();
          if (options.toastError !== false) {
            toast({
              variant: "destructive",
              title: "登录状态失效",
              description: retryError.message || "请重新登录。"
            });
          }
        }
        throw retryError;
      }
    }

    if (options.toastError !== false) {
      toast({
        variant: "destructive",
        title: "请求失败",
        description: error instanceof Error ? error.message : "请稍后重试。"
      });
    }
    throw error;
  }
}

export function resolveApiAssetUrl(url?: string | null) {
  if (!url) {
    return "";
  }

  if (url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }

  if (/^https?:\/\//i.test(url)) {
    try {
      const parsed = new URL(url);
      if (parsed.pathname.startsWith("/api/v4/")) {
        return `${API_BASE}${parsed.pathname.slice("/api/v4".length)}${parsed.search}${parsed.hash}`;
      }
    } catch {
      return url;
    }

    return url;
  }

  if (url.startsWith("/api/cloudreve") || url.startsWith(API_BASE)) {
    return url;
  }

  if (url.startsWith("/api/v4/")) {
    return `${API_BASE}${url.slice("/api/v4".length)}`;
  }

  return `${API_BASE}${url.startsWith("/") ? url : `/${url}`}`;
}
