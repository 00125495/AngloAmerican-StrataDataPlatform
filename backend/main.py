import os
import httpx
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query, Request, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse, Response
from pydantic import BaseModel, ValidationError

from typing import Optional

from .models import (
    ChatRequest, ChatResponse, Config, Domain, InsertDomain,
    Endpoint, InsertEndpoint, Site, Conversation, Message,
    InsertMessage, MessageRole, EndpointType
)
from .storage import initialize_storage, get_storage, IStorage
from .user_context import UserContext, get_user_context, get_dev_user_context
from .databricks_client import databricks_client


class UserInfo(BaseModel):
    email: Optional[str] = None
    displayName: Optional[str] = None
    isAuthenticated: bool = False


storage: Optional[IStorage] = None
http_client: Optional[httpx.AsyncClient] = None
VITE_DEV_SERVER = "http://127.0.0.1:5173"


@asynccontextmanager
async def lifespan(app: FastAPI):
    global storage, http_client
    storage = await initialize_storage()
    http_client = httpx.AsyncClient(timeout=30.0)
    yield
    await http_client.aclose()


app = FastAPI(title="Anglo Strata API", lifespan=lifespan)


@app.get("/api/domains")
async def get_domains() -> list[Domain]:
    return await storage.get_domains()


@app.post("/api/domains", status_code=201)
async def create_domain(domain: InsertDomain) -> Domain:
    return await storage.create_domain(domain)


@app.put("/api/domains/{id}")
async def update_domain(id: str, updates: dict) -> Domain:
    domain = await storage.update_domain(id, updates)
    if not domain:
        raise HTTPException(status_code=404, detail="Domain not found")
    return domain


@app.delete("/api/domains/{id}", status_code=204)
async def delete_domain(id: str):
    deleted = await storage.delete_domain(id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Domain not found")


@app.get("/api/sites")
async def get_sites() -> list[Site]:
    return await storage.get_sites()


@app.get("/api/user")
async def get_current_user(request: Request) -> UserInfo:
    user_ctx = get_user_context(request)
    return UserInfo(
        email=user_ctx.email,
        displayName=user_ctx.display_name,
        isAuthenticated=user_ctx.is_authenticated
    )


@app.get("/api/endpoints")
async def get_endpoints(request: Request, domainId: str = Query(None)) -> list[Endpoint]:
    user_ctx = get_user_context(request)
    
    if user_ctx.access_token and databricks_client.host:
        try:
            endpoints = await databricks_client.list_serving_endpoints(user_ctx.access_token)
            if endpoints:
                return endpoints
        except Exception as e:
            print(f"Failed to fetch user endpoints: {e}")
    
    endpoints = await storage.get_endpoints(domainId)
    if endpoints and not any(e.isDefault for e in endpoints):
        endpoints[0] = endpoints[0].model_copy(update={"isDefault": True})
    return endpoints


@app.get("/api/agents")
async def get_agents(request: Request) -> list[Endpoint]:
    """List available agents from Databricks workspace based on user access."""
    user_ctx = get_user_context(request)
    
    if user_ctx.access_token and databricks_client.host:
        try:
            agents = await databricks_client.list_agents(user_ctx.access_token)
            return agents
        except Exception as e:
            print(f"Failed to fetch agents: {e}")
    
    all_endpoints = await storage.get_endpoints()
    return [e for e in all_endpoints if e.type.value == "agent"]


@app.post("/api/endpoints/refresh")
async def refresh_endpoints(request: Request) -> list[Endpoint]:
    user_ctx = get_user_context(request)
    
    if user_ctx.access_token and databricks_client.host:
        try:
            endpoints = await databricks_client.list_serving_endpoints(user_ctx.access_token)
            if endpoints:
                return endpoints
        except Exception as e:
            print(f"Failed to refresh user endpoints: {e}")
    
    endpoints = await storage.refresh_endpoints_from_databricks()
    return endpoints


@app.post("/api/endpoints", status_code=201)
async def create_endpoint(endpoint: InsertEndpoint) -> Endpoint:
    return await storage.create_endpoint(endpoint)


@app.put("/api/endpoints/{id}")
async def update_endpoint(id: str, updates: dict) -> Endpoint:
    endpoint = await storage.update_endpoint(id, updates)
    if not endpoint:
        raise HTTPException(status_code=404, detail="Endpoint not found")
    return endpoint


@app.delete("/api/endpoints/{id}", status_code=204)
async def delete_endpoint(id: str):
    deleted = await storage.delete_endpoint(id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Endpoint not found")


@app.get("/api/conversations")
async def get_conversations(request: Request) -> list[Conversation]:
    user_ctx = get_user_context(request)
    return await storage.get_conversations(user_ctx.email)


@app.get("/api/conversations/{id}")
async def get_conversation(id: str) -> Conversation:
    conversation = await storage.get_conversation(id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@app.delete("/api/conversations/{id}")
async def delete_conversation(id: str):
    deleted = await storage.delete_conversation(id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"success": True}


@app.post("/api/chat")
async def chat(http_request: Request, request: ChatRequest) -> ChatResponse:
    user_ctx = get_user_context(http_request)
    
    endpoint = await storage.get_endpoint(request.endpointId)
    domain = await storage.get_domain(request.domainId or "generic")
    site = await storage.get_site(request.siteId or "all-sites")

    if request.conversationId:
        conversation = await storage.get_conversation(request.conversationId)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        title = request.message[:50] + ("..." if len(request.message) > 50 else "")
        conversation = await storage.create_conversation(
            request.endpointId, title, request.domainId, request.siteId, user_ctx.email
        )

    conversation_context = [
        {"role": msg.role.value, "content": msg.content}
        for msg in conversation.messages
    ]

    await storage.add_message(
        conversation.id,
        InsertMessage(role=MessageRole.user, content=request.message, timestamp=int(__import__("time").time() * 1000))
    )

    site_context = f" Focus on data and context specific to {site.name} ({site.location})." if site and site.id != "all-sites" else ""
    system_prompt = (domain.systemPrompt if domain else "You are a helpful AI assistant.") + site_context

    endpoint_name = endpoint.name if endpoint else request.endpointId
    databricks_endpoint_name = request.endpointId[len("databricks-"):] if request.endpointId.startswith("databricks-") else request.endpointId

    messages = [
        {"role": "system", "content": system_prompt},
        *conversation_context,
        {"role": "user", "content": request.message}
    ]

    user_token = user_ctx.access_token
    can_call_databricks = databricks_client.host and (user_token or databricks_client.is_configured())
    
    if can_call_databricks:
        try:
            ai_response = await databricks_client.call_serving_endpoint(
                databricks_endpoint_name, 
                messages, 
                user_token
            )
        except Exception as e:
            print(f"Databricks API error: {e}")
            ai_response = generate_mock_response(
                request.message, endpoint_name,
                domain.name if domain else "General",
                site.name if site else "All Sites",
                conversation_context
            )
    else:
        ai_response = generate_mock_response(
            request.message, endpoint_name,
            domain.name if domain else "General",
            site.name if site else "All Sites",
            conversation_context
        )

    assistant_message = await storage.add_message(
        conversation.id,
        InsertMessage(role=MessageRole.assistant, content=ai_response, timestamp=int(__import__("time").time() * 1000))
    )

    return ChatResponse(message=assistant_message, conversationId=conversation.id)


@app.get("/api/config")
async def get_config() -> Config:
    return await storage.get_config()


@app.post("/api/config")
async def set_config(config: Config) -> Config:
    return await storage.set_config(config)


def generate_mock_response(
    message: str,
    endpoint_name: str,
    domain_name: str,
    site_name: str,
    context: list[dict]
) -> str:
    message_count = len(context)
    site_info = f" (focused on {site_name})" if site_name != "All Sites" else ""
    context_info = (
        f"\n\n*I have access to {message_count} previous messages in our conversation for context.{site_info}*"
        if message_count > 0
        else (f"\n\n*{site_info.strip()}*" if site_info else "")
    )

    domain_responses = {
        "Mining Operations": [
            f'As your Mining Operations assistant, I can help analyze production data and operational metrics.\n\nRegarding "{message}":\n\nIn a production environment, I would connect to real-time operational data from your mining sites, including equipment telemetry, shift reports, and safety metrics. I can help optimize production schedules, identify bottlenecks, and track KPIs.{context_info}',
        ],
        "Geological Services": [
            f'As your Geological Services assistant, I specialize in geological data analysis.\n\nRegarding "{message}":\n\nI can assist with ore body modeling, drill hole analysis, grade estimation, and geological mapping. In production, I would have access to your geological databases and exploration data to provide data-driven insights.{context_info}',
        ],
        "Mineral Processing": [
            f'As your Mineral Processing specialist, I focus on plant optimization.\n\nRegarding "{message}":\n\nI can help analyze throughput rates, recovery efficiencies, and processing parameters. In production, I would integrate with plant control systems to provide real-time optimization recommendations.{context_info}',
        ],
        "Sustainability & ESG": [
            f'As your Sustainability & ESG advisor, I help with environmental and social governance.\n\nRegarding "{message}":\n\nI can assist with emissions tracking, water usage analysis, community impact assessments, and ESG reporting. In production, I would connect to your sustainability monitoring systems.{context_info}',
        ],
        "Supply Chain": [
            f'As your Supply Chain analyst, I optimize logistics and procurement.\n\nRegarding "{message}":\n\nI can help with inventory optimization, vendor performance analysis, logistics routing, and procurement analytics. In production, I would integrate with your ERP and supply chain systems.{context_info}',
        ],
        "Finance & Analytics": [
            f'As your Finance & Analytics assistant, I focus on financial performance.\n\nRegarding "{message}":\n\nI can help with cost analysis, budget forecasting, capital allocation, and financial KPIs. In production, I would connect to your financial systems for real-time insights.{context_info}',
        ],
    }

    responses = domain_responses.get(domain_name, [
        f'Thank you for your question! Using {endpoint_name}, I\'m here to help with your {domain_name} queries.\n\nYou asked: "{message}"\n\nIn production, this would connect to your Databricks serving endpoint with domain-specific context and knowledge. The response would be tailored to your specific business area within Anglo American.{context_info}',
    ])

    import random
    return random.choice(responses)


if os.environ.get("NODE_ENV") == "production":
    if os.path.exists("dist/public"):
        app.mount("/assets", StaticFiles(directory="dist/public/assets"), name="assets")
        
        @app.get("/favicon.png")
        async def serve_favicon():
            return FileResponse("dist/public/favicon.png")
        
        @app.get("/{full_path:path}")
        async def serve_spa(full_path: str):
            if full_path.startswith("api/"):
                raise HTTPException(status_code=404, detail="API endpoint not found")
            return FileResponse("dist/public/index.html")
else:
    @app.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"])
    async def proxy_to_vite(request: Request, full_path: str):
        if full_path.startswith("api/") or full_path.startswith("api"):
            raise HTTPException(status_code=404, detail="API endpoint not found")
        
        url = f"{VITE_DEV_SERVER}/{full_path}"
        if request.query_params:
            url += f"?{request.query_params}"
        
        try:
            headers = dict(request.headers)
            headers.pop("host", None)
            
            if request.method == "GET":
                resp = await http_client.get(url, headers=headers)
            elif request.method == "POST":
                body = await request.body()
                resp = await http_client.post(url, headers=headers, content=body)
            else:
                resp = await http_client.request(request.method, url, headers=headers)
            
            response_headers = dict(resp.headers)
            response_headers.pop("content-encoding", None)
            response_headers.pop("content-length", None)
            response_headers.pop("transfer-encoding", None)
            
            return Response(
                content=resp.content,
                status_code=resp.status_code,
                headers=response_headers,
                media_type=resp.headers.get("content-type")
            )
        except httpx.ConnectError:
            return Response(
                content="Vite dev server not running. Start it with: npx vite --port 5173",
                status_code=503
            )
