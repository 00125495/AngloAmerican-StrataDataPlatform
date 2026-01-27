import os
import re
from typing import Optional
from uuid import uuid4
import time
from dataclasses import dataclass

from databricks import sql
from databricks.sql.client import Connection, Cursor

from .models import (
    Message, InsertMessage, Conversation, Domain, InsertDomain,
    Site, Endpoint, InsertEndpoint, Config, MessageRole, EndpointType
)
from .storage import IStorage


@dataclass
class LakeBaseConfig:
    server_hostname: str
    http_path: str
    catalog: str
    schema: str
    token: Optional[str] = None
    client_id: Optional[str] = None
    client_secret: Optional[str] = None


def create_lakebase_config() -> Optional[LakeBaseConfig]:
    server_hostname = os.environ.get("DATABRICKS_SERVER_HOSTNAME") or os.environ.get("DATABRICKS_HOST")
    http_path = os.environ.get("DATABRICKS_HTTP_PATH")
    catalog = os.environ.get("DATABRICKS_CATALOG", "main")
    schema = os.environ.get("DATABRICKS_SCHEMA", "anglo_strata")

    if not server_hostname or not http_path:
        return None

    token = os.environ.get("DATABRICKS_TOKEN")
    client_id = os.environ.get("DATABRICKS_CLIENT_ID")
    client_secret = os.environ.get("DATABRICKS_CLIENT_SECRET")

    if not token and (not client_id or not client_secret):
        return None

    hostname = re.sub(r"^https?://", "", server_hostname)

    return LakeBaseConfig(
        server_hostname=hostname,
        http_path=http_path,
        catalog=catalog,
        schema=schema,
        token=token,
        client_id=client_id,
        client_secret=client_secret
    )


class LakeBaseStorage(IStorage):
    def __init__(self, config: LakeBaseConfig):
        self.config = config
        self.connection: Optional[Connection] = None
        self.memory_cache = {
            "domains": {},
            "sites": {},
            "endpoints": {},
            "config": Config()
        }

    def _escape_string(self, value: str) -> str:
        if not value:
            return ""
        return value.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n").replace("\r", "\\r")

    def _escape_id(self, value: str) -> str:
        if not value:
            return ""
        return re.sub(r"[^a-zA-Z0-9_-]", "", value)

    async def initialize(self):
        auth_params = {}
        if self.config.token:
            auth_params["access_token"] = self.config.token
        elif self.config.client_id and self.config.client_secret:
            auth_params["client_id"] = self.config.client_id
            auth_params["client_secret"] = self.config.client_secret

        self.connection = sql.connect(
            server_hostname=self.config.server_hostname,
            http_path=self.config.http_path,
            catalog=self.config.catalog,
            schema=self.config.schema,
            **auth_params
        )

        await self._create_tables()
        await self._load_cache()

    async def _create_tables(self):
        cursor = self.connection.cursor()
        try:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS conversations (
                    id STRING,
                    title STRING,
                    endpoint_id STRING,
                    domain_id STRING,
                    site_id STRING,
                    user_email STRING,
                    created_at BIGINT,
                    updated_at BIGINT
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS messages (
                    id STRING,
                    conversation_id STRING,
                    role STRING,
                    content STRING,
                    timestamp BIGINT
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS domains (
                    id STRING,
                    name STRING,
                    description STRING,
                    system_prompt STRING,
                    icon STRING
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sites (
                    id STRING,
                    name STRING,
                    location STRING,
                    type STRING
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS endpoints (
                    id STRING,
                    name STRING,
                    description STRING,
                    type STRING,
                    is_default BOOLEAN,
                    domain_id STRING
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_config (
                    user_id STRING,
                    default_endpoint_id STRING,
                    default_domain_id STRING,
                    default_site_id STRING,
                    system_prompt STRING
                )
            """)
        finally:
            cursor.close()

    async def _load_cache(self):
        cursor = self.connection.cursor()
        try:
            cursor.execute("SELECT * FROM domains")
            rows = cursor.fetchall()
            if rows:
                for row in rows:
                    domain = Domain(
                        id=row[0], name=row[1], description=row[2],
                        systemPrompt=row[3], icon=row[4]
                    )
                    self.memory_cache["domains"][domain.id] = domain

            cursor.execute("SELECT * FROM sites")
            rows = cursor.fetchall()
            if rows:
                for row in rows:
                    site = Site(id=row[0], name=row[1], location=row[2], type=row[3])
                    self.memory_cache["sites"][site.id] = site

            cursor.execute("SELECT * FROM endpoints")
            rows = cursor.fetchall()
            if rows:
                for row in rows:
                    endpoint = Endpoint(
                        id=row[0], name=row[1], description=row[2],
                        type=EndpointType(row[3]), isDefault=row[4], domainId=row[5]
                    )
                    self.memory_cache["endpoints"][endpoint.id] = endpoint

            if not self.memory_cache["domains"]:
                await self._initialize_default_data()

        finally:
            cursor.close()

    async def _initialize_default_data(self):
        cursor = self.connection.cursor()
        try:
            default_domains = [
                ("generic", "General Assistant", "General-purpose AI assistant for Anglo American", "You are a helpful AI assistant for Anglo American, a global mining company.", "Bot"),
                ("mining-ops", "Mining Operations", "Mining operations, production, and equipment management", "You are a mining operations specialist for Anglo American.", "Pickaxe"),
                ("geological", "Geological Services", "Geological analysis, exploration, and resource estimation", "You are a geological services expert for Anglo American.", "Mountain"),
                ("processing", "Mineral Processing", "Mineral processing and plant optimization", "You are a mineral processing specialist for Anglo American.", "Factory"),
                ("sustainability", "Sustainability & ESG", "Environmental, social, and governance initiatives", "You are a sustainability and ESG advisor for Anglo American.", "Leaf"),
                ("supply-chain", "Supply Chain", "Supply chain, logistics, and procurement", "You are a supply chain specialist for Anglo American.", "Truck"),
                ("finance", "Finance & Analytics", "Financial analysis and business analytics", "You are a finance and analytics specialist for Anglo American.", "BarChart3"),
            ]
            for d in default_domains:
                cursor.execute(f"INSERT INTO domains VALUES ('{d[0]}', '{self._escape_string(d[1])}', '{self._escape_string(d[2])}', '{self._escape_string(d[3])}', '{d[4]}')")
                self.memory_cache["domains"][d[0]] = Domain(id=d[0], name=d[1], description=d[2], systemPrompt=d[3], icon=d[4])

            default_sites = [
                ("all-sites", "All Sites", "Global", "Corporate"),
                ("kumba", "Kumba Iron Ore", "South Africa", "Iron Ore"),
                ("sishen", "Sishen Mine", "Northern Cape, South Africa", "Iron Ore"),
                ("mogalakwena", "Mogalakwena", "Limpopo, South Africa", "PGMs"),
                ("unki", "Unki Mine", "Zimbabwe", "PGMs"),
                ("amandelbult", "Amandelbult", "Limpopo, South Africa", "PGMs"),
                ("quellaveco", "Quellaveco", "Peru", "Copper"),
                ("minas-rio", "Minas-Rio", "Brazil", "Iron Ore"),
                ("los-bronces", "Los Bronces", "Chile", "Copper"),
                ("moranbah", "Moranbah", "Queensland, Australia", "Metallurgical Coal"),
                ("sakatti", "Sakatti", "Finland", "Copper-Nickel"),
                ("woodsmith", "Woodsmith", "UK", "Polyhalite"),
            ]
            for s in default_sites:
                cursor.execute(f"INSERT INTO sites VALUES ('{s[0]}', '{self._escape_string(s[1])}', '{self._escape_string(s[2])}', '{s[3]}')")
                self.memory_cache["sites"][s[0]] = Site(id=s[0], name=s[1], location=s[2], type=s[3])

            default_endpoints = [
                ("databricks-dbrx-instruct", "DBRX Instruct", "Databricks foundation model - fast and capable", "foundation", True, None),
                ("databricks-llama-3-70b", "Llama 3 70B", "Meta's Llama 3 70B model", "foundation", False, None),
                ("databricks-mixtral-8x7b", "Mixtral 8x7B", "Mistral AI mixture of experts", "foundation", False, None),
            ]
            for e in default_endpoints:
                cursor.execute(f"INSERT INTO endpoints VALUES ('{e[0]}', '{self._escape_string(e[1])}', '{self._escape_string(e[2])}', '{e[3]}', {str(e[4]).lower()}, NULL)")
                self.memory_cache["endpoints"][e[0]] = Endpoint(id=e[0], name=e[1], description=e[2], type=EndpointType(e[3]), isDefault=e[4], domainId=e[5])

        finally:
            cursor.close()

    async def get_conversations(self, user_email: Optional[str] = None) -> list[Conversation]:
        cursor = self.connection.cursor()
        try:
            if user_email:
                safe_email = self._escape_string(user_email)
                cursor.execute(f"SELECT * FROM conversations WHERE user_email = '{safe_email}' ORDER BY updated_at DESC")
            else:
                cursor.execute("SELECT * FROM conversations ORDER BY updated_at DESC")
            rows = cursor.fetchall()
            
            conversations = []
            for row in rows:
                cursor.execute(f"SELECT * FROM messages WHERE conversation_id = '{self._escape_id(row[0])}' ORDER BY timestamp ASC")
                message_rows = cursor.fetchall()
                messages = [
                    Message(id=m[0], role=MessageRole(m[2]), content=m[3], timestamp=m[4])
                    for m in message_rows
                ]
                conversations.append(Conversation(
                    id=row[0], title=row[1], messages=messages,
                    endpointId=row[2], domainId=row[3], siteId=row[4],
                    userEmail=row[5], createdAt=row[6], updatedAt=row[7]
                ))
            return conversations
        finally:
            cursor.close()

    async def get_conversation(self, id: str) -> Optional[Conversation]:
        cursor = self.connection.cursor()
        safe_id = self._escape_id(id)
        try:
            cursor.execute(f"SELECT * FROM conversations WHERE id = '{safe_id}'")
            row = cursor.fetchone()
            if not row:
                return None

            cursor.execute(f"SELECT * FROM messages WHERE conversation_id = '{safe_id}' ORDER BY timestamp ASC")
            message_rows = cursor.fetchall()
            messages = [
                Message(id=m[0], role=MessageRole(m[2]), content=m[3], timestamp=m[4])
                for m in message_rows
            ]
            return Conversation(
                id=row[0], title=row[1], messages=messages,
                endpointId=row[2], domainId=row[3], siteId=row[4],
                userEmail=row[5], createdAt=row[6], updatedAt=row[7]
            )
        finally:
            cursor.close()

    async def create_conversation(
        self, endpoint_id: str, title: str,
        domain_id: Optional[str] = None, site_id: Optional[str] = None,
        user_email: Optional[str] = None
    ) -> Conversation:
        cursor = self.connection.cursor()
        conv_id = str(uuid4())
        now = int(time.time() * 1000)
        safe_endpoint = self._escape_id(endpoint_id)
        safe_domain = self._escape_id(domain_id) if domain_id else None
        safe_site = self._escape_id(site_id) if site_id else None
        safe_email = self._escape_string(user_email) if user_email else None

        try:
            cursor.execute(f"""
                INSERT INTO conversations VALUES (
                    '{conv_id}', '{self._escape_string(title)}', '{safe_endpoint}',
                    {f"'{safe_domain}'" if safe_domain else "NULL"},
                    {f"'{safe_site}'" if safe_site else "NULL"},
                    {f"'{safe_email}'" if safe_email else "NULL"},
                    {now}, {now}
                )
            """)
            return Conversation(
                id=conv_id, title=title, messages=[],
                endpointId=endpoint_id, domainId=domain_id, siteId=site_id,
                userEmail=user_email, createdAt=now, updatedAt=now
            )
        finally:
            cursor.close()

    async def add_message(self, conversation_id: str, message: InsertMessage) -> Message:
        cursor = self.connection.cursor()
        msg_id = str(uuid4())
        safe_conv_id = self._escape_id(conversation_id)
        safe_role = message.role.value if message.role.value in ["user", "assistant", "system"] else "user"

        try:
            cursor.execute(f"""
                INSERT INTO messages VALUES (
                    '{msg_id}', '{safe_conv_id}', '{safe_role}',
                    '{self._escape_string(message.content)}', {message.timestamp}
                )
            """)
            cursor.execute(f"UPDATE conversations SET updated_at = {int(time.time() * 1000)} WHERE id = '{safe_conv_id}'")
            return Message(id=msg_id, role=message.role, content=message.content, timestamp=message.timestamp)
        finally:
            cursor.close()

    async def update_conversation(self, id: str, updates: dict) -> Optional[Conversation]:
        cursor = self.connection.cursor()
        safe_id = self._escape_id(id)
        
        set_clauses = []
        if "title" in updates:
            set_clauses.append(f"title = '{self._escape_string(updates['title'])}'")
        if "endpointId" in updates:
            set_clauses.append(f"endpoint_id = '{self._escape_id(updates['endpointId'])}'")
        if "domainId" in updates:
            val = updates["domainId"]
            domain_val = f"'{self._escape_id(val)}'" if val else "NULL"
            set_clauses.append(f"domain_id = {domain_val}")
        if "siteId" in updates:
            val = updates["siteId"]
            site_val = f"'{self._escape_id(val)}'" if val else "NULL"
            set_clauses.append(f"site_id = {site_val}")
        set_clauses.append(f"updated_at = {int(time.time() * 1000)}")

        try:
            cursor.execute(f"UPDATE conversations SET {', '.join(set_clauses)} WHERE id = '{safe_id}'")
            return await self.get_conversation(id)
        finally:
            cursor.close()

    async def delete_conversation(self, id: str) -> bool:
        cursor = self.connection.cursor()
        safe_id = self._escape_id(id)
        try:
            cursor.execute(f"DELETE FROM messages WHERE conversation_id = '{safe_id}'")
            cursor.execute(f"DELETE FROM conversations WHERE id = '{safe_id}'")
            return True
        finally:
            cursor.close()

    async def get_domains(self) -> list[Domain]:
        return list(self.memory_cache["domains"].values())

    async def get_domain(self, id: str) -> Optional[Domain]:
        return self.memory_cache["domains"].get(id)

    async def create_domain(self, domain: InsertDomain) -> Domain:
        cursor = self.connection.cursor()
        base_id = re.sub(r"[^a-z0-9-]", "", domain.name.lower().replace(" ", "-"))
        domain_id = base_id
        counter = 1
        while domain_id in self.memory_cache["domains"]:
            domain_id = f"{base_id}-{counter}"
            counter += 1

        try:
            cursor.execute(f"""
                INSERT INTO domains VALUES (
                    '{domain_id}', '{self._escape_string(domain.name)}',
                    '{self._escape_string(domain.description)}',
                    '{self._escape_string(domain.systemPrompt)}',
                    '{self._escape_string(domain.icon or "")}'
                )
            """)
            new_domain = Domain(id=domain_id, **domain.model_dump())
            self.memory_cache["domains"][domain_id] = new_domain
            return new_domain
        finally:
            cursor.close()

    async def update_domain(self, id: str, updates: dict) -> Optional[Domain]:
        domain = self.memory_cache["domains"].get(id)
        if not domain:
            return None

        cursor = self.connection.cursor()
        safe_id = self._escape_id(id)
        set_clauses = []
        if "name" in updates:
            set_clauses.append(f"name = '{self._escape_string(updates['name'])}'")
        if "description" in updates:
            set_clauses.append(f"description = '{self._escape_string(updates['description'] or '')}'")
        if "systemPrompt" in updates:
            set_clauses.append(f"system_prompt = '{self._escape_string(updates['systemPrompt'] or '')}'")
        if "icon" in updates:
            set_clauses.append(f"icon = '{self._escape_string(updates['icon'] or '')}'")

        try:
            if set_clauses:
                cursor.execute(f"UPDATE domains SET {', '.join(set_clauses)} WHERE id = '{safe_id}'")
            
            updated_data = domain.model_dump()
            updated_data.update(updates)
            updated_domain = Domain(**updated_data)
            self.memory_cache["domains"][id] = updated_domain
            return updated_domain
        finally:
            cursor.close()

    async def delete_domain(self, id: str) -> bool:
        cursor = self.connection.cursor()
        safe_id = self._escape_id(id)
        try:
            cursor.execute(f"DELETE FROM domains WHERE id = '{safe_id}'")
            if id in self.memory_cache["domains"]:
                del self.memory_cache["domains"][id]
                return True
            return False
        finally:
            cursor.close()

    async def refresh_endpoints_from_databricks(self) -> list[Endpoint]:
        from .databricks_client import databricks_client
        
        if not databricks_client.is_configured():
            print("Databricks not configured, keeping cached endpoints")
            return list(self.memory_cache["endpoints"].values())
        
        try:
            db_endpoints = await databricks_client.list_serving_endpoints()
            
            if db_endpoints:
                self.memory_cache["endpoints"].clear()
                for endpoint in db_endpoints:
                    self.memory_cache["endpoints"][endpoint.id] = endpoint
                print(f"Loaded {len(db_endpoints)} endpoints from Databricks")
            else:
                print("No endpoints from Databricks, keeping cached endpoints")
                
        except Exception as e:
            print(f"Error refreshing endpoints from Databricks: {e}")
            
        return list(self.memory_cache["endpoints"].values())

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
        cursor = self.connection.cursor()
        base_id = re.sub(r"[^a-z0-9-]", "", endpoint.name.lower().replace(" ", "-"))
        endpoint_id = base_id
        counter = 1
        while endpoint_id in self.memory_cache["endpoints"]:
            endpoint_id = f"{base_id}-{counter}"
            counter += 1

        safe_type = endpoint.type.value if endpoint.type.value in ["foundation", "custom", "agent"] else "custom"
        safe_domain = self._escape_id(endpoint.domainId) if endpoint.domainId else None

        try:
            cursor.execute(f"""
                INSERT INTO endpoints VALUES (
                    '{endpoint_id}', '{self._escape_string(endpoint.name)}',
                    '{self._escape_string(endpoint.description)}', '{safe_type}',
                    {str(endpoint.isDefault).lower()},
                    {f"'{safe_domain}'" if safe_domain else "NULL"}
                )
            """)
            new_endpoint = Endpoint(id=endpoint_id, **endpoint.model_dump())
            self.memory_cache["endpoints"][endpoint_id] = new_endpoint
            return new_endpoint
        finally:
            cursor.close()

    async def update_endpoint(self, id: str, updates: dict) -> Optional[Endpoint]:
        endpoint = self.memory_cache["endpoints"].get(id)
        if not endpoint:
            return None

        cursor = self.connection.cursor()
        safe_id = self._escape_id(id)
        set_clauses = []
        if "name" in updates:
            set_clauses.append(f"name = '{self._escape_string(updates['name'])}'")
        if "description" in updates:
            set_clauses.append(f"description = '{self._escape_string(updates['description'] or '')}'")
        if "type" in updates:
            safe_type = updates["type"].value if hasattr(updates["type"], "value") else updates["type"]
            if safe_type in ["foundation", "custom", "agent"]:
                set_clauses.append(f"type = '{safe_type}'")
        if "isDefault" in updates:
            set_clauses.append(f"is_default = {str(updates['isDefault']).lower()}")
        if "domainId" in updates:
            val = updates["domainId"]
            domain_val = f"'{self._escape_id(val)}'" if val else "NULL"
            set_clauses.append(f"domain_id = {domain_val}")

        try:
            if set_clauses:
                cursor.execute(f"UPDATE endpoints SET {', '.join(set_clauses)} WHERE id = '{safe_id}'")
            
            updated_data = endpoint.model_dump()
            updated_data.update(updates)
            updated_endpoint = Endpoint(**updated_data)
            self.memory_cache["endpoints"][id] = updated_endpoint
            return updated_endpoint
        finally:
            cursor.close()

    async def delete_endpoint(self, id: str) -> bool:
        cursor = self.connection.cursor()
        safe_id = self._escape_id(id)
        try:
            cursor.execute(f"DELETE FROM endpoints WHERE id = '{safe_id}'")
            if id in self.memory_cache["endpoints"]:
                del self.memory_cache["endpoints"][id]
                return True
            return False
        finally:
            cursor.close()

    async def get_config(self) -> Config:
        return self.memory_cache["config"]

    async def set_config(self, config: Config) -> Config:
        self.memory_cache["config"] = config
        return config

    async def close(self):
        if self.connection:
            self.connection.close()
