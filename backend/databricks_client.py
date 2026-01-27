import os
import httpx
from typing import Optional
from .models import Endpoint, EndpointType


class DatabricksClient:
    def __init__(self):
        self.host = os.getenv("DATABRICKS_HOST", "").rstrip("/")
        self.client_id = os.getenv("DATABRICKS_CLIENT_ID")
        self.client_secret = os.getenv("DATABRICKS_CLIENT_SECRET")
        self.token = os.getenv("DATABRICKS_TOKEN")
        self._access_token: Optional[str] = None
        
    def is_configured(self) -> bool:
        if not self.host:
            return False
        return bool(self.token) or (bool(self.client_id) and bool(self.client_secret))
    
    async def _get_access_token(self) -> str:
        if self.token:
            return self.token
            
        if self._access_token:
            return self._access_token
            
        if not self.client_id or not self.client_secret:
            raise ValueError("Databricks credentials not configured")
            
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.host}/oidc/v1/token",
                data={
                    "grant_type": "client_credentials",
                    "scope": "all-apis"
                },
                auth=(self.client_id, self.client_secret)
            )
            response.raise_for_status()
            data = response.json()
            self._access_token = data["access_token"]
            return self._access_token
    
    def _detect_endpoint_type(self, endpoint_data: dict) -> EndpointType:
        name = endpoint_data.get("name", "").lower()
        config = endpoint_data.get("config", {})
        served_entities = config.get("served_entities", [])
        
        for entity in served_entities:
            if entity.get("external_model"):
                return EndpointType.foundation
            if "agent" in entity.get("entity_name", "").lower():
                return EndpointType.agent
                
        if "agent" in name:
            return EndpointType.agent
        if any(fm in name for fm in ["llama", "mixtral", "dbrx", "claude", "gpt", "gemini"]):
            return EndpointType.foundation
            
        return EndpointType.custom
    
    async def list_serving_endpoints(self) -> list[Endpoint]:
        if not self.is_configured():
            print("Databricks not configured, returning empty list")
            return []
            
        try:
            token = await self._get_access_token()
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.host}/api/2.0/serving-endpoints",
                    headers={"Authorization": f"Bearer {token}"}
                )
                response.raise_for_status()
                data = response.json()
                
            endpoints = []
            for i, ep in enumerate(data.get("endpoints", [])):
                endpoint_name = ep.get("name", "")
                endpoint_type = self._detect_endpoint_type(ep)
                
                state = ep.get("state", {})
                ready = state.get("ready") == "READY"
                
                description = f"Databricks serving endpoint"
                if endpoint_type == EndpointType.agent:
                    description = f"AI Agent: {endpoint_name}"
                elif endpoint_type == EndpointType.foundation:
                    description = f"Foundation model: {endpoint_name}"
                elif endpoint_type == EndpointType.custom:
                    description = f"Custom model: {endpoint_name}"
                    
                if not ready:
                    description += " (not ready)"
                
                endpoints.append(Endpoint(
                    id=endpoint_name,
                    name=endpoint_name,
                    description=description,
                    type=endpoint_type,
                    isDefault=(i == 0)
                ))
                
            return endpoints
            
        except Exception as e:
            print(f"Error fetching Databricks endpoints: {e}")
            return []
    
    async def list_foundation_model_apis(self) -> list[Endpoint]:
        if not self.is_configured():
            return []
            
        try:
            token = await self._get_access_token()
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.host}/api/2.0/serving-endpoints",
                    headers={"Authorization": f"Bearer {token}"},
                    params={"filter": "foundation_model_apis"}
                )
                
                if response.status_code != 200:
                    return []
                    
                data = response.json()
                
            endpoints = []
            for ep in data.get("endpoints", []):
                endpoint_name = ep.get("name", "")
                endpoints.append(Endpoint(
                    id=endpoint_name,
                    name=endpoint_name,
                    description=f"Foundation Model API: {endpoint_name}",
                    type=EndpointType.foundation,
                    isDefault=False
                ))
                
            return endpoints
            
        except Exception as e:
            print(f"Error fetching foundation model APIs: {e}")
            return []


databricks_client = DatabricksClient()
