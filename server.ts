import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

console.log("Starting Canton Resonance Server...");
console.log("Canton API URL configured:", !!process.env.CANTON_JSON_API_URL);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Test route to verify API is working
  app.get("/api/test", (req, res) => {
    res.json({ message: "Express API is live" });
  });

  const CANTON_API_URL = process.env.CANTON_JSON_API_URL;
  const CANTON_JWT = process.env.CANTON_JWT_TOKEN;

  // Middleware to check Canton configuration
  const checkCantonConfig = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!CANTON_API_URL || !CANTON_JWT) {
      return res.status(503).json({ 
        error: "Canton Configuration Missing", 
        details: "Please set CANTON_JSON_API_URL and CANTON_JWT_TOKEN in your environment/secrets." 
      });
    }
    next();
  };

  // --- Canton API Proxy Endpoints ---

  // Health check for Canton connection
  app.get("/api/canton/health", checkCantonConfig, async (req, res) => {
    try {
      const response = await fetch(`${CANTON_API_URL}/v1/parties`, {
        headers: { "Authorization": `Bearer ${CANTON_JWT}` }
      });
      if (response.ok) {
        res.json({ status: "connected", details: await response.json() });
      } else {
        res.status(response.status).json({ status: "error", details: await response.text() });
      }
    } catch (error) {
      res.status(500).json({ status: "disconnected", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Query contracts
  app.post("/api/canton/query", checkCantonConfig, async (req, res) => {
    try {
      const response = await fetch(`${CANTON_API_URL}/v1/query`, {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${CANTON_JWT}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(req.body)
      });
      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to query Canton" });
    }
  });

  // Create contract
  app.post("/api/canton/create", checkCantonConfig, async (req, res) => {
    try {
      const response = await fetch(`${CANTON_API_URL}/v1/create`, {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${CANTON_JWT}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(req.body)
      });
      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to create contract" });
    }
  });

  // Exercise choice
  app.post("/api/canton/exercise", checkCantonConfig, async (req, res) => {
    try {
      const response = await fetch(`${CANTON_API_URL}/v1/exercise`, {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${CANTON_JWT}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(req.body)
      });
      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to exercise choice" });
    }
  });

  // Handle all other /api routes with JSON 404
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: "API route not found", path: req.url });
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
