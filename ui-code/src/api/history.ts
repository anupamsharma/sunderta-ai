import { apiRequest } from "./client";

export function fetchHistory(mode?: string, page = 1, pageSize = 20) {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (mode) params.set("mode", mode);
  return apiRequest<{ items: any[]; page: number; page_size: number; total: number }>(`/history?${params}`);
}

export function createComparison(previousId: string, currentId: string) {
  return apiRequest<any>("/comparisons", {
    method: "POST",
    body: JSON.stringify({ previous_analysis_id: previousId, current_analysis_id: currentId }),
  });
}
