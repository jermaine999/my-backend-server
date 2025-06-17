import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertGameScoreSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Save game score endpoint
  app.post("/api/scores", async (req: Request, res: Response) => {
    try {
      const scoreData = insertGameScoreSchema.parse(req.body);
      const savedScore = await storage.saveGameScore(scoreData);
      res.json(savedScore);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid score data", details: error.errors });
      }
      
      console.error("Save score error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get leaderboard endpoint
  app.get("/api/leaderboard", async (req: Request, res: Response) => {
    try {
      const gameMode = req.query.gameMode as string | undefined;
      const leaderboard = await storage.getLeaderboard(gameMode);
      res.json(leaderboard);
    } catch (error: any) {
      console.error("Get leaderboard error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get player best score endpoint
  app.get("/api/best-score", async (req: Request, res: Response) => {
    try {
      const { playerName, gameMode } = req.query;
      
      if (!playerName || !gameMode) {
        return res.status(400).json({ error: "playerName and gameMode are required" });
      }
      
      const bestScore = await storage.getPlayerBestScore(playerName as string, gameMode as string);
      res.json({ bestScore });
    } catch (error: any) {
      console.error("Get best score error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
