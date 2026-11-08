import { apiRequest } from "./client";

export function createConversation(analysisId?: string) {
  return apiRequest<{ id: string; analysis_id?: string }>("/chat/conversations", {
    method: "POST",
    body: JSON.stringify({ analysis_id: analysisId || null }),
  });
}

export function getConversation(id: string) {
  return apiRequest<{ id: string; messages: any[] }>(`/chat/conversations/${id}`);
}

export function sendMessage(conversationId: string, content: string) {
  return apiRequest<{ id: string; role: string; text: string; time: string }>(
    `/chat/conversations/${conversationId}/messages`,
    { method: "POST", body: JSON.stringify({ content }) },
  );
}
