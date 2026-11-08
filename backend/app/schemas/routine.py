from typing import Literal, Optional
from pydantic import BaseModel, Field


class RoutineStepUpdate(BaseModel):
    period: Literal["morning", "night", "weekly"]
    step: int
    type: str
    ingredient: str = ""
    why: str = ""
    frequency: str = ""


class CompletionRequest(BaseModel):
    date: str
    period: Literal["morning", "night"]
    completed_steps: list[int] = Field(default_factory=list)


class AddProductToRoutineRequest(BaseModel):
    product_id: str
    period: Literal["morning", "night"] = "morning"
