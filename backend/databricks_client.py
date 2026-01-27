import os
import httpx
from typing import Optional
from .models import Endpoint, EndpointType


class DatabricksClient:
    def __init__(self):
        host = os.getenv("DATABRICKS_HOST", "").rstrip("/")
        # Ensure host has https:// prefix
        if host and not host.startswith("http"):
            host = f"https://{host}"
        self.host = host
        self.client_id = os.getenv("DATABRICKS_CLIENT_ID")
        self.client_secret = os.getenv("DATABRICKS_CLIENT_SECRET")
        self.token = os.getenv("DATABRICKS_TOKEN")
        self._sp_access_token: Optional[str] = None
        
    def is_configured(self) -> bool:
        if not self.host:
            return False
        return bool(self.token) or (bool(self.client_id) and bool(self.client_secret))
    
    async def _get_service_principal_token(self) -> str:
        if self.token:
            return self.token
            
        if self._sp_access_token:
            return self._sp_access_token
            
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
            self._sp_access_token = data["access_token"]
            return self._sp_access_token
    
    async def _get_token(self, user_token: Optional[str] = None) -> str:
        if user_token:
            return user_token
        return await self._get_service_principal_token()
    
    def _detect_endpoint_type(self, endpoint_data: dict) -> EndpointType:
        name = endpoint_data.get("name", "").lower()
        config = endpoint_data.get("config", {})
        served_entities = config.get("served_entities", [])
        
        # Check task field - Databricks shows "Agent (Responses)" for agent endpoints
        task = endpoint_data.get("task", "").lower()
        if "agent" in task:
            return EndpointType.agent
        
        # Check served entities for agent or external model markers
        for entity in served_entities:
            if entity.get("external_model"):
                return EndpointType.foundation
            entity_name = entity.get("entity_name", "").lower()
            if "agent" in entity_name:
                return EndpointType.agent
            # Check entity version metadata
            entity_version = entity.get("entity_version", "")
            if entity_version and "agent" in str(entity_version).lower():
                return EndpointType.agent
                
        # Check endpoint name for agent keyword
        if "agent" in name:
            return EndpointType.agent
            
        # Check for foundation model patterns
        if any(fm in name for fm in ["llama", "mixtral", "dbrx", "claude", "gpt", "gemini"]):
            return EndpointType.foundation
            
        # Check route_optimized endpoints (often chat/LLM models)
        if endpoint_data.get("route_optimized"):
            return EndpointType.foundation
            
        return EndpointType.custom
    
    async def list_serving_endpoints(self, user_token: Optional[str] = None) -> list[Endpoint]:
        if not self.is_configured() and not user_token:
            print("Databricks not configured and no user token, returning empty list")
            return []
            
        try:
            token = await self._get_token(user_token)
            
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
    
    async def call_serving_endpoint(
        self, 
        endpoint_name: str, 
        messages: list[dict],
        user_token: Optional[str] = None
    ) -> str:
        if not self.host:
            raise ValueError("Databricks host not configured")
            
        try:
            token = await self._get_token(user_token)
            
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.host}/serving-endpoints/{endpoint_name}/invocations",
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "application/json"
                    },
                    json={"messages": messages}
                )
                
                if response.status_code != 200:
                    raise Exception(f"Databricks API error: {response.status_code} - {response.text}")
                
                data = response.json()
                return (
                    data.get("choices", [{}])[0].get("message", {}).get("content") or
                    data.get("predictions", [None])[0] or
                    "I received your message but couldn't generate a response."
                )
                
        except Exception as e:
            print(f"Error calling serving endpoint {endpoint_name}: {e}")
            raise

    async def list_agents(self, user_token: Optional[str] = None) -> list[Endpoint]:
        """List only agent endpoints from the workspace based on user access."""
        if not self.is_configured() and not user_token:
            return []
            
        try:
            token = await self._get_token(user_token)
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.host}/api/2.0/serving-endpoints",
                    headers={"Authorization": f"Bearer {token}"}
                )
                response.raise_for_status()
                data = response.json()
                
            agents = []
            for ep in data.get("endpoints", []):
                endpoint_type = self._detect_endpoint_type(ep)
                if endpoint_type == EndpointType.agent:
                    endpoint_name = ep.get("name", "")
                    state = ep.get("state", {})
                    ready = state.get("ready") == "READY"
                    
                    description = f"AI Agent: {endpoint_name}"
                    if not ready:
                        description += " (not ready)"
                    
                    agents.append(Endpoint(
                        id=endpoint_name,
                        name=endpoint_name,
                        description=description,
                        type=EndpointType.agent,
                        isDefault=False
                    ))
                    
            return agents
            
        except Exception as e:
            print(f"Error fetching agents: {e}")
            return []

    async def list_foundation_model_apis(self, user_token: Optional[str] = None) -> list[Endpoint]:
        if not self.is_configured() and not user_token:
            return []
            
        try:
            token = await self._get_token(user_token)
            
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
