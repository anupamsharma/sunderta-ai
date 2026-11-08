import { apiRequest } from "./client";
import { compressImageFile, dataUrlToFile, fileToDataUrl } from "./compress";

export type ProgressInfo = { stage: string; progress: number; message: string };
export type AnalysisStatus = {
  id: string;
  status: string;
  mode: "image" | "video";
  progress: ProgressInfo;
  error_code?: string | null;
  error_message?: string | null;
};

export async function uploadAnalysis(mode: "image" | "video", file: File, consent = true) {
  let uploadFile = file;
  if (mode === "image") {
    uploadFile = await compressImageFile(file);
  }

  const form = new FormData();
  form.append("file", uploadFile);
  form.append("consent", String(consent));
  return apiRequest<{ id: string; status: string; mode: string; progress: ProgressInfo }>(
    `/analyses/${mode}`,
    { method: "POST", body: form },
  );
}

export function getAnalysisStatus(id: string) {
  return apiRequest<AnalysisStatus>(`/analyses/${id}/status`);
}

export function getAnalysisReport(id: string) {
  return apiRequest<any>(`/analyses/${id}/report`);
}

export function deleteAnalysis(id: string) {
  return apiRequest<{ deleted: boolean }>(`/analyses/${id}`, { method: "DELETE" });
}

export function retryAnalysis(id: string) {
  return apiRequest<AnalysisStatus>(`/analyses/${id}/retry`, { method: "POST" });
}

export function cancelAnalysis(id: string) {
  return apiRequest<AnalysisStatus>(`/analyses/${id}/cancel`, { method: "POST" });
}

export { compressImageFile, dataUrlToFile, fileToDataUrl };
