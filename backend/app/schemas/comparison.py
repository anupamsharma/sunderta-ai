from pydantic import BaseModel, Field


class ComparisonRequest(BaseModel):
    previous_analysis_id: str
    current_analysis_id: str
