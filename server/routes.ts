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
      if (!endpoint) {
        return res.status(400).json({ error: "Endpoint not found" });
      }

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

      const databricksHost = process.env.DATABRICKS_HOST || config.databricksHost;
      const databricksToken = process.env.DATABRICKS_TOKEN;

      let aiResponse: string;

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
          aiResponse = generateMockResponse(message, endpoint.name, conversationContext);
        }
      } else {
        aiResponse = generateMockResponse(message, endpoint.name, conversationContext);
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
    `Thank you for your question! As ${endpointName}, I'm here to help you with your data and AI needs on Databricks.\n\nYou asked: "${message}"\n\nIn a production environment, I would connect to your Databricks serving endpoint and provide real-time analysis and insights. For now, I'm demonstrating the conversation flow with context management.${contextInfo}`,
    
    `Great question! Using ${endpointName}, I can help analyze your data and provide actionable insights.\n\nRegarding "${message}":\n\nThis interface demonstrates how conversation context is passed to Databricks agents. Each message you send includes the full conversation history, allowing for coherent multi-turn interactions.${contextInfo}`,
    
    `Hello! I'm responding as ${endpointName}.\n\nYou mentioned: "${message}"\n\nIn production, this would trigger a call to your Databricks serving endpoint with the full conversation context. The response would be streamed back in real-time for a smooth user experience.${contextInfo}`,
  ];

  return responses[Math.floor(Math.random() * responses.length)];
}
