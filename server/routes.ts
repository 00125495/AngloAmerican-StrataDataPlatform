import type { Express, Request, Response } from "express";
import { type Server } from "http";
import type { IncomingMessage } from "http";

const FASTAPI_URL = process.env.FASTAPI_URL || "http://127.0.0.1:8000";

interface RequestWithRawBody extends Request {
  rawBody?: Buffer;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.all("/api/{*path}", async (req: RequestWithRawBody, res: Response) => {
    try {
      const url = `${FASTAPI_URL}${req.originalUrl}`;
      const headers: Record<string, string> = {};
      
      for (const [key, value] of Object.entries(req.headers)) {
        if (key.toLowerCase() !== "host" && 
            key.toLowerCase() !== "content-length" && 
            key.toLowerCase() !== "connection" &&
            typeof value === "string") {
          headers[key] = value;
        }
      }

      const fetchOptions: RequestInit = {
        method: req.method,
        headers,
      };

      if (["POST", "PUT", "PATCH"].includes(req.method)) {
        if (req.rawBody) {
          fetchOptions.body = req.rawBody;
          headers["content-type"] = "application/json";
        } else if (req.body && Object.keys(req.body).length > 0) {
          fetchOptions.body = JSON.stringify(req.body);
          headers["content-type"] = "application/json";
        }
      }

      const response = await fetch(url, fetchOptions);
      const contentType = response.headers.get("content-type");
      
      res.status(response.status);
      
      if (contentType) {
        res.setHeader("Content-Type", contentType);
      }

      if (contentType?.includes("application/json")) {
        const data = await response.json();
        res.json(data);
      } else {
        const text = await response.text();
        res.send(text);
      }
    } catch (error: any) {
      console.error("Proxy error:", error.message);
      res.status(502).json({ error: "Backend service unavailable", details: error.message });
    }
  });

  return httpServer;
}
