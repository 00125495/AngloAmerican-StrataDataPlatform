from abc import ABC, abstractmethod
from typing import Optional
from uuid import uuid4
from .models import (
    Message, InsertMessage, Conversation, Domain, InsertDomain,
    Site, Endpoint, InsertEndpoint, Config, MessageRole, EndpointType
)
import time


class IStorage(ABC):
    @abstractmethod
    async def refresh_endpoints_from_databricks(self) -> list[Endpoint]:
        pass

    @abstractmethod
    async def get_conversations(self, user_email: Optional[str] = None) -> list[Conversation]:
        pass

    @abstractmethod
    async def get_conversation(self, id: str) -> Optional[Conversation]:
        pass

    @abstractmethod
    async def create_conversation(
        self, endpoint_id: str, title: str,
        domain_id: Optional[str] = None, site_id: Optional[str] = None,
        user_email: Optional[str] = None
    ) -> Conversation:
        pass

    @abstractmethod
    async def add_message(self, conversation_id: str, message: InsertMessage) -> Message:
        pass

    @abstractmethod
    async def update_conversation(self, id: str, updates: dict) -> Optional[Conversation]:
        pass

    @abstractmethod
    async def delete_conversation(self, id: str) -> bool:
        pass

    @abstractmethod
    async def get_domains(self) -> list[Domain]:
        pass

    @abstractmethod
    async def get_domain(self, id: str) -> Optional[Domain]:
        pass

    @abstractmethod
    async def create_domain(self, domain: InsertDomain) -> Domain:
        pass

    @abstractmethod
    async def update_domain(self, id: str, updates: dict) -> Optional[Domain]:
        pass

    @abstractmethod
    async def delete_domain(self, id: str) -> bool:
        pass

    @abstractmethod
    async def get_sites(self) -> list[Site]:
        pass

    @abstractmethod
    async def get_site(self, id: str) -> Optional[Site]:
        pass

    @abstractmethod
    async def get_endpoints(self, domain_id: Optional[str] = None) -> list[Endpoint]:
        pass

    @abstractmethod
    async def get_endpoint(self, id: str) -> Optional[Endpoint]:
        pass

    @abstractmethod
    async def create_endpoint(self, endpoint: InsertEndpoint) -> Endpoint:
        pass

    @abstractmethod
    async def update_endpoint(self, id: str, updates: dict) -> Optional[Endpoint]:
        pass

    @abstractmethod
    async def delete_endpoint(self, id: str) -> bool:
        pass

    @abstractmethod
    async def get_config(self) -> Config:
        pass

    @abstractmethod
    async def set_config(self, config: Config) -> Config:
        pass


class MemStorage(IStorage):
    def __init__(self):
        self.conversations: dict[str, Conversation] = {}
        self.domains: dict[str, Domain] = {}
        self.sites: dict[str, Site] = {}
        self.endpoints: dict[str, Endpoint] = {}
        self.config = Config()
        self._databricks_endpoints_loaded = False
        self._initialize_defaults()

    async def refresh_endpoints_from_databricks(self) -> list[Endpoint]:
        from .databricks_client import databricks_client
        
        if not databricks_client.is_configured():
            print("Databricks not configured, keeping default endpoints")
            return list(self.endpoints.values())
        
        try:
            db_endpoints = await databricks_client.list_serving_endpoints()
            
            if db_endpoints:
                self.endpoints.clear()
                for endpoint in db_endpoints:
                    self.endpoints[endpoint.id] = endpoint
                self._databricks_endpoints_loaded = True
                print(f"Loaded {len(db_endpoints)} endpoints from Databricks")
            else:
                print("No endpoints from Databricks, keeping defaults")
                
        except Exception as e:
            print(f"Error refreshing endpoints from Databricks: {e}")
            
        return list(self.endpoints.values())

    def _initialize_defaults(self):
        default_domains = [
            Domain(id="generic", name="General Assistant", description="General-purpose AI assistant for Anglo American", systemPrompt="You are a helpful AI assistant for Anglo American, a global mining company. Provide accurate, professional responses.", icon="Bot"),
            Domain(id="mining-ops", name="Mining Operations", description="Mining operations, production, and equipment management", systemPrompt="You are a mining operations specialist for Anglo American. Help with production optimization, equipment management, and operational efficiency.", icon="Pickaxe"),
            Domain(id="geological", name="Geological Services", description="Geological analysis, exploration, and resource estimation", systemPrompt="You are a geological services expert for Anglo American. Assist with geological analysis, exploration planning, and resource estimation.", icon="Mountain"),
            Domain(id="processing", name="Mineral Processing", description="Mineral processing and plant optimization", systemPrompt="You are a mineral processing specialist for Anglo American. Help optimize plant operations, throughput, and recovery rates.", icon="Factory"),
            Domain(id="sustainability", name="Sustainability & ESG", description="Environmental, social, and governance initiatives", systemPrompt="You are a sustainability and ESG advisor for Anglo American. Assist with environmental compliance, social responsibility, and governance reporting.", icon="Leaf"),
            Domain(id="supply-chain", name="Supply Chain", description="Supply chain, logistics, and procurement", systemPrompt="You are a supply chain specialist for Anglo American. Help with logistics optimization, procurement, and vendor management.", icon="Truck"),
            Domain(id="finance", name="Finance & Analytics", description="Financial analysis and business analytics", systemPrompt="You are a finance and analytics specialist for Anglo American. Assist with financial analysis, budgeting, and business intelligence.", icon="BarChart3"),
        ]
        for domain in default_domains:
            self.domains[domain.id] = domain

        default_sites = [
            Site(id="all-sites", name="All Sites", location="Global", type="Corporate"),
            Site(id="kumba", name="Kumba Iron Ore", location="South Africa", type="Iron Ore"),
            Site(id="sishen", name="Sishen Mine", location="Northern Cape, South Africa", type="Iron Ore"),
            Site(id="mogalakwena", name="Mogalakwena", location="Limpopo, South Africa", type="PGMs"),
            Site(id="unki", name="Unki Mine", location="Zimbabwe", type="PGMs"),
            Site(id="amandelbult", name="Amandelbult", location="Limpopo, South Africa", type="PGMs"),
            Site(id="quellaveco", name="Quellaveco", location="Peru", type="Copper"),
            Site(id="minas-rio", name="Minas-Rio", location="Brazil", type="Iron Ore"),
            Site(id="los-bronces", name="Los Bronces", location="Chile", type="Copper"),
            Site(id="moranbah", name="Moranbah", location="Queensland, Australia", type="Metallurgical Coal"),
            Site(id="sakatti", name="Sakatti", location="Finland", type="Copper-Nickel"),
            Site(id="woodsmith", name="Woodsmith", location="UK", type="Polyhalite"),
        ]
        for site in default_sites:
            self.sites[site.id] = site

        default_endpoints = [
            Endpoint(id="databricks-dbrx-instruct", name="DBRX Instruct", description="Databricks foundation model - fast and capable", type=EndpointType.foundation, isDefault=True),
            Endpoint(id="databricks-llama-3-70b", name="Llama 3 70B", description="Meta's Llama 3 70B model", type=EndpointType.foundation, isDefault=False),
            Endpoint(id="databricks-mixtral-8x7b", name="Mixtral 8x7B", description="Mistral AI mixture of experts", type=EndpointType.foundation, isDefault=False),
        ]
        for endpoint in default_endpoints:
            self.endpoints[endpoint.id] = endpoint

    async def get_conversations(self, user_email: Optional[str] = None) -> list[Conversation]:
        conversations = list(self.conversations.values())
        if user_email:
            conversations = [c for c in conversations if c.userEmail == user_email]
        return sorted(conversations, key=lambda c: c.updatedAt, reverse=True)

    async def get_conversation(self, id: str) -> Optional[Conversation]:
        return self.conversations.get(id)

    async def create_conversation(
        self, endpoint_id: str, title: str,
        domain_id: Optional[str] = None, site_id: Optional[str] = None,
        user_email: Optional[str] = None
    ) -> Conversation:
        conv_id = str(uuid4())
        now = int(time.time() * 1000)
        conversation = Conversation(
            id=conv_id,
            title=title,
            messages=[],
            endpointId=endpoint_id,
            domainId=domain_id,
            siteId=site_id,
            userEmail=user_email,
            createdAt=now,
            updatedAt=now
        )
        self.conversations[conv_id] = conversation
        return conversation

    async def add_message(self, conversation_id: str, message: InsertMessage) -> Message:
        conversation = self.conversations.get(conversation_id)
        if not conversation:
            raise ValueError("Conversation not found")
        
        msg_id = str(uuid4())
        new_message = Message(
            id=msg_id,
            role=message.role,
            content=message.content,
            timestamp=message.timestamp
        )
        conversation.messages.append(new_message)
        conversation.updatedAt = int(time.time() * 1000)
        return new_message

    async def update_conversation(self, id: str, updates: dict) -> Optional[Conversation]:
        conversation = self.conversations.get(id)
        if not conversation:
            return None
        
        for key, value in updates.items():
            if hasattr(conversation, key):
                setattr(conversation, key, value)
        conversation.updatedAt = int(time.time() * 1000)
        return conversation

    async def delete_conversation(self, id: str) -> bool:
        if id in self.conversations:
            del self.conversations[id]
            return True
        return False

    async def get_domains(self) -> list[Domain]:
        return list(self.domains.values())

    async def get_domain(self, id: str) -> Optional[Domain]:
        return self.domains.get(id)

    async def create_domain(self, domain: InsertDomain) -> Domain:
        base_id = domain.name.lower().replace(" ", "-")
        base_id = "".join(c for c in base_id if c.isalnum() or c == "-")
        domain_id = base_id
        counter = 1
        while domain_id in self.domains:
            domain_id = f"{base_id}-{counter}"
            counter += 1
        
        new_domain = Domain(id=domain_id, **domain.model_dump())
        self.domains[domain_id] = new_domain
        return new_domain

    async def update_domain(self, id: str, updates: dict) -> Optional[Domain]:
        domain = self.domains.get(id)
        if not domain:
            return None
        
        updated_data = domain.model_dump()
        updated_data.update(updates)
        updated_domain = Domain(**updated_data)
        self.domains[id] = updated_domain
        return updated_domain

    async def delete_domain(self, id: str) -> bool:
        if id in self.domains:
            del self.domains[id]
            return True
        return False

    async def get_sites(self) -> list[Site]:
        return list(self.sites.values())

    async def get_site(self, id: str) -> Optional[Site]:
        return self.sites.get(id)

    async def get_endpoints(self, domain_id: Optional[str] = None) -> list[Endpoint]:
        all_endpoints = list(self.endpoints.values())
        if not domain_id or domain_id == "generic":
            return [e for e in all_endpoints if not e.domainId or e.type == EndpointType.foundation]
        return [e for e in all_endpoints if not e.domainId or e.domainId == domain_id or e.type == EndpointType.foundation]

    async def get_endpoint(self, id: str) -> Optional[Endpoint]:
        return self.endpoints.get(id)

    async def create_endpoint(self, endpoint: InsertEndpoint) -> Endpoint:
        base_id = endpoint.name.lower().replace(" ", "-")
        base_id = "".join(c for c in base_id if c.isalnum() or c == "-")
        endpoint_id = base_id
        counter = 1
        while endpoint_id in self.endpoints:
            endpoint_id = f"{base_id}-{counter}"
            counter += 1
        
        new_endpoint = Endpoint(id=endpoint_id, **endpoint.model_dump())
        self.endpoints[endpoint_id] = new_endpoint
        return new_endpoint

    async def update_endpoint(self, id: str, updates: dict) -> Optional[Endpoint]:
        endpoint = self.endpoints.get(id)
        if not endpoint:
            return None
        
        updated_data = endpoint.model_dump()
        updated_data.update(updates)
        updated_endpoint = Endpoint(**updated_data)
        self.endpoints[id] = updated_endpoint
        return updated_endpoint

    async def delete_endpoint(self, id: str) -> bool:
        if id in self.endpoints:
            del self.endpoints[id]
            return True
        return False

    async def get_config(self) -> Config:
        return self.config

    async def set_config(self, config: Config) -> Config:
        self.config = config
        return self.config


storage_instance: Optional[IStorage] = None


async def initialize_storage() -> IStorage:
    global storage_instance
    
    from .lakebase_storage import create_lakebase_config, LakeBaseStorage
    
    lakebase_config = create_lakebase_config()
    if lakebase_config:
        try:
            lakebase_storage = LakeBaseStorage(lakebase_config)
            await lakebase_storage.initialize()
            storage_instance = lakebase_storage
            print("Using LakeBase storage (Databricks)")
        except Exception as e:
            print(f"Failed to initialize LakeBase storage: {e}")
            print("Falling back to in-memory storage")
            storage_instance = MemStorage()
    else:
        storage_instance = MemStorage()
        print("Using in-memory storage")
    
    await storage_instance.refresh_endpoints_from_databricks()
    
    return storage_instance


def get_storage() -> IStorage:
    global storage_instance
    if not storage_instance:
        storage_instance = MemStorage()
    return storage_instance
