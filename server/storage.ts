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

export interface IStorage {
  getConversations(): Promise<Conversation[]>;
  getConversation(id: string): Promise<Conversation | undefined>;
  createConversation(endpointId: string, title: string, domainId?: string, siteId?: string): Promise<Conversation>;
  addMessage(conversationId: string, message: Omit<Message, "id">): Promise<Message>;
  updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation | undefined>;
  deleteConversation(id: string): Promise<boolean>;
  
  getDomains(): Promise<Domain[]>;
  getDomain(id: string): Promise<Domain | undefined>;
  createDomain(domain: InsertDomain): Promise<Domain>;
  updateDomain(id: string, updates: Partial<InsertDomain>): Promise<Domain | undefined>;
  deleteDomain(id: string): Promise<boolean>;
  
  getSites(): Promise<Site[]>;
  getSite(id: string): Promise<Site | undefined>;
  
  getEndpoints(domainId?: string): Promise<Endpoint[]>;
  getEndpoint(id: string): Promise<Endpoint | undefined>;
  createEndpoint(endpoint: InsertEndpoint): Promise<Endpoint>;
  updateEndpoint(id: string, updates: Partial<InsertEndpoint>): Promise<Endpoint | undefined>;
  deleteEndpoint(id: string): Promise<boolean>;
  
  getConfig(): Promise<Config>;
  setConfig(config: Config): Promise<Config>;
}

export class MemStorage implements IStorage {
  private conversations: Map<string, Conversation>;
  private endpoints: Map<string, Endpoint>;
  private domains: Map<string, Domain>;
  private sites: Map<string, Site>;
  private config: Config;

  constructor() {
    this.conversations = new Map();
    this.endpoints = new Map();
    this.domains = new Map();
    this.sites = new Map();
    this.config = {
      systemPrompt: "You are a helpful AI assistant for Anglo American. Provide clear, accurate, and helpful responses based on the conversation context.",
    };

    this.initializeDefaultDomains();
    this.initializeDefaultSites();
    this.initializeDefaultEndpoints();
  }

  private initializeDefaultDomains() {
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
        systemPrompt: "You are an expert AI assistant specializing in mining operations for Anglo American. Help with production metrics, equipment performance, shift planning, safety protocols, and operational efficiency. Provide data-driven insights for mining operations.",
        icon: "HardHat",
      },
      {
        id: "geological",
        name: "Geological Services",
        description: "Geological surveys, ore body analysis, and exploration",
        systemPrompt: "You are a geological expert AI for Anglo American. Assist with geological survey analysis, ore body modeling, mineral exploration data, grade control, and geological mapping. Provide scientific insights based on geological data.",
        icon: "Mountain",
      },
      {
        id: "processing",
        name: "Mineral Processing",
        description: "Ore processing, metallurgy, and plant operations",
        systemPrompt: "You are a mineral processing specialist AI for Anglo American. Help with ore processing optimization, metallurgical analysis, plant throughput, recovery rates, and processing efficiency. Focus on improving extraction and processing outcomes.",
        icon: "Factory",
      },
      {
        id: "sustainability",
        name: "Sustainability & ESG",
        description: "Environmental, social, and governance reporting",
        systemPrompt: "You are a sustainability expert AI for Anglo American. Assist with ESG reporting, environmental impact assessments, carbon footprint analysis, water management, community relations, and sustainability metrics. Help drive responsible mining practices.",
        icon: "Leaf",
      },
      {
        id: "supply-chain",
        name: "Supply Chain",
        description: "Logistics, procurement, and supply chain analytics",
        systemPrompt: "You are a supply chain specialist AI for Anglo American. Help with logistics optimization, procurement analytics, inventory management, vendor performance, and supply chain efficiency. Provide insights to streamline operations.",
        icon: "Truck",
      },
      {
        id: "finance",
        name: "Finance & Analytics",
        description: "Financial analysis, budgeting, and cost optimization",
        systemPrompt: "You are a financial analyst AI for Anglo American. Assist with financial reporting, cost analysis, budget forecasting, capital allocation, and financial performance metrics. Help optimize financial outcomes for mining operations.",
        icon: "TrendingUp",
      },
    ];

    defaultDomains.forEach((domain) => {
      this.domains.set(domain.id, domain);
    });
  }

  private initializeDefaultSites() {
    const defaultSites: Site[] = [
      {
        id: "all-sites",
        name: "All Sites",
        location: "Global",
        type: "global",
      },
      {
        id: "kumba",
        name: "Kumba Iron Ore",
        location: "South Africa",
        type: "iron-ore",
      },
      {
        id: "sishen",
        name: "Sishen Mine",
        location: "Northern Cape, South Africa",
        type: "iron-ore",
      },
      {
        id: "kolomela",
        name: "Kolomela Mine",
        location: "Northern Cape, South Africa",
        type: "iron-ore",
      },
      {
        id: "mogalakwena",
        name: "Mogalakwena PGMs",
        location: "Limpopo, South Africa",
        type: "platinum",
      },
      {
        id: "amandelbult",
        name: "Amandelbult Complex",
        location: "Limpopo, South Africa",
        type: "platinum",
      },
      {
        id: "minas-rio",
        name: "Minas-Rio",
        location: "Brazil",
        type: "iron-ore",
      },
      {
        id: "quellaveco",
        name: "Quellaveco",
        location: "Peru",
        type: "copper",
      },
      {
        id: "los-bronces",
        name: "Los Bronces",
        location: "Chile",
        type: "copper",
      },
      {
        id: "moranbah",
        name: "Moranbah North",
        location: "Queensland, Australia",
        type: "metallurgical-coal",
      },
      {
        id: "grosvenor",
        name: "Grosvenor",
        location: "Queensland, Australia",
        type: "metallurgical-coal",
      },
    ];

    defaultSites.forEach((site) => {
      this.sites.set(site.id, site);
    });
  }

  private initializeDefaultEndpoints() {
    const defaultEndpoints: Endpoint[] = [
      {
        id: "gpt-4-turbo",
        name: "GPT-4 Turbo",
        description: "OpenAI GPT-4 Turbo - Best for complex reasoning",
        type: "foundation",
        isDefault: true,
      },
      {
        id: "claude-3-5-sonnet",
        name: "Claude 3.5 Sonnet",
        description: "Anthropic Claude - Best for analysis and writing",
        type: "foundation",
        isDefault: false,
      },
      {
        id: "llama-3-1-70b",
        name: "Llama 3.1 70B",
        description: "Meta Llama - Open source, fast responses",
        type: "foundation",
        isDefault: false,
      },
      {
        id: "mining-ops-agent",
        name: "Mining Operations Agent",
        description: "Specialized agent for mining operations data",
        type: "agent",
        isDefault: false,
        domainId: "mining-ops",
      },
      {
        id: "geological-agent",
        name: "Geological Analysis Agent",
        description: "Agent for geological survey and exploration data",
        type: "agent",
        isDefault: false,
        domainId: "geological",
      },
      {
        id: "processing-agent",
        name: "Processing Plant Agent",
        description: "Agent for mineral processing optimization",
        type: "agent",
        isDefault: false,
        domainId: "processing",
      },
      {
        id: "sustainability-agent",
        name: "ESG & Sustainability Agent",
        description: "Agent for environmental and sustainability data",
        type: "agent",
        isDefault: false,
        domainId: "sustainability",
      },
      {
        id: "supply-chain-agent",
        name: "Supply Chain Agent",
        description: "Agent for logistics and procurement analytics",
        type: "agent",
        isDefault: false,
        domainId: "supply-chain",
      },
      {
        id: "finance-agent",
        name: "Finance Analytics Agent",
        description: "Agent for financial analysis and reporting",
        type: "agent",
        isDefault: false,
        domainId: "finance",
      },
    ];

    defaultEndpoints.forEach((endpoint) => {
      this.endpoints.set(endpoint.id, endpoint);
    });
  }

  async getConversations(): Promise<Conversation[]> {
    return Array.from(this.conversations.values());
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async createConversation(endpointId: string, title: string, domainId?: string, siteId?: string): Promise<Conversation> {
    const id = randomUUID();
    const now = Date.now();
    const conversation: Conversation = {
      id,
      title,
      messages: [],
      endpointId,
      domainId,
      siteId,
      createdAt: now,
      updatedAt: now,
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async addMessage(
    conversationId: string,
    message: Omit<Message, "id">
  ): Promise<Message> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    const newMessage: Message = {
      ...message,
      id: randomUUID(),
    };

    conversation.messages.push(newMessage);
    conversation.updatedAt = Date.now();
    
    if (conversation.messages.length === 1 && message.role === "user") {
      conversation.title = message.content.slice(0, 50) + (message.content.length > 50 ? "..." : "");
    }

    return newMessage;
  }

  async updateConversation(
    id: string,
    updates: Partial<Conversation>
  ): Promise<Conversation | undefined> {
    const conversation = this.conversations.get(id);
    if (!conversation) return undefined;

    Object.assign(conversation, updates, { updatedAt: Date.now() });
    return conversation;
  }

  async deleteConversation(id: string): Promise<boolean> {
    return this.conversations.delete(id);
  }

  async getDomains(): Promise<Domain[]> {
    return Array.from(this.domains.values());
  }

  async getDomain(id: string): Promise<Domain | undefined> {
    return this.domains.get(id);
  }

  async createDomain(domain: InsertDomain): Promise<Domain> {
    let baseId = domain.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    let id = baseId;
    let counter = 1;
    while (this.domains.has(id)) {
      id = `${baseId}-${counter}`;
      counter++;
    }
    const newDomain: Domain = { id, ...domain };
    this.domains.set(id, newDomain);
    return newDomain;
  }

  async updateDomain(id: string, updates: Partial<InsertDomain>): Promise<Domain | undefined> {
    const domain = this.domains.get(id);
    if (!domain) return undefined;
    const updated = { ...domain, ...updates };
    this.domains.set(id, updated);
    return updated;
  }

  async deleteDomain(id: string): Promise<boolean> {
    return this.domains.delete(id);
  }

  async getSites(): Promise<Site[]> {
    return Array.from(this.sites.values());
  }

  async getSite(id: string): Promise<Site | undefined> {
    return this.sites.get(id);
  }

  async getEndpoints(domainId?: string): Promise<Endpoint[]> {
    const allEndpoints = Array.from(this.endpoints.values());
    if (!domainId || domainId === "generic") {
      return allEndpoints.filter(e => !e.domainId || e.type === "foundation");
    }
    return allEndpoints.filter(e => !e.domainId || e.domainId === domainId || e.type === "foundation");
  }

  async getEndpoint(id: string): Promise<Endpoint | undefined> {
    return this.endpoints.get(id);
  }

  async createEndpoint(endpoint: InsertEndpoint): Promise<Endpoint> {
    let baseId = endpoint.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    let id = baseId;
    let counter = 1;
    while (this.endpoints.has(id)) {
      id = `${baseId}-${counter}`;
      counter++;
    }
    const newEndpoint: Endpoint = { id, ...endpoint };
    this.endpoints.set(id, newEndpoint);
    return newEndpoint;
  }

  async updateEndpoint(id: string, updates: Partial<InsertEndpoint>): Promise<Endpoint | undefined> {
    const endpoint = this.endpoints.get(id);
    if (!endpoint) return undefined;
    const updated = { ...endpoint, ...updates };
    this.endpoints.set(id, updated);
    return updated;
  }

  async deleteEndpoint(id: string): Promise<boolean> {
    return this.endpoints.delete(id);
  }

  async getConfig(): Promise<Config> {
    return this.config;
  }

  async setConfig(config: Config): Promise<Config> {
    this.config = { ...this.config, ...config };
    return this.config;
  }
}

import { LakeBaseStorage, createLakeBaseConfig } from "./lakebase-storage";

let storageInstance: IStorage | null = null;

export async function initializeStorage(): Promise<IStorage> {
  if (storageInstance) return storageInstance;

  const lakebaseConfig = createLakeBaseConfig();
  
  if (lakebaseConfig) {
    console.log("LakeBase configuration found. Initializing LakeBase storage...");
    try {
      const lakebaseStorage = new LakeBaseStorage(lakebaseConfig);
      await lakebaseStorage.initialize();
      storageInstance = lakebaseStorage;
      console.log(`Connected to LakeBase: ${lakebaseConfig.catalog}.${lakebaseConfig.schema}`);
      return storageInstance;
    } catch (error) {
      console.error("Failed to initialize LakeBase storage, falling back to memory:", error);
    }
  }

  console.log("Using in-memory storage");
  storageInstance = new MemStorage();
  return storageInstance;
}

export function getStorage(): IStorage {
  if (!storageInstance) {
    storageInstance = new MemStorage();
  }
  return storageInstance;
}
