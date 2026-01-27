import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { spawn, ChildProcess } from "child_process";

const app = express();
const httpServer = createServer(app);

let fastapiProcess: ChildProcess | null = null;

function startFastAPI(): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log("Starting FastAPI backend on port 8000...");
    fastapiProcess = spawn("python", ["-m", "uvicorn", "backend.main:app", "--host", "127.0.0.1", "--port", "8000", "--reload"], {
      stdio: ["inherit", "pipe", "pipe"],
      env: { ...process.env }
    });

    fastapiProcess.stdout?.on("data", (data) => {
      const output = data.toString();
      if (output.includes("Uvicorn running") || output.includes("Application startup complete")) {
        resolve();
      }
      process.stdout.write(`[fastapi] ${output}`);
    });

    fastapiProcess.stderr?.on("data", (data) => {
      process.stderr.write(`[fastapi] ${data}`);
    });

    fastapiProcess.on("error", (err) => {
      console.error("Failed to start FastAPI:", err);
      reject(err);
    });

    fastapiProcess.on("exit", (code) => {
      if (code !== 0) {
        console.error(`FastAPI exited with code ${code}`);
      }
    });

    setTimeout(resolve, 3000);
  });
}

process.on("SIGINT", () => {
  if (fastapiProcess) {
    fastapiProcess.kill();
  }
  process.exit(0);
});

process.on("SIGTERM", () => {
  if (fastapiProcess) {
    fastapiProcess.kill();
  }
  process.exit(0);
});

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await startFastAPI();
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
