import { apiFetch } from "@/lib/api-client";

type JsonValue = Record<string, unknown> | unknown[] | string | number | boolean | null;

type RequestConfig = {
  params?: Record<string, string | number | boolean | null | undefined>;
  data?: JsonValue;
  body?: JsonValue;
  headers?: Record<string, string>;
};

function buildUrl(path: string, params?: RequestConfig["params"]) {
  const qs = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null) qs.set(k, String(v));
  });
  const q = qs.toString();
  return q ? `${path}${path.includes("?") ? "&" : "?"}${q}` : path;
}

async function request(method: string, path: string, config: RequestConfig = {}) {
  const url = buildUrl(path, config.params);
  const payload = config.body ?? config.data;

  const res = await apiFetch(url, {
    method,
    headers: config.headers,
    body: payload !== undefined ? JSON.stringify(payload) : undefined,
  });

  const text = await res.text();
  let data: unknown = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const body = data as Record<string, unknown> | null;
    const msgFromBody =
      typeof body === "object" && body !== null && "message" in body && typeof body.message === "string"
        ? body.message
        : null;
    const message = msgFromBody || `Request failed: ${res.status}`;
    const err = new Error(message) as Error & { response?: { status: number; data: unknown } };
    err.response = { status: res.status, data };
    throw err;
  }

  return { data, status: res.status };
}

export const api = {
  defaults: {
    headers: {
      common: {} as Record<string, string>,
    },
  },
  get: (path: string, config?: RequestConfig) => request("GET", path, config),
  post: (path: string, data?: JsonValue, config?: RequestConfig) =>
    request("POST", path, { ...(config || {}), data }),
  patch: (path: string, data?: JsonValue, config?: RequestConfig) =>
    request("PATCH", path, { ...(config || {}), data }),
  put: (path: string, data?: JsonValue, config?: RequestConfig) =>
    request("PUT", path, { ...(config || {}), data }),
  delete: (path: string, config?: RequestConfig) => request("DELETE", path, config),
};

export default api;
export { apiFetch };
