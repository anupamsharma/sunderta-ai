from fastapi import APIRouter, Depends

from app.core.responses import success_response
from app.core.security import get_user_id
from app.schemas.chat import CreateConversationRequest, SendMessageRequest
from app.services import chat_service

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/conversations")
def create_conversation(body: CreateConversationRequest, user_id: str = Depends(get_user_id)):
    return success_response(chat_service.create_conversation(user_id, body.analysis_id, body.title), status_code=201)


@router.get("/conversations")
def list_conversations(user_id: str = Depends(get_user_id)):
    return success_response(chat_service.list_conversations(user_id))


@router.get("/conversations/{conversation_id}")
def get_conversation(conversation_id: str, user_id: str = Depends(get_user_id)):
    return success_response(chat_service.get_conversation(user_id, conversation_id))


@router.post("/conversations/{conversation_id}/messages")
def send_message(conversation_id: str, body: SendMessageRequest, user_id: str = Depends(get_user_id)):
    return success_response(chat_service.send_message(user_id, conversation_id, body.content))


@router.delete("/conversations/{conversation_id}")
def delete_conversation(conversation_id: str, user_id: str = Depends(get_user_id)):
    chat_service.delete_conversation(user_id, conversation_id)
    return success_response({"deleted": True})
