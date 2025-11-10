from app.core.config import settings
from typing import Optional
import os

try:
    from azure.storage.blob import BlobServiceClient, BlobClient, ContainerClient
    AZURE_STORAGE_AVAILABLE = True
except ImportError:
    AZURE_STORAGE_AVAILABLE = False

class AzureStorageService:
    """Service for handling file uploads to Azure Blob Storage."""
    
    def __init__(self):
        self.connection_string = getattr(settings, 'AZURE_STORAGE_CONNECTION_STRING', None)
        self.container_name = getattr(settings, 'AZURE_STORAGE_CONTAINER', 'enrollment-uploads')
        
        if self.connection_string and AZURE_STORAGE_AVAILABLE:
            try:
                self.blob_service_client = BlobServiceClient.from_connection_string(
                    self.connection_string
                )
                self._ensure_container_exists()
            except Exception as e:
                print(f"Warning: Could not initialize Azure Blob Storage: {e}")
                self.blob_service_client = None
        else:
            self.blob_service_client = None
    
    def _ensure_container_exists(self):
        """Ensure the container exists, create if it doesn't."""
        if not self.blob_service_client:
            return
        
        try:
            container_client = self.blob_service_client.get_container_client(self.container_name)
            if not container_client.exists():
                container_client.create_container()
        except Exception as e:
            print(f"Warning: Could not create container: {e}")
    
    def upload_file(self, file_path: str, blob_name: str) -> Optional[str]:
        """
        Upload a file to Azure Blob Storage.
        Returns the blob URL if successful, None otherwise.
        """
        if not self.blob_service_client:
            return None
        
        try:
            blob_client = self.blob_service_client.get_blob_client(
                container=self.container_name,
                blob=blob_name
            )
            
            with open(file_path, "rb") as data:
                blob_client.upload_blob(data, overwrite=True)
            
            return blob_client.url
        except Exception as e:
            print(f"Error uploading to Azure Blob Storage: {e}")
            return None
    
    def upload_file_data(self, file_data: bytes, blob_name: str) -> Optional[str]:
        """
        Upload file data directly to Azure Blob Storage.
        Returns the blob URL if successful, None otherwise.
        """
        if not self.blob_service_client:
            return None
        
        try:
            blob_client = self.blob_service_client.get_blob_client(
                container=self.container_name,
                blob=blob_name
            )
            
            blob_client.upload_blob(file_data, overwrite=True)
            return blob_client.url
        except Exception as e:
            print(f"Error uploading to Azure Blob Storage: {e}")
            return None
    
    def download_file(self, blob_name: str, download_path: str) -> bool:
        """Download a file from Azure Blob Storage."""
        if not self.blob_service_client:
            return False
        
        try:
            blob_client = self.blob_service_client.get_blob_client(
                container=self.container_name,
                blob=blob_name
            )
            
            with open(download_path, "wb") as download_file:
                download_file.write(blob_client.download_blob().readall())
            
            return True
        except Exception as e:
            print(f"Error downloading from Azure Blob Storage: {e}")
            return False
    
    def delete_file(self, blob_name: str) -> bool:
        """Delete a file from Azure Blob Storage."""
        if not self.blob_service_client:
            return False
        
        try:
            blob_client = self.blob_service_client.get_blob_client(
                container=self.container_name,
                blob=blob_name
            )
            blob_client.delete_blob()
            return True
        except Exception as e:
            print(f"Error deleting from Azure Blob Storage: {e}")
            return False

