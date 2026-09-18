from pydantic import BaseModel, EmailStr, Field

from .common import ORMModel


class AdminLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class AdminOut(ORMModel):
    id: int
    email: str
    full_name: str
    is_active: bool


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    admin: AdminOut