from pydantic import BaseModel, EmailStr

class SignupRequest(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    password: str
    role: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    role: str

class MFASetupRequest(BaseModel):
    user_id: int

class MFAVerifyRequest(BaseModel):
    user_id: int
    token: str
