function resolveApiBase(): string {
  const configured = import.meta.env.VITE_API_BASE_URL;
  if (configured) return configured.replace(/\/$/, "");
  // Same-origin /api works on desktop and phone via nginx proxy.
  if (typeof window !== "undefined") return `${window.location.origin}/api`;
  return "http://localhost:8000/api";
}

const API_BASE = resolveApiBase();

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

type Envelope<T> = {
  success: boolean;
  data: T;
  error: { code: string; message: string } | null;
};

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });
  const json = (await res.json()) as Envelope<T>;
  if (!res.ok || !json.success) {
    throw new ApiError(
      json.error?.code || "HTTP_ERROR",
      json.error?.message || "Request failed",
      res.status,
    );
  }
  return json.data;
}

export { API_BASE };
