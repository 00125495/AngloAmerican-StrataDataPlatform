from pydantic import BaseModel, Field
from typing import Optional, Literal
from enum import Enum


class MessageRole(str, Enum):
    user = "user"
    assistant = "assistant"
    system = "system"


class Message(BaseModel):
    id: str
    role: MessageRole
    content: str
    timestamp: int


class InsertMessage(BaseModel):
    role: MessageRole
    content: str
    timestamp: int


class Conversation(BaseModel):
    id: str
    title: str
    messages: list[Message]
    endpointId: str
    domainId: Optional[str] = None
    siteId: Optional[str] = None
    userEmail: Optional[str] = None
    createdAt: int
    updatedAt: int


class Domain(BaseModel):
    id: str
    name: str
    description: str
    systemPrompt: str
    icon: Optional[str] = None


class InsertDomain(BaseModel):
    name: str
    description: str
    systemPrompt: str
    icon: Optional[str] = None


class Site(BaseModel):
    id: str
    name: str
    location: str
    type: str


class EndpointType(str, Enum):
    foundation = "foundation"
    custom = "custom"
    agent = "agent"


class Endpoint(BaseModel):
    id: str
    name: str
    description: str
    type: EndpointType
    isDefault: bool
    domainId: Optional[str] = None


class InsertEndpoint(BaseModel):
    name: str
    description: str
    type: EndpointType
    isDefault: bool
    domainId: Optional[str] = None


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    conversationId: Optional[str] = None
    endpointId: str
    domainId: Optional[str] = None
    siteId: Optional[str] = None


class ChatResponse(BaseModel):
    message: Message
    conversationId: str


class Config(BaseModel):
    defaultEndpointId: Optional[str] = None
    defaultDomainId: Optional[str] = None
    defaultSiteId: Optional[str] = None
    systemPrompt: Optional[str] = None
