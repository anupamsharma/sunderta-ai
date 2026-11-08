import { apiRequest } from "./client";

export function fetchRoutine() {
  return apiRequest<{ morning: any[]; night: any[]; weekly: any[] }>("/routine");
}

export function saveRoutine(payload: { morning: any[]; night: any[]; weekly?: any[] }) {
  return apiRequest("/routine", { method: "PUT", body: JSON.stringify(payload) });
}

export function saveCompletions(date: string, period: "morning" | "night", completed_steps: number[]) {
  return apiRequest("/routine/completions", {
    method: "POST",
    body: JSON.stringify({ date, period, completed_steps }),
  });
}

export function addProductToRoutine(productId: string, period: "morning" | "night" = "morning") {
  return apiRequest("/routine/add-product", {
    method: "POST",
    body: JSON.stringify({ product_id: productId, period }),
  });
}
