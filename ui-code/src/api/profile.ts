import { apiRequest } from "./client";

export function fetchProfile() {
  return apiRequest<any>("/profile");
}

export function updateProfile(payload: Record<string, unknown>) {
  return apiRequest("/profile", { method: "PUT", body: JSON.stringify(payload) });
}

export function deleteAllData() {
  return apiRequest("/profile/data", { method: "DELETE" });
}
