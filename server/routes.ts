import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { chatRequestSchema, configSchema, insertDomainSchema, insertEndpointSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get("/api/domains", async (_req, res) => {
    try {
      const domains = await storage.getDomains();
      res.json(domains);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch domains" });
    }
  });

  app.post("/api/domains", async (req, res) => {
    try {
      const parsed = insertDomainSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid domain data", details: parsed.error.errors });
      }
      const domain = await storage.createDomain(parsed.data);
      res.status(201).json(domain);
    } catch (error) {
      res.status(500).json({ error: "Failed to create domain" });
    }
  });

  app.put("/api/domains/:id", async (req, res) => {
    try {
      const parsed = insertDomainSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid domain data", details: parsed.error.errors });
      }
      const domain = await storage.updateDomain(req.params.id, parsed.data);
      if (!domain) {
        return res.status(404).json({ error: "Domain not found" });
      }
      res.json(domain);
    } catch (error) {
      res.status(500).json({ error: "Failed to update domain" });
    }
  });

  app.delete("/api/domains/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteDomain(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Domain not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete domain" });
    }
  });

  app.get("/api/sites", async (_req, res) => {
    try {
      const sites = await storage.getSites();
      res.json(sites);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sites" });
    }
  });

  app.get("/api/endpoints", async (req, res) => {
    try {
      const domainId = req.query.domainId as string | undefined;
      const databricksHost = process.env.DATABRICKS_HOST;
      const databricksToken = process.env.DATABRICKS_TOKEN;

      const storageEndpoints = await storage.getEndpoints(domainId);
      let databricksEndpoints: any[] = [];

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
            databricksEndpoints = (data.endpoints || []).map((ep: any) => ({
              id: `databricks-${ep.name}`,
              name: ep.name,
              description: ep.config?.served_entities?.[0]?.entity_name || "Databricks serving endpoint",
              type: ep.config?.served_entities?.[0]?.entity_name?.includes("agent") ? "agent" : 
                    ep.config?.served_entities?.[0]?.foundation_model_name ? "foundation" : "custom",
              isDefault: false,
            }));
          }
        } catch (apiError) {
          console.log("Could not fetch Databricks endpoints:", apiError);
        }
      }

      const allEndpoints = [...storageEndpoints, ...databricksEndpoints];
      if (allEndpoints.length > 0 && !allEndpoints.some(e => e.isDefault)) {
        allEndpoints[0].isDefault = true;
      }
      res.json(allEndpoints);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch endpoints" });
    }
  });

  app.post("/api/endpoints", async (req, res) => {
    try {
      const parsed = insertEndpointSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid endpoint data", details: parsed.error.errors });
      }
      const endpoint = await storage.createEndpoint(parsed.data);
      res.status(201).json(endpoint);
    } catch (error) {
      res.status(500).json({ error: "Failed to create endpoint" });
    }
  });

  app.put("/api/endpoints/:id", async (req, res) => {
    try {
      const parsed = insertEndpointSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid endpoint data", details: parsed.error.errors });
      }
      const endpoint = await storage.updateEndpoint(req.params.id, parsed.data);
      if (!endpoint) {
        return res.status(404).json({ error: "Endpoint not found" });
      }
      res.json(endpoint);
    } catch (error) {
      res.status(500).json({ error: "Failed to update endpoint" });
    }
  });

  app.delete("/api/endpoints/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteEndpoint(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Endpoint not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete endpoint" });
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

      const { message, conversationId, endpointId, domainId, siteId } = parseResult.data;

      const endpoint = await storage.getEndpoint(endpointId);
      const domain = domainId ? await storage.getDomain(domainId) : await storage.getDomain("generic");
      const site = siteId ? await storage.getSite(siteId) : await storage.getSite("all-sites");
      
      let conversation;
      if (conversationId) {
        conversation = await storage.getConversation(conversationId);
        if (!conversation) {
          return res.status(404).json({ error: "Conversation not found" });
        }
      } else {
        conversation = await storage.createConversation(
          endpointId,
          message.slice(0, 50) + (message.length > 50 ? "..." : ""),
          domainId,
          siteId
        );
      }

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
      const siteContext = site && site.id !== "all-sites" 
        ? ` Focus on data and context specific to ${site.name} (${site.location}).`
        : "";
      const systemPrompt = (domain?.systemPrompt || "You are a helpful AI assistant.") + siteContext;

      let aiResponse: string;
      const endpointName = endpoint?.name || endpointId;
      const databricksEndpointName = endpointId.startsWith("databricks-") 
        ? endpointId.slice("databricks-".length) 
        : endpointId;

      if (databricksHost && databricksToken) {
        try {
          const requestBody = {
            messages: [
              { role: "system", content: systemPrompt },
              ...conversationContext,
              { role: "user", content: message },
            ],
          };

          const response = await fetch(
            `${databricksHost}/serving-endpoints/${databricksEndpointName}/invocations`,
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
          aiResponse = generateMockResponse(message, endpointName, domain?.name || "General", site?.name || "All Sites", conversationContext);
        }
      } else {
        aiResponse = generateMockResponse(message, endpointName, domain?.name || "General", site?.name || "All Sites", conversationContext);
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
  domainName: string,
  siteName: string,
  context: Array<{ role: string; content: string }>
): string {
  const messageCount = context.length;
  const siteInfo = siteName !== "All Sites" ? ` (focused on ${siteName})` : "";
  const contextInfo = messageCount > 0 
    ? `\n\n*I have access to ${messageCount} previous messages in our conversation for context.${siteInfo}*`
    : siteInfo ? `\n\n*${siteInfo.trim()}*` : "";

  const domainResponses: Record<string, string[]> = {
    "Mining Operations": [
      `As your Mining Operations assistant, I can help analyze production data and operational metrics.\n\nRegarding "${message}":\n\nIn a production environment, I would connect to real-time operational data from your mining sites, including equipment telemetry, shift reports, and safety metrics. I can help optimize production schedules, identify bottlenecks, and track KPIs.${contextInfo}`,
    ],
    "Geological Services": [
      `As your Geological Services assistant, I specialize in geological data analysis.\n\nRegarding "${message}":\n\nI can assist with ore body modeling, drill hole analysis, grade estimation, and geological mapping. In production, I would have access to your geological databases and exploration data to provide data-driven insights.${contextInfo}`,
    ],
    "Mineral Processing": [
      `As your Mineral Processing specialist, I focus on plant optimization.\n\nRegarding "${message}":\n\nI can help analyze throughput rates, recovery efficiencies, and processing parameters. In production, I would integrate with plant control systems to provide real-time optimization recommendations.${contextInfo}`,
    ],
    "Sustainability & ESG": [
      `As your Sustainability & ESG advisor, I help with environmental and social governance.\n\nRegarding "${message}":\n\nI can assist with emissions tracking, water usage analysis, community impact assessments, and ESG reporting. In production, I would connect to your sustainability monitoring systems.${contextInfo}`,
    ],
    "Supply Chain": [
      `As your Supply Chain analyst, I optimize logistics and procurement.\n\nRegarding "${message}":\n\nI can help with inventory optimization, vendor performance analysis, logistics routing, and procurement analytics. In production, I would integrate with your ERP and supply chain systems.${contextInfo}`,
    ],
    "Finance & Analytics": [
      `As your Finance & Analytics assistant, I focus on financial performance.\n\nRegarding "${message}":\n\nI can help with cost analysis, budget forecasting, capital allocation, and financial KPIs. In production, I would connect to your financial systems for real-time insights.${contextInfo}`,
    ],
  };

  const responses = domainResponses[domainName] || [
    `Thank you for your question! Using ${endpointName}, I'm here to help with your ${domainName} queries.\n\nYou asked: "${message}"\n\nIn production, this would connect to your Databricks serving endpoint with domain-specific context and knowledge. The response would be tailored to your specific business area within Anglo American.${contextInfo}`,
  ];

  return responses[Math.floor(Math.random() * responses.length)];
}
