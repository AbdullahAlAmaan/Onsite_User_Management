from pydantic_settings import BaseSettings
from typing import List, Union
from pydantic import field_validator

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://user:password@localhost/enrollment_db"
    
    # Azure AD (Optional - for Microsoft Forms integration)
    AZURE_CLIENT_ID: str = ""
    AZURE_CLIENT_SECRET: str = ""
    AZURE_TENANT_ID: str = ""
    
    # Microsoft Graph API (Optional)
    MICROSOFT_GRAPH_API_KEY: str = ""
    MICROSOFT_GRAPH_SCOPE: str = "https://graph.microsoft.com/.default"
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS - can be a list or comma-separated string
    CORS_ORIGINS: Union[str, List[str]] = ["http://localhost:3000", "http://localhost:5173"]
    
    @field_validator('CORS_ORIGINS', mode='before')
    @classmethod
    def parse_cors_origins(cls, v):
        """Parse CORS origins from string or list."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v
    
    # Application
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # File Upload
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    UPLOAD_DIR: str = "uploads"
    
    # Azure Blob Storage (Optional - files stored locally if not set)
    AZURE_STORAGE_CONNECTION_STRING: str = ""
    AZURE_STORAGE_CONTAINER: str = "enrollment-uploads"
    
    # Admin Authentication
    ADMIN_EMAIL: str = ""
    ADMIN_PASSWORD: str = ""
    
    # Email Configuration (for reminders)
    SMTP_ENABLED: bool = False
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_USE_TLS: bool = True
    REMINDER_MINUTES_BEFORE: int = 30  # Send reminder 30 minutes before class
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

