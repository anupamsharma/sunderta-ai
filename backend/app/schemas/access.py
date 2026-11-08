from pydantic import BaseModel, Field


class PasswordBody(BaseModel):
    password: str = Field(min_length=1)


class CreateLinkRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=6, max_length=128)


class ResetPasswordRequest(BaseModel):
    password: str = Field(min_length=6, max_length=128)
