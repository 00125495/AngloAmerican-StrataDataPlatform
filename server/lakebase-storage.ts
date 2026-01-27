import { DBSQLClient } from "@databricks/sql";
import { randomUUID } from "crypto";
import type {
  Conversation,
  Message,
  Endpoint,
  Domain,
  Site,
  Config,
  InsertDomain,
  InsertEndpoint,
} from "@shared/schema";
import type { IStorage } from "./storage";

interface LakeBaseConfig {
  serverHostname: string;
  httpPath: string;
  catalog: string;
  schema: string;
  clientId?: string;
  clientSecret?: string;
  token?: string;
}

export class LakeBaseStorage implements IStorage {
  private client: DBSQLClient;
  private session: any = null;
  private config: LakeBaseConfig;
  private initialized = false;
  private memoryCache: {
    domains: Map<string, Domain>;
    sites: Map<string, Site>;
    endpoints: Map<string, Endpoint>;
    config: Config;
  };

  constructor(config: LakeBaseConfig) {
    this.config = config;
    this.client = new DBSQLClient();
    this.memoryCache = {
      domains: new Map(),
      sites: new Map(),
      endpoints: new Map(),
      config: {
        systemPrompt: "You are a helpful AI assistant for Anglo American.",
      },
    };
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const connectionOptions: any = {
      host: this.config.serverHostname,
      path: this.config.httpPath,
    };

    if (this.config.token) {
      connectionOptions.token = this.config.token;
    } else if (this.config.clientId && this.config.clientSecret) {
      connectionOptions.authType = "databricks-oauth";
      connectionOptions.oauthClientId = this.config.clientId;
      connectionOptions.oauthClientSecret = this.config.clientSecret;
    }

    await this.client.connect(connectionOptions);
    this.session = await this.client.openSession({
      initialCatalog: this.config.catalog,
      initialSchema: this.config.schema,
    });

    await this.createTablesIfNotExist();
    await this.initializeDefaultData();
    this.initialized = true;
  }

  private async createTablesIfNotExist(): Promise<void> {
    if (!this.session) throw new Error("Session not initialized");

    const tableQueries = [
      `CREATE TABLE IF NOT EXISTS conversations (
        id STRING,
        title STRING,
        endpoint_id STRING,
        domain_id STRING,
        site_id STRING,
        created_at BIGINT,
        updated_at BIGINT
      )`,
      `CREATE TABLE IF NOT EXISTS messages (
        id STRING,
        conversation_id STRING,
        role STRING,
        content STRING,
        timestamp BIGINT
      )`,
      `CREATE TABLE IF NOT EXISTS domains (
        id STRING,
        name STRING,
        description STRING,
        system_prompt STRING,
        icon STRING
      )`,
      `CREATE TABLE IF NOT EXISTS sites (
        id STRING,
        name STRING,
        location STRING,
        type STRING
      )`,
      `CREATE TABLE IF NOT EXISTS endpoints (
        id STRING,
        name STRING,
        description STRING,
        type STRING,
        is_default BOOLEAN,
        domain_id STRING
      )`,
      `CREATE TABLE IF NOT EXISTS user_config (
        user_id STRING,
        default_endpoint_id STRING,
        default_domain_id STRING,
        default_site_id STRING,
        system_prompt STRING
      )`,
    ];

    for (const query of tableQueries) {
      const operation = await this.session.executeStatement(query);
      await operation.close();
    }
  }

  private async initializeDefaultData(): Promise<void> {
    await this.initializeDefaultDomains();
    await this.initializeDefaultSites();
    await this.initializeDefaultEndpoints();
  }

  private async initializeDefaultDomains(): Promise<void> {
    if (!this.session) throw new Error("Session not initialized");

    const checkOp = await this.session.executeStatement(
      `SELECT COUNT(*) as cnt FROM domains`
    );
    const result = await checkOp.fetchAll();
    await checkOp.close();

    if (result && result[0] && Number(result[0].cnt) > 0) {
      const domainsOp = await this.session.executeStatement(`SELECT * FROM domains`);
      const domainsResult = await domainsOp.fetchAll();
      await domainsOp.close();
      domainsResult.forEach((row: any) => {
        this.memoryCache.domains.set(row.id, {
          id: row.id,
          name: row.name,
          description: row.description,
          systemPrompt: row.system_prompt,
          icon: row.icon,
        });
      });
      return;
    }

    const defaultDomains: Domain[] = [
      {
        id: "generic",
        name: "General Assistant",
        description: "General purpose AI assistant for any queries",
        systemPrompt: "You are a helpful AI assistant for Anglo American. Provide clear, accurate, and helpful responses.",
        icon: "Bot",
      },
      {
        id: "mining-ops",
        name: "Mining Operations",
        description: "Mining operations, production, and safety analytics",
        systemPrompt: "You are an expert AI assistant specializing in mining operations for Anglo American.",
        icon: "HardHat",
      },
      {
        id: "geological",
        name: "Geological Services",
        description: "Geological surveys, ore body analysis, and exploration",
        systemPrompt: "You are a geological expert AI for Anglo American.",
        icon: "Mountain",
      },
      {
        id: "processing",
        name: "Mineral Processing",
        description: "Ore processing, metallurgy, and plant operations",
        systemPrompt: "You are a mineral processing specialist AI for Anglo American.",
        icon: "Factory",
      },
      {
        id: "sustainability",
        name: "Sustainability & ESG",
        description: "Environmental, social, and governance reporting",
        systemPrompt: "You are a sustainability expert AI for Anglo American.",
        icon: "Leaf",
      },
      {
        id: "supply-chain",
        name: "Supply Chain",
        description: "Logistics, procurement, and supply chain analytics",
        systemPrompt: "You are a supply chain specialist AI for Anglo American.",
        icon: "Truck",
      },
      {
        id: "finance",
        name: "Finance & Analytics",
        description: "Financial analysis, budgeting, and cost optimization",
        systemPrompt: "You are a financial analyst AI for Anglo American.",
        icon: "TrendingUp",
      },
    ];

    for (const domain of defaultDomains) {
      const insertOp = await this.session.executeStatement(
        `INSERT INTO domains VALUES ('${domain.id}', '${this.escapeString(domain.name)}', '${this.escapeString(domain.description || "")}', '${this.escapeString(domain.systemPrompt || "")}', '${domain.icon || ""}')`
      );
      await insertOp.close();
      this.memoryCache.domains.set(domain.id, domain);
    }
  }

  private async initializeDefaultSites(): Promise<void> {
    if (!this.session) throw new Error("Session not initialized");

    const checkOp = await this.session.executeStatement(
      `SELECT COUNT(*) as cnt FROM sites`
    );
    const result = await checkOp.fetchAll();
    await checkOp.close();

    if (result && result[0] && Number(result[0].cnt) > 0) {
      const sitesOp = await this.session.executeStatement(`SELECT * FROM sites`);
      const sitesResult = await sitesOp.fetchAll();
      await sitesOp.close();
      sitesResult.forEach((row: any) => {
        this.memoryCache.sites.set(row.id, {
          id: row.id,
          name: row.name,
          location: row.location,
          type: row.type,
        });
      });
      return;
    }

    const defaultSites: Site[] = [
      { id: "all-sites", name: "All Sites", location: "Global", type: "global" },
      { id: "kumba", name: "Kumba Iron Ore", location: "South Africa", type: "iron-ore" },
      { id: "sishen", name: "Sishen Mine", location: "Northern Cape, South Africa", type: "iron-ore" },
      { id: "mogalakwena", name: "Mogalakwena PGMs", location: "Limpopo, South Africa", type: "platinum" },
      { id: "amandelbult", name: "Amandelbult Complex", location: "Limpopo, South Africa", type: "platinum" },
      { id: "minas-rio", name: "Minas-Rio", location: "Brazil", type: "iron-ore" },
      { id: "quellaveco", name: "Quellaveco", location: "Peru", type: "copper" },
      { id: "los-bronces", name: "Los Bronces", location: "Chile", type: "copper" },
      { id: "moranbah", name: "Moranbah North", location: "Queensland, Australia", type: "metallurgical-coal" },
    ];

    for (const site of defaultSites) {
      const insertOp = await this.session.executeStatement(
        `INSERT INTO sites VALUES ('${site.id}', '${this.escapeString(site.name)}', '${this.escapeString(site.location)}', '${site.type}')`
      );
      await insertOp.close();
      this.memoryCache.sites.set(site.id, site);
    }
  }

  private async initializeDefaultEndpoints(): Promise<void> {
    if (!this.session) throw new Error("Session not initialized");

    const checkOp = await this.session.executeStatement(
      `SELECT COUNT(*) as cnt FROM endpoints`
    );
    const result = await checkOp.fetchAll();
    await checkOp.close();

    if (result && result[0] && Number(result[0].cnt) > 0) {
      const endpointsOp = await this.session.executeStatement(`SELECT * FROM endpoints`);
      const endpointsResult = await endpointsOp.fetchAll();
      await endpointsOp.close();
      endpointsResult.forEach((row: any) => {
        this.memoryCache.endpoints.set(row.id, {
          id: row.id,
          name: row.name,
          description: row.description,
          type: row.type,
          isDefault: row.is_default,
          domainId: row.domain_id || undefined,
        });
      });
      return;
    }

    const defaultEndpoints: Endpoint[] = [
      { id: "gpt-4-turbo", name: "GPT-4 Turbo", description: "OpenAI GPT-4 Turbo", type: "foundation", isDefault: true },
      { id: "claude-3-5-sonnet", name: "Claude 3.5 Sonnet", description: "Anthropic Claude", type: "foundation", isDefault: false },
      { id: "llama-3-1-70b", name: "Llama 3.1 70B", description: "Meta Llama", type: "foundation", isDefault: false },
    ];

    for (const endpoint of defaultEndpoints) {
      const insertOp = await this.session.executeStatement(
        `INSERT INTO endpoints VALUES ('${endpoint.id}', '${this.escapeString(endpoint.name)}', '${this.escapeString(endpoint.description || "")}', '${endpoint.type}', ${endpoint.isDefault || false}, ${endpoint.domainId ? `'${endpoint.domainId}'` : "NULL"})`
      );
      await insertOp.close();
      this.memoryCache.endpoints.set(endpoint.id, endpoint);
    }
  }

  private escapeString(str: string): string {
    return str.replace(/'/g, "''").replace(/\\/g, "\\\\");
  }

  async getConversations(): Promise<Conversation[]> {
    if (!this.session) throw new Error("Session not initialized");

    const op = await this.session.executeStatement(
      `SELECT * FROM conversations ORDER BY updated_at DESC`
    );
    const rows = await op.fetchAll();
    await op.close();

    const conversations: Conversation[] = [];
    for (const row of rows as any[]) {
      const messagesOp = await this.session.executeStatement(
        `SELECT * FROM messages WHERE conversation_id = '${row.id}' ORDER BY timestamp ASC`
      );
      const messagesRows = await messagesOp.fetchAll();
      await messagesOp.close();

      conversations.push({
        id: row.id,
        title: row.title,
        endpointId: row.endpoint_id,
        domainId: row.domain_id || undefined,
        siteId: row.site_id || undefined,
        createdAt: Number(row.created_at),
        updatedAt: Number(row.updated_at),
        messages: (messagesRows as any[]).map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: Number(m.timestamp),
        })),
      });
    }

    return conversations;
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    if (!this.session) throw new Error("Session not initialized");

    const op = await this.session.executeStatement(
      `SELECT * FROM conversations WHERE id = '${id}'`
    );
    const rows = await op.fetchAll();
    await op.close();

    if (!rows || rows.length === 0) return undefined;

    const row = rows[0] as any;
    const messagesOp = await this.session.executeStatement(
      `SELECT * FROM messages WHERE conversation_id = '${id}' ORDER BY timestamp ASC`
    );
    const messagesRows = await messagesOp.fetchAll();
    await messagesOp.close();

    return {
      id: row.id,
      title: row.title,
      endpointId: row.endpoint_id,
      domainId: row.domain_id || undefined,
      siteId: row.site_id || undefined,
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at),
      messages: (messagesRows as any[]).map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: Number(m.timestamp),
      })),
    };
  }

  async createConversation(endpointId: string, title: string, domainId?: string, siteId?: string): Promise<Conversation> {
    if (!this.session) throw new Error("Session not initialized");

    const id = randomUUID();
    const now = Date.now();

    const op = await this.session.executeStatement(
      `INSERT INTO conversations VALUES ('${id}', '${this.escapeString(title)}', '${endpointId}', ${domainId ? `'${domainId}'` : "NULL"}, ${siteId ? `'${siteId}'` : "NULL"}, ${now}, ${now})`
    );
    await op.close();

    return {
      id,
      title,
      endpointId,
      domainId,
      siteId,
      createdAt: now,
      updatedAt: now,
      messages: [],
    };
  }

  async addMessage(conversationId: string, message: Omit<Message, "id">): Promise<Message> {
    if (!this.session) throw new Error("Session not initialized");

    const id = randomUUID();
    const newMessage: Message = { ...message, id };

    const op = await this.session.executeStatement(
      `INSERT INTO messages VALUES ('${id}', '${conversationId}', '${message.role}', '${this.escapeString(message.content)}', ${message.timestamp})`
    );
    await op.close();

    const updateOp = await this.session.executeStatement(
      `UPDATE conversations SET updated_at = ${Date.now()} WHERE id = '${conversationId}'`
    );
    await updateOp.close();

    return newMessage;
  }

  async updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation | undefined> {
    if (!this.session) throw new Error("Session not initialized");

    const setClauses: string[] = [];
    if (updates.title) setClauses.push(`title = '${this.escapeString(updates.title)}'`);
    if (updates.endpointId) setClauses.push(`endpoint_id = '${updates.endpointId}'`);
    if (updates.domainId !== undefined) setClauses.push(`domain_id = ${updates.domainId ? `'${updates.domainId}'` : "NULL"}`);
    if (updates.siteId !== undefined) setClauses.push(`site_id = ${updates.siteId ? `'${updates.siteId}'` : "NULL"}`);
    setClauses.push(`updated_at = ${Date.now()}`);

    const op = await this.session.executeStatement(
      `UPDATE conversations SET ${setClauses.join(", ")} WHERE id = '${id}'`
    );
    await op.close();

    return this.getConversation(id);
  }

  async deleteConversation(id: string): Promise<boolean> {
    if (!this.session) throw new Error("Session not initialized");

    const msgOp = await this.session.executeStatement(
      `DELETE FROM messages WHERE conversation_id = '${id}'`
    );
    await msgOp.close();

    const op = await this.session.executeStatement(
      `DELETE FROM conversations WHERE id = '${id}'`
    );
    await op.close();

    return true;
  }

  async getDomains(): Promise<Domain[]> {
    return Array.from(this.memoryCache.domains.values());
  }

  async getDomain(id: string): Promise<Domain | undefined> {
    return this.memoryCache.domains.get(id);
  }

  async createDomain(domain: InsertDomain): Promise<Domain> {
    if (!this.session) throw new Error("Session not initialized");

    let baseId = domain.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    let id = baseId;
    let counter = 1;
    while (this.memoryCache.domains.has(id)) {
      id = `${baseId}-${counter}`;
      counter++;
    }

    const newDomain: Domain = { id, ...domain };
    const op = await this.session.executeStatement(
      `INSERT INTO domains VALUES ('${id}', '${this.escapeString(domain.name)}', '${this.escapeString(domain.description || "")}', '${this.escapeString(domain.systemPrompt || "")}', '${domain.icon || ""}')`
    );
    await op.close();

    this.memoryCache.domains.set(id, newDomain);
    return newDomain;
  }

  async updateDomain(id: string, updates: Partial<InsertDomain>): Promise<Domain | undefined> {
    if (!this.session) throw new Error("Session not initialized");

    const domain = this.memoryCache.domains.get(id);
    if (!domain) return undefined;

    const setClauses: string[] = [];
    if (updates.name) setClauses.push(`name = '${this.escapeString(updates.name)}'`);
    if (updates.description !== undefined) setClauses.push(`description = '${this.escapeString(updates.description || "")}'`);
    if (updates.systemPrompt !== undefined) setClauses.push(`system_prompt = '${this.escapeString(updates.systemPrompt || "")}'`);
    if (updates.icon !== undefined) setClauses.push(`icon = '${updates.icon || ""}'`);

    if (setClauses.length > 0) {
      const op = await this.session.executeStatement(
        `UPDATE domains SET ${setClauses.join(", ")} WHERE id = '${id}'`
      );
      await op.close();
    }

    const updated = { ...domain, ...updates };
    this.memoryCache.domains.set(id, updated);
    return updated;
  }

  async deleteDomain(id: string): Promise<boolean> {
    if (!this.session) throw new Error("Session not initialized");

    const op = await this.session.executeStatement(`DELETE FROM domains WHERE id = '${id}'`);
    await op.close();

    return this.memoryCache.domains.delete(id);
  }

  async getSites(): Promise<Site[]> {
    return Array.from(this.memoryCache.sites.values());
  }

  async getSite(id: string): Promise<Site | undefined> {
    return this.memoryCache.sites.get(id);
  }

  async getEndpoints(domainId?: string): Promise<Endpoint[]> {
    const allEndpoints = Array.from(this.memoryCache.endpoints.values());
    if (!domainId || domainId === "generic") {
      return allEndpoints.filter(e => !e.domainId || e.type === "foundation");
    }
    return allEndpoints.filter(e => !e.domainId || e.domainId === domainId || e.type === "foundation");
  }

  async getEndpoint(id: string): Promise<Endpoint | undefined> {
    return this.memoryCache.endpoints.get(id);
  }

  async createEndpoint(endpoint: InsertEndpoint): Promise<Endpoint> {
    if (!this.session) throw new Error("Session not initialized");

    let baseId = endpoint.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    let id = baseId;
    let counter = 1;
    while (this.memoryCache.endpoints.has(id)) {
      id = `${baseId}-${counter}`;
      counter++;
    }

    const newEndpoint: Endpoint = { id, ...endpoint };
    const op = await this.session.executeStatement(
      `INSERT INTO endpoints VALUES ('${id}', '${this.escapeString(endpoint.name)}', '${this.escapeString(endpoint.description || "")}', '${endpoint.type}', ${endpoint.isDefault || false}, ${endpoint.domainId ? `'${endpoint.domainId}'` : "NULL"})`
    );
    await op.close();

    this.memoryCache.endpoints.set(id, newEndpoint);
    return newEndpoint;
  }

  async updateEndpoint(id: string, updates: Partial<InsertEndpoint>): Promise<Endpoint | undefined> {
    if (!this.session) throw new Error("Session not initialized");

    const endpoint = this.memoryCache.endpoints.get(id);
    if (!endpoint) return undefined;

    const setClauses: string[] = [];
    if (updates.name) setClauses.push(`name = '${this.escapeString(updates.name)}'`);
    if (updates.description !== undefined) setClauses.push(`description = '${this.escapeString(updates.description || "")}'`);
    if (updates.type) setClauses.push(`type = '${updates.type}'`);
    if (updates.isDefault !== undefined) setClauses.push(`is_default = ${updates.isDefault}`);
    if (updates.domainId !== undefined) setClauses.push(`domain_id = ${updates.domainId ? `'${updates.domainId}'` : "NULL"}`);

    if (setClauses.length > 0) {
      const op = await this.session.executeStatement(
        `UPDATE endpoints SET ${setClauses.join(", ")} WHERE id = '${id}'`
      );
      await op.close();
    }

    const updated = { ...endpoint, ...updates };
    this.memoryCache.endpoints.set(id, updated);
    return updated;
  }

  async deleteEndpoint(id: string): Promise<boolean> {
    if (!this.session) throw new Error("Session not initialized");

    const op = await this.session.executeStatement(`DELETE FROM endpoints WHERE id = '${id}'`);
    await op.close();

    return this.memoryCache.endpoints.delete(id);
  }

  async getConfig(): Promise<Config> {
    return this.memoryCache.config;
  }

  async setConfig(config: Config): Promise<Config> {
    this.memoryCache.config = { ...this.memoryCache.config, ...config };
    return this.memoryCache.config;
  }

  async close(): Promise<void> {
    if (this.session) {
      await this.session.close();
    }
    await this.client.close();
  }
}

export function createLakeBaseConfig(): LakeBaseConfig | null {
  const serverHostname = process.env.DATABRICKS_SERVER_HOSTNAME || process.env.DATABRICKS_HOST;
  const httpPath = process.env.DATABRICKS_HTTP_PATH;
  const catalog = process.env.DATABRICKS_CATALOG || "main";
  const schema = process.env.DATABRICKS_SCHEMA || "anglo_strata";

  if (!serverHostname || !httpPath) {
    return null;
  }

  const token = process.env.DATABRICKS_TOKEN;
  const clientId = process.env.DATABRICKS_CLIENT_ID;
  const clientSecret = process.env.DATABRICKS_CLIENT_SECRET;

  if (!token && (!clientId || !clientSecret)) {
    return null;
  }

  return {
    serverHostname: serverHostname.replace(/^https?:\/\//, ""),
    httpPath,
    catalog,
    schema,
    token,
    clientId,
    clientSecret,
  };
}
