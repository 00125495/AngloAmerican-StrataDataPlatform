import { z } from "zod";

export const messageRoleSchema = z.enum(["user", "assistant", "system"]);
export type MessageRole = z.infer<typeof messageRoleSchema>;

export const messageSchema = z.object({
  id: z.string(),
  role: messageRoleSchema,
  content: z.string(),
  timestamp: z.number(),
});
export type Message = z.infer<typeof messageSchema>;

export const conversationSchema = z.object({
  id: z.string(),
  title: z.string(),
  messages: z.array(messageSchema),
  endpointId: z.string(),
  domainId: z.string().optional(),
  siteId: z.string().optional(),
  userEmail: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type Conversation = z.infer<typeof conversationSchema>;

export const domainSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  systemPrompt: z.string(),
  icon: z.string().optional(),
});
export type Domain = z.infer<typeof domainSchema>;

export const siteSchema = z.object({
  id: z.string(),
  name: z.string(),
  location: z.string(),
  type: z.string(),
});
export type Site = z.infer<typeof siteSchema>;

export const endpointSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  type: z.enum(["foundation", "custom", "agent"]),
  isDefault: z.boolean(),
  domainId: z.string().optional(),
});
export type Endpoint = z.infer<typeof endpointSchema>;

export const chatRequestSchema = z.object({
  message: z.string().min(1),
  conversationId: z.string().optional(),
  endpointId: z.string(),
  domainId: z.string().optional(),
  siteId: z.string().optional(),
});
export type ChatRequest = z.infer<typeof chatRequestSchema>;

export const chatResponseSchema = z.object({
  message: messageSchema,
  conversationId: z.string(),
});
export type ChatResponse = z.infer<typeof chatResponseSchema>;

export const configSchema = z.object({
  defaultEndpointId: z.string().optional(),
  defaultDomainId: z.string().optional(),
  defaultSiteId: z.string().optional(),
  systemPrompt: z.string().optional(),
});
export type Config = z.infer<typeof configSchema>;

export const insertMessageSchema = messageSchema.omit({ id: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export const insertConversationSchema = conversationSchema.omit({ id: true, messages: true, createdAt: true, updatedAt: true });
export type InsertConversation = z.infer<typeof insertConversationSchema>;

export const insertDomainSchema = domainSchema.omit({ id: true });
export type InsertDomain = z.infer<typeof insertDomainSchema>;

export const insertEndpointSchema = endpointSchema.omit({ id: true });
export type InsertEndpoint = z.infer<typeof insertEndpointSchema>;
