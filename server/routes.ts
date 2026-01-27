import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { chatRequestSchema, configSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get("/api/endpoints", async (_req, res) => {
    try {
      const databricksHost = process.env.DATABRICKS_HOST;
      const databricksToken = process.env.DATABRICKS_TOKEN;

      if (databricksHost && databricksToken) {
        try {
          const response = await fetch(
            `${databricksHost}/api/2.0/serving-endpoints`,
            {
              headers: {
                "Authorization": `Bearer ${databricksToken}`,
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            const endpoints = (data.endpoints || []).map((ep: any) => ({
              id: ep.name,
              name: ep.name,
              description: ep.config?.served_entities?.[0]?.entity_name || "Databricks serving endpoint",
              type: ep.config?.served_entities?.[0]?.entity_name?.includes("agent") ? "agent" : 
                    ep.config?.served_entities?.[0]?.foundation_model_name ? "foundation" : "custom",
              isDefault: false,
            }));
            
            if (endpoints.length > 0) {
              endpoints[0].isDefault = true;
              return res.json(endpoints);
            }
          }
        } catch (apiError) {
          console.log("Could not fetch Databricks endpoints, using defaults:", apiError);
        }
      }

      const endpoints = await storage.getEndpoints();
      res.json(endpoints);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch endpoints" });
    }
  });

  app.get("/api/conversations", async (_req, res) => {
    try {
      const conversations = await storage.getConversations();
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/:id", async (req, res) => {
    try {
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      res.json(conversation);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  app.delete("/api/conversations/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteConversation(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const parseResult = chatRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid request", details: parseResult.error });
      }

      const { message, conversationId, endpointId } = parseResult.data;

      const endpoint = await storage.getEndpoint(endpointId);
      
      let conversation;
      if (conversationId) {
        conversation = await storage.getConversation(conversationId);
        if (!conversation) {
          return res.status(404).json({ error: "Conversation not found" });
        }
      } else {
        conversation = await storage.createConversation(
          endpointId,
          message.slice(0, 50) + (message.length > 50 ? "..." : "")
        );
      }

      const config = await storage.getConfig();
      const conversationContext = conversation.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      await storage.addMessage(conversation.id, {
        role: "user",
        content: message,
        timestamp: Date.now(),
      });

      const databricksHost = process.env.DATABRICKS_HOST;
      const databricksToken = process.env.DATABRICKS_TOKEN;

      let aiResponse: string;
      const endpointName = endpoint?.name || endpointId;

      if (databricksHost && databricksToken) {
        try {
          const requestBody = {
            messages: [
              { role: "system", content: config.systemPrompt || "You are a helpful AI assistant." },
              ...conversationContext,
              { role: "user", content: message },
            ],
          };

          const response = await fetch(
            `${databricksHost}/serving-endpoints/${endpointId}/invocations`,
            {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${databricksToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(requestBody),
            }
          );

          if (!response.ok) {
            throw new Error(`Databricks API error: ${response.status}`);
          }

          const data = await response.json();
          aiResponse = data.choices?.[0]?.message?.content || 
                       data.predictions?.[0] || 
                       "I received your message but couldn't generate a response.";
        } catch (apiError) {
          console.error("Databricks API error:", apiError);
          aiResponse = generateMockResponse(message, endpointName, conversationContext);
        }
      } else {
        aiResponse = generateMockResponse(message, endpointName, conversationContext);
      }

      const assistantMessage = await storage.addMessage(conversation.id, {
        role: "assistant",
        content: aiResponse,
        timestamp: Date.now(),
      });

      res.json({
        message: assistantMessage,
        conversationId: conversation.id,
      });
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ error: "Failed to process chat message" });
    }
  });

  app.get("/api/config", async (_req, res) => {
    try {
      const config = await storage.getConfig();
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch config" });
    }
  });

  app.post("/api/config", async (req, res) => {
    try {
      const parseResult = configSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid config", details: parseResult.error });
      }

      const config = await storage.setConfig(parseResult.data);
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: "Failed to update config" });
    }
  });

  return httpServer;
}

function generateMockResponse(
  message: string,
  endpointName: string,
  context: Array<{ role: string; content: string }>
): string {
  const messageCount = context.length;
  const contextInfo = messageCount > 0 
    ? `\n\n*Note: I have access to ${messageCount} previous messages in our conversation for context.*`
    : "";

  const responses = [
    `Thank you for your question! As ${endpointName}, I'm here to help you explore your data layers.\n\nYou asked: "${message}"\n\nIn production, this would connect to your Databricks serving endpoint with your user credentials, automatically fetching models you have access to.${contextInfo}`,
    
    `Great question! Using ${endpointName}, I can help analyze your data and provide actionable insights.\n\nRegarding "${message}":\n\nWhen deployed as a Databricks App, authentication is handled automatically and this interface will show only the serving endpoints you have permission to access.${contextInfo}`,
    
    `Hello! I'm responding as ${endpointName}.\n\nYou mentioned: "${message}"\n\nThis demo shows how Anglo Strata manages conversation context. In production, your chat history would be stored in LakeBase tables for persistence and analytics.${contextInfo}`,
  ];

  return responses[Math.floor(Math.random() * responses.length)];
}
