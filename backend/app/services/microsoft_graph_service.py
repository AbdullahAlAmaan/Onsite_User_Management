import httpx
from typing import List, Dict, Optional
from app.core.config import settings
from msal import ConfidentialClientApplication
import json

class MicrosoftGraphService:
    """Service for interacting with Microsoft Graph API to fetch form submissions."""
    
    def __init__(self):
        self.client_id = settings.AZURE_CLIENT_ID
        self.client_secret = settings.AZURE_CLIENT_SECRET
        self.tenant_id = settings.AZURE_TENANT_ID
        self.scope = settings.MICROSOFT_GRAPH_SCOPE
        self.authority = f"https://login.microsoftonline.com/{self.tenant_id}"
        
    def get_access_token(self) -> Optional[str]:
        """Get access token using client credentials flow."""
        if not all([self.client_id, self.client_secret, self.tenant_id]):
            return None
        
        app = ConfidentialClientApplication(
            client_id=self.client_id,
            client_credential=self.client_secret,
            authority=self.authority
        )
        
        result = app.acquire_token_for_client(scopes=[self.scope])
        
        if "access_token" in result:
            return result["access_token"]
        else:
            raise Exception(f"Failed to acquire token: {result.get('error_description', 'Unknown error')}")
    
    def get_form_responses(self, form_id: str) -> List[Dict]:
        """
        Fetch form responses from Microsoft Forms.
        Returns list of enrollment records.
        """
        access_token = self.get_access_token()
        if not access_token:
            raise Exception("Unable to get access token. Check Azure AD configuration.")
        
        url = f"https://graph.microsoft.com/v1.0/forms/{form_id}/responses"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        with httpx.Client() as client:
            response = client.get(url, headers=headers)
            response.raise_for_status()
            data = response.json()
            
            # Transform form responses to enrollment records
            records = []
            for item in data.get("value", []):
                record = self._transform_form_response(item)
                if record:
                    records.append(record)
            
            return records
    
    def _transform_form_response(self, response: Dict) -> Optional[Dict]:
        """
        Transform Microsoft Forms response to enrollment record format.
        Adjust field mappings based on your actual form structure.
        """
        try:
            answers = response.get("answers", {})
            
            # Map form fields to enrollment record
            # Adjust these field names based on your actual form structure
            record = {
                'employee_id': self._extract_answer(answers, 'employee_id'),
                'name': self._extract_answer(answers, 'name'),
                'email': self._extract_answer(answers, 'email'),
                'sbu': self._extract_answer(answers, 'sbu'),
                'designation': self._extract_answer(answers, 'designation'),
                'course_name': self._extract_answer(answers, 'course_name'),
                'batch_code': self._extract_answer(answers, 'batch_code'),
            }
            
            # Validate required fields
            if not all([record['employee_id'], record['name'], record['email'], 
                       record['course_name'], record['batch_code']]):
                return None
            
            return record
        except Exception as e:
            print(f"Error transforming form response: {e}")
            return None
    
    def _extract_answer(self, answers: Dict, field_name: str) -> str:
        """Extract answer value from form response."""
        # Microsoft Forms stores answers in a specific structure
        # Adjust based on your form's actual structure
        for key, value in answers.items():
            if isinstance(value, dict):
                question = value.get("question", "")
                if field_name.lower() in question.lower():
                    answer_value = value.get("answer", "")
                    if isinstance(answer_value, str):
                        return answer_value
                    elif isinstance(answer_value, list) and len(answer_value) > 0:
                        return str(answer_value[0])
        return ""

