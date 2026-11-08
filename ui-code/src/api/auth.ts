import { apiRequest } from "./client";

export type AccessLink = {
  id: string;
  name: string;
  token: string;
  url_path: string;
  created_at?: string | null;
  updated_at?: string | null;
  last_login_at?: string | null;
};

export function adminLogin(password: string) {
  return apiRequest<{ ok: boolean }>("/admin/login", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export function adminLogout() {
  return apiRequest<{ ok: boolean }>("/admin/logout", { method: "POST" });
}

export function adminMe() {
  return apiRequest<{ role: string }>("/admin/me");
}

export function listAccessLinks() {
  return apiRequest<AccessLink[]>("/admin/links");
}

export function createAccessLink(name: string, password: string) {
  return apiRequest<AccessLink>("/admin/links", {
    method: "POST",
    body: JSON.stringify({ name, password }),
  });
}

export function resetAccessLinkPassword(id: string, password: string) {
  return apiRequest<AccessLink>(`/admin/links/${id}/reset-password`, {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export function deleteAccessLink(id: string) {
  return apiRequest<{ id: string }>(`/admin/links/${id}`, { method: "DELETE" });
}

export function getAccessInfo(token: string) {
  return apiRequest<{ name: string; token: string }>(`/access/${token}/info`);
}

export function accessLogin(token: string, password: string) {
  return apiRequest<{ name: string; user_id: string }>(`/access/${token}/login`, {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export function accessLogout() {
  return apiRequest<{ ok: boolean }>("/access/logout", { method: "POST" });
}

export function accessMe() {
  return apiRequest<{ user_id: string; name: string; token: string }>("/access/me");
}
