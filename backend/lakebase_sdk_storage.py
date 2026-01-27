import os
import asyncio
import logging
import uuid
import time
from typing import Optional
from contextlib import asynccontextmanager

import asyncpg
from sqlalchemy import URL, event, text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from .models import (
    Message, InsertMessage, Conversation, Domain, InsertDomain,
    Site, Endpoint, InsertEndpoint, Config, MessageRole, EndpointType
)
from .storage import IStorage

logger = logging.getLogger(__name__)


def is_lakebase_configured() -> bool:
    """Check if LakeBase SDK configuration is available."""
    pghost = os.environ.get("PGHOST")
    pgdatabase = os.environ.get("PGDATABASE")
    client_id = os.environ.get("DATABRICKS_CLIENT_ID")
    client_secret = os.environ.get("DATABRICKS_CLIENT_SECRET")
    
    return bool(pghost and pgdatabase and client_id and client_secret)


class LakebaseSDKStorage(IStorage):
    """LakeBase storage using Databricks SDK for OAuth token management."""
    
    def __init__(self):
        self.engine: Optional[AsyncEngine] = None
        self.session_maker: Optional[sessionmaker] = None
        self.workspace_client = None
        self.postgres_token: Optional[str] = None
        self.token_refresh_task: Optional[asyncio.Task] = None
        self.last_token_refresh: float = 0
        
        self.memory_cache = {
            "domains": {},
            "sites": {},
            "endpoints": {},
            "config": Config()
        }

    async def initialize(self):
        """Initialize database connection with OAuth token management."""
        try:
            print("[LAKEBASE] Starting initialization...")
            from databricks.sdk import WorkspaceClient
            
            print("[LAKEBASE] Creating WorkspaceClient...")
            self.workspace_client = WorkspaceClient()
            print("[LAKEBASE] WorkspaceClient created successfully")
            
            print("[LAKEBASE] Generating OAuth token...")
            await self._generate_token()
            print(f"[LAKEBASE] Token generated: {'yes' if self.postgres_token else 'no'}")
            
            pghost = os.environ.get("PGHOST")
            pgdatabase = os.environ.get("PGDATABASE")
            pguser = os.environ.get("PGUSER") or os.environ.get("DATABRICKS_CLIENT_ID")
            pgport = int(os.environ.get("PGPORT", "5432"))
            
            url = URL.create(
                drivername="postgresql+asyncpg",
                username=pguser,
                password="",
                host=pghost,
                port=pgport,
                database=pgdatabase,
            )
            
            self.engine = create_async_engine(
                url,
                pool_pre_ping=False,
                echo=False,
                pool_size=5,
                max_overflow=10,
                pool_timeout=30,
                pool_recycle=3600,
                connect_args={
                    "command_timeout": 30,
                    "server_settings": {"application_name": "anglo_strata"},
                    "ssl": "require",
                },
            )
            
            @event.listens_for(self.engine.sync_engine, "do_connect")
            def provide_token(dialect, conn_rec, cargs, cparams):
                cparams["password"] = self.postgres_token
            
            self.session_maker = sessionmaker(
                bind=self.engine, class_=AsyncSession, expire_on_commit=False
            )
            
            await self._create_tables()
            await self._initialize_defaults()
            
            self.token_refresh_task = asyncio.create_task(self._token_refresh_loop())
            
            logger.info("LakeBase SDK storage initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize LakeBase SDK storage: {e}")
            raise

    async def _generate_token(self):
        """Generate a new OAuth token for database access."""
        try:
            instance_name = os.environ.get("LAKEBASE_INSTANCE_NAME")
            
            if instance_name:
                cred = self.workspace_client.database.generate_database_credential(
                    request_id=str(uuid.uuid4()),
                    instance_names=[instance_name],
                )
                self.postgres_token = cred.token
            else:
                token = self.workspace_client.config.token
                if callable(token):
                    self.postgres_token = token()
                else:
                    self.postgres_token = token or os.environ.get("DATABRICKS_TOKEN", "")
            
            self.last_token_refresh = time.time()
            logger.info("Database OAuth token generated successfully")
            
        except Exception as e:
            logger.error(f"Failed to generate database token: {e}")
            self.postgres_token = os.environ.get("DATABRICKS_TOKEN", "")

    async def _token_refresh_loop(self):
        """Background task to refresh tokens every 50 minutes."""
        while True:
            try:
                await asyncio.sleep(50 * 60)
                logger.info("Refreshing database OAuth token...")
                await self._generate_token()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Token refresh failed: {e}")

    async def _create_tables(self):
        """Create database tables if they don't exist."""
        async with self.engine.begin() as conn:
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS conversations (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    endpoint_id TEXT,
                    domain_id TEXT,
                    site_id TEXT,
                    user_email TEXT,
                    created_at BIGINT NOT NULL,
                    updated_at BIGINT NOT NULL
                )
            """))
            
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS messages (
                    id TEXT PRIMARY KEY,
                    conversation_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    timestamp BIGINT NOT NULL
                )
            """))
            
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_conversations_user_email 
                ON conversations(user_email)
            """))
            
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_messages_conversation_id 
                ON messages(conversation_id)
            """))
            
        logger.info("Database tables created/verified")

    async def _initialize_defaults(self):
        """Initialize default domains, sites, and endpoints in memory."""
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
            self.memory_cache["domains"][domain.id] = domain

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
            self.memory_cache["sites"][site.id] = site

        default_endpoints = [
            Endpoint(id="databricks-dbrx-instruct", name="DBRX Instruct", description="Databricks foundation model - fast and capable", type=EndpointType.foundation, isDefault=True),
            Endpoint(id="databricks-llama-3-70b", name="Llama 3 70B", description="Meta's Llama 3 70B model", type=EndpointType.foundation, isDefault=False),
            Endpoint(id="databricks-mixtral-8x7b", name="Mixtral 8x7B", description="Mistral AI mixture of experts", type=EndpointType.foundation, isDefault=False),
        ]
        for endpoint in default_endpoints:
            self.memory_cache["endpoints"][endpoint.id] = endpoint

    async def shutdown(self):
        """Clean up resources."""
        if self.token_refresh_task:
            self.token_refresh_task.cancel()
            try:
                await self.token_refresh_task
            except asyncio.CancelledError:
                pass
        
        if self.engine:
            await self.engine.dispose()

    async def refresh_endpoints_from_databricks(self) -> list[Endpoint]:
        from .databricks_client import databricks_client
        
        if not databricks_client.is_configured():
            return list(self.memory_cache["endpoints"].values())
        
        try:
            db_endpoints = await databricks_client.list_serving_endpoints()
            if db_endpoints:
                self.memory_cache["endpoints"].clear()
                for endpoint in db_endpoints:
                    self.memory_cache["endpoints"][endpoint.id] = endpoint
                logger.info(f"Loaded {len(db_endpoints)} endpoints from Databricks")
        except Exception as e:
            logger.error(f"Error refreshing endpoints: {e}")
            
        return list(self.memory_cache["endpoints"].values())

    async def get_conversations(self, user_email: Optional[str] = None) -> list[Conversation]:
        async with self.session_maker() as session:
            if user_email:
                result = await session.execute(
                    text("SELECT * FROM conversations WHERE user_email = :email ORDER BY updated_at DESC"),
                    {"email": user_email}
                )
            else:
                result = await session.execute(
                    text("SELECT * FROM conversations ORDER BY updated_at DESC")
                )
            
            rows = result.fetchall()
            conversations = []
            
            for row in rows:
                messages = await self._get_messages(session, row.id)
                conversations.append(Conversation(
                    id=row.id,
                    title=row.title,
                    messages=messages,
                    endpointId=row.endpoint_id,
                    domainId=row.domain_id,
                    siteId=row.site_id,
                    userEmail=row.user_email,
                    createdAt=row.created_at,
                    updatedAt=row.updated_at
                ))
            
            return conversations

    async def _get_messages(self, session: AsyncSession, conversation_id: str) -> list[Message]:
        result = await session.execute(
            text("SELECT * FROM messages WHERE conversation_id = :conv_id ORDER BY timestamp ASC"),
            {"conv_id": conversation_id}
        )
        rows = result.fetchall()
        return [
            Message(
                id=row.id,
                role=MessageRole(row.role),
                content=row.content,
                timestamp=row.timestamp
            )
            for row in rows
        ]

    async def get_conversation(self, id: str) -> Optional[Conversation]:
        async with self.session_maker() as session:
            result = await session.execute(
                text("SELECT * FROM conversations WHERE id = :id"),
                {"id": id}
            )
            row = result.fetchone()
            
            if not row:
                return None
            
            messages = await self._get_messages(session, id)
            return Conversation(
                id=row.id,
                title=row.title,
                messages=messages,
                endpointId=row.endpoint_id,
                domainId=row.domain_id,
                siteId=row.site_id,
                userEmail=row.user_email,
                createdAt=row.created_at,
                updatedAt=row.updated_at
            )

    async def create_conversation(
        self, endpoint_id: str, title: str,
        domain_id: Optional[str] = None, site_id: Optional[str] = None,
        user_email: Optional[str] = None
    ) -> Conversation:
        conv_id = str(uuid.uuid4())
        now = int(time.time() * 1000)
        
        async with self.session_maker() as session:
            await session.execute(
                text("""INSERT INTO conversations (id, title, endpoint_id, domain_id, site_id, user_email, created_at, updated_at)
                       VALUES (:id, :title, :endpoint_id, :domain_id, :site_id, :user_email, :created_at, :updated_at)"""),
                {
                    "id": conv_id, "title": title, "endpoint_id": endpoint_id,
                    "domain_id": domain_id, "site_id": site_id, "user_email": user_email,
                    "created_at": now, "updated_at": now
                }
            )
            await session.commit()
        
        return Conversation(
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

    async def add_message(self, conversation_id: str, message: InsertMessage) -> Message:
        msg_id = str(uuid.uuid4())
        
        async with self.session_maker() as session:
            await session.execute(
                text("""INSERT INTO messages (id, conversation_id, role, content, timestamp)
                       VALUES (:id, :conv_id, :role, :content, :timestamp)"""),
                {
                    "id": msg_id, "conv_id": conversation_id,
                    "role": message.role.value, "content": message.content,
                    "timestamp": message.timestamp
                }
            )
            await session.execute(
                text("UPDATE conversations SET updated_at = :updated_at WHERE id = :id"),
                {"updated_at": int(time.time() * 1000), "id": conversation_id}
            )
            await session.commit()
        
        return Message(
            id=msg_id,
            role=message.role,
            content=message.content,
            timestamp=message.timestamp
        )

    async def update_conversation(self, id: str, updates: dict) -> Optional[Conversation]:
        async with self.session_maker() as session:
            result = await session.execute(
                text("SELECT * FROM conversations WHERE id = :id"),
                {"id": id}
            )
            if not result.fetchone():
                return None
            
            set_parts = []
            params = {"id": id, "updated_at": int(time.time() * 1000)}
            
            field_mapping = {
                'title': 'title',
                'endpointId': 'endpoint_id',
                'domainId': 'domain_id',
                'siteId': 'site_id'
            }
            
            for key, value in updates.items():
                if key in field_mapping:
                    db_field = field_mapping[key]
                    set_parts.append(f"{db_field} = :{db_field}")
                    params[db_field] = value
            
            set_parts.append("updated_at = :updated_at")
            
            query = f"UPDATE conversations SET {', '.join(set_parts)} WHERE id = :id"
            await session.execute(text(query), params)
            await session.commit()
            
            return await self.get_conversation(id)

    async def delete_conversation(self, id: str) -> bool:
        async with self.session_maker() as session:
            await session.execute(
                text("DELETE FROM messages WHERE conversation_id = :id"),
                {"id": id}
            )
            result = await session.execute(
                text("DELETE FROM conversations WHERE id = :id"),
                {"id": id}
            )
            await session.commit()
            return result.rowcount > 0

    async def get_domains(self) -> list[Domain]:
        return list(self.memory_cache["domains"].values())

    async def get_domain(self, id: str) -> Optional[Domain]:
        return self.memory_cache["domains"].get(id)

    async def create_domain(self, domain: InsertDomain) -> Domain:
        base_id = domain.name.lower().replace(" ", "-")
        base_id = "".join(c for c in base_id if c.isalnum() or c == "-")
        domain_id = base_id
        counter = 1
        while domain_id in self.memory_cache["domains"]:
            domain_id = f"{base_id}-{counter}"
            counter += 1
        
        new_domain = Domain(id=domain_id, **domain.model_dump())
        self.memory_cache["domains"][domain_id] = new_domain
        return new_domain

    async def update_domain(self, id: str, updates: dict) -> Optional[Domain]:
        domain = self.memory_cache["domains"].get(id)
        if not domain:
            return None
        
        updated_data = domain.model_dump()
        updated_data.update(updates)
        updated_domain = Domain(**updated_data)
        self.memory_cache["domains"][id] = updated_domain
        return updated_domain

    async def delete_domain(self, id: str) -> bool:
        if id in self.memory_cache["domains"]:
            del self.memory_cache["domains"][id]
            return True
        return False

    async def get_sites(self) -> list[Site]:
        return list(self.memory_cache["sites"].values())

    async def get_site(self, id: str) -> Optional[Site]:
        return self.memory_cache["sites"].get(id)

    async def get_endpoints(self, domain_id: Optional[str] = None) -> list[Endpoint]:
        all_endpoints = list(self.memory_cache["endpoints"].values())
        if not domain_id or domain_id == "generic":
            return [e for e in all_endpoints if not e.domainId or e.type == EndpointType.foundation]
        return [e for e in all_endpoints if not e.domainId or e.domainId == domain_id or e.type == EndpointType.foundation]

    async def get_endpoint(self, id: str) -> Optional[Endpoint]:
        return self.memory_cache["endpoints"].get(id)

    async def create_endpoint(self, endpoint: InsertEndpoint) -> Endpoint:
        base_id = endpoint.name.lower().replace(" ", "-")
        base_id = "".join(c for c in base_id if c.isalnum() or c == "-")
        endpoint_id = base_id
        counter = 1
        while endpoint_id in self.memory_cache["endpoints"]:
            endpoint_id = f"{base_id}-{counter}"
            counter += 1
        
        new_endpoint = Endpoint(id=endpoint_id, **endpoint.model_dump())
        self.memory_cache["endpoints"][endpoint_id] = new_endpoint
        return new_endpoint

    async def update_endpoint(self, id: str, updates: dict) -> Optional[Endpoint]:
        endpoint = self.memory_cache["endpoints"].get(id)
        if not endpoint:
            return None
        
        updated_data = endpoint.model_dump()
        updated_data.update(updates)
        updated_endpoint = Endpoint(**updated_data)
        self.memory_cache["endpoints"][id] = updated_endpoint
        return updated_endpoint

    async def delete_endpoint(self, id: str) -> bool:
        if id in self.memory_cache["endpoints"]:
            del self.memory_cache["endpoints"][id]
            return True
        return False

    async def get_config(self) -> Config:
        return self.memory_cache["config"]

    async def set_config(self, config: Config) -> Config:
        self.memory_cache["config"] = config
        return self.memory_cache["config"]
