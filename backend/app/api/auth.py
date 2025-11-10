from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, EmailStr
from app.core.auth import verify_admin_credentials, create_access_token, get_current_admin

router = APIRouter()

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    email: str

@router.post("/login", response_model=LoginResponse)
def login(credentials: LoginRequest):
    """Admin login endpoint."""
    if verify_admin_credentials(credentials.email, credentials.password):
        access_token = create_access_token(credentials.email)
        return LoginResponse(
            access_token=access_token,
            email=credentials.email
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

@router.get("/me")
def get_current_user(current_admin: dict = Depends(get_current_admin)):
    """Get current admin info."""
    return {"email": current_admin.get("sub"), "role": "admin"}

