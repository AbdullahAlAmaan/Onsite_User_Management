from pydantic_settings import BaseSettings
from typing import List

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
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]
    
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
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

