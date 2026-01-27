import { randomUUID } from "crypto";
import type {
  Conversation,
  Message,
  Endpoint,
  Config,
} from "@shared/schema";

export interface IStorage {
  getConversations(): Promise<Conversation[]>;
  getConversation(id: string): Promise<Conversation | undefined>;
  createConversation(endpointId: string, title: string): Promise<Conversation>;
  addMessage(conversationId: string, message: Omit<Message, "id">): Promise<Message>;
  updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation | undefined>;
  deleteConversation(id: string): Promise<boolean>;
  
  getEndpoints(): Promise<Endpoint[]>;
  getEndpoint(id: string): Promise<Endpoint | undefined>;
  
  getConfig(): Promise<Config>;
  setConfig(config: Config): Promise<Config>;
}

export class MemStorage implements IStorage {
  private conversations: Map<string, Conversation>;
  private endpoints: Map<string, Endpoint>;
  private config: Config;

  constructor() {
    this.conversations = new Map();
    this.endpoints = new Map();
    this.config = {
      systemPrompt: "You are a helpful AI assistant for Anglo American. Provide clear, accurate, and helpful responses based on the conversation context.",
    };

    this.initializeDefaultEndpoints();
  }

  private initializeDefaultEndpoints() {
    const defaultEndpoints: Endpoint[] = [
      {
        id: "gpt-4-turbo",
        name: "GPT-4 Turbo",
        description: "OpenAI GPT-4 Turbo foundation model",
        type: "foundation",
        isDefault: true,
      },
      {
        id: "claude-3-5-sonnet",
        name: "Claude 3.5 Sonnet",
        description: "Anthropic Claude 3.5 Sonnet model",
        type: "foundation",
        isDefault: false,
      },
      {
        id: "llama-3-1-70b",
        name: "Llama 3.1 70B",
        description: "Meta Llama 3.1 70B Instruct",
        type: "foundation",
        isDefault: false,
      },
      {
        id: "geological-analyzer",
        name: "Geological Analyzer",
        description: "Fine-tuned model for geological survey analysis",
        type: "custom",
        isDefault: false,
      },
      {
        id: "operations-agent",
        name: "Operations Agent",
        description: "Agent for mining operations data exploration",
        type: "agent",
        isDefault: false,
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

  async createConversation(endpointId: string, title: string): Promise<Conversation> {
    const id = randomUUID();
    const now = Date.now();
    const conversation: Conversation = {
      id,
      title,
      messages: [],
      endpointId,
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

  async getEndpoints(): Promise<Endpoint[]> {
    return Array.from(this.endpoints.values());
  }

  async getEndpoint(id: string): Promise<Endpoint | undefined> {
    return this.endpoints.get(id);
  }

  async getConfig(): Promise<Config> {
    return this.config;
  }

  async setConfig(config: Config): Promise<Config> {
    this.config = { ...this.config, ...config };
    return this.config;
  }
}

export const storage = new MemStorage();
