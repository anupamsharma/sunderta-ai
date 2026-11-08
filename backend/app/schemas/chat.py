from typing import Optional
from pydantic import BaseModel, Field


class CreateConversationRequest(BaseModel):
    analysis_id: Optional[str] = None
    title: Optional[str] = None


class SendMessageRequest(BaseModel):
    content: str = Field(min_length=1, max_length=4000)
