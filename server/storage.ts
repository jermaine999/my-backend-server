import { users, gameScores, type User, type InsertUser, type GameScore, type InsertGameScore } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  saveGameScore(score: InsertGameScore): Promise<GameScore>;
  getLeaderboard(gameMode?: string): Promise<GameScore[]>;
  getPlayerBestScore(playerName: string, gameMode: string): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async saveGameScore(score: InsertGameScore): Promise<GameScore> {
    const [gameScore] = await db
      .insert(gameScores)
      .values(score)
      .returning();
    return gameScore;
  }

  async getLeaderboard(gameMode?: string): Promise<GameScore[]> {
    if (gameMode) {
      return await db
        .select()
        .from(gameScores)
        .where(eq(gameScores.gameMode, gameMode))
        .orderBy(desc(gameScores.score))
        .limit(10);
    } else {
      return await db
        .select()
        .from(gameScores)
        .orderBy(desc(gameScores.score))
        .limit(10);
    }
  }

  async getPlayerBestScore(playerName: string, gameMode: string): Promise<number> {
    const scores = await db
      .select()
      .from(gameScores)
      .where(eq(gameScores.playerName, playerName))
      .orderBy(desc(gameScores.score))
      .limit(1);
    
    return scores.length > 0 ? scores[0].score : 0;
  }
}

export const storage = new DatabaseStorage();
