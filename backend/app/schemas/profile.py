from typing import Optional
from pydantic import BaseModel, Field


class ProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    skin_goals: list[str] = Field(default_factory=list)
    sensitivities: list[str] = Field(default_factory=list)
    ingredients_to_avoid: list[str] = Field(default_factory=list)
    budget_range: Optional[str] = None
    product_preferences: list[str] = Field(default_factory=list)
    location: Optional[str] = None
    privacy_preferences: dict = Field(default_factory=dict)
    media_retention_preference: Optional[str] = None
