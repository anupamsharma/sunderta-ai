import { apiRequest } from "./client";

export function fetchProducts(params: Record<string, string | undefined> = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) q.set(k, v); });
  const suffix = q.toString() ? `?${q}` : "";
  return apiRequest<any[]>(`/products${suffix}`);
}
