import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import OpenAI from "openai";
import {
  createUser,
  getUserByUsername,
  getUserById,
  verifyPassword,
  createProductivityEntry,
  getEntriesByDate,
  getEntriesByDateRange,
  deleteEntry,
  saveDailyScore,
  getDailyScores,
  saveWeeklyScore,
  getWeeklyScoreboard,
  getChatMessages,
  saveChatMessage,
  clearChatMessages,
} from "./storage";
import { insertUserSchema, loginSchema, insertProductivityEntrySchema } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

function requireAuth(req: Request, res: Response, next: Function) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

function getWeekBounds(dateStr?: string) {
  const d = dateStr ? new Date(dateStr) : new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    weekStart: monday.toISOString().split("T")[0],
    weekEnd: sunday.toISOString().split("T")[0],
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  const PgSession = connectPgSimple(session);

  app.set("trust proxy", 1);

  app.use(
    session({
      store: new PgSession({
        pool: pool as any,
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "productivity-app-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        secure: true,
        httpOnly: true,
        sameSite: "none",
      },
    }),
  );

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const parsed = insertUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });
      }

      const existing = await getUserByUsername(parsed.data.username);
      if (existing) {
        return res.status(409).json({ message: "Username already taken" });
      }

      const user = await createUser(parsed.data);
      req.session.userId = user.id;

      const { password, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error: any) {
      if (error?.constraint?.includes("email")) {
        return res.status(409).json({ message: "Email already in use" });
      }
      console.error("Registration error:", error);
      res.status(500).json({ message: "Failed to register" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input" });
      }

      const user = await getUserByUsername(parsed.data.username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const valid = await verifyPassword(parsed.data.password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.userId = user.id;
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Failed to login" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = await getUserById(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    const { password, ...safeUser } = user;
    res.json(safeUser);
  });

  app.post("/api/entries", requireAuth, async (req: Request, res: Response) => {
    try {
      const parsed = insertProductivityEntrySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });
      }
      const entry = await createProductivityEntry(req.session.userId!, parsed.data);
      res.status(201).json(entry);
    } catch (error) {
      console.error("Entry creation error:", error);
      res.status(500).json({ message: "Failed to create entry" });
    }
  });

  app.get("/api/entries", requireAuth, async (req: Request, res: Response) => {
    try {
      const date = (req.query.date as string) || new Date().toISOString().split("T")[0];
      const entries = await getEntriesByDate(req.session.userId!, date);
      res.json(entries);
    } catch (error) {
      console.error("Entries fetch error:", error);
      res.status(500).json({ message: "Failed to fetch entries" });
    }
  });

  app.get("/api/entries/range", requireAuth, async (req: Request, res: Response) => {
    try {
      const { start, end } = req.query;
      if (!start || !end) {
        return res.status(400).json({ message: "start and end dates required" });
      }
      const entries = await getEntriesByDateRange(
        req.session.userId!,
        start as string,
        end as string,
      );
      res.json(entries);
    } catch (error) {
      console.error("Entries range fetch error:", error);
      res.status(500).json({ message: "Failed to fetch entries" });
    }
  });

  app.delete("/api/entries/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const deleted = await deleteEntry(
        parseInt(req.params.id),
        req.session.userId!,
      );
      if (!deleted) {
        return res.status(404).json({ message: "Entry not found" });
      }
      res.json({ message: "Deleted" });
    } catch (error) {
      console.error("Entry delete error:", error);
      res.status(500).json({ message: "Failed to delete entry" });
    }
  });

  app.post("/api/score/daily", requireAuth, async (req: Request, res: Response) => {
    try {
      const date = (req.body.date as string) || new Date().toISOString().split("T")[0];
      const entries = await getEntriesByDate(req.session.userId!, date);

      if (entries.length === 0) {
        return res.json({ score: 0, insight: "No activities logged today. Start tracking to get your productivity score!" });
      }

      const user = await getUserById(req.session.userId!);
      const entrySummary = entries
        .map(
          (e) =>
            `- ${e.title} (${e.category}, ${e.duration}min, ${e.completed ? "completed" : "incomplete"})${e.notes ? ` Notes: ${e.notes}` : ""}`,
        )
        .join("\n");

      const prompt = `You are a productivity analyst. Rate this person's daily productivity on a scale of 0-100 and provide a brief insight.

User Profile:
- Name: ${user?.fullName}
- Occupation: ${user?.occupation}
- Goals: ${user?.goals}

Today's Activities (${date}):
${entrySummary}

Respond in this exact JSON format:
{"score": <number 0-100>, "insight": "<2-3 sentence insight about their productivity>"}`;

      const response = await openai.chat.completions.create({
        model: "gpt-5-nano",
        messages: [{ role: "user", content: prompt }],
        max_completion_tokens: 256,
      });

      const content = response.choices[0]?.message?.content || '{"score": 50, "insight": "Keep going!"}';
      let parsed;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
      } catch {
        parsed = { score: 50, insight: content };
      }

      const score = Math.min(100, Math.max(0, Number(parsed.score) || 50));
      const insight = parsed.insight || "Keep pushing your productivity!";

      await saveDailyScore(req.session.userId!, date, score, insight);

      const { weekStart, weekEnd } = getWeekBounds(date);
      const weekScores = await getDailyScores(req.session.userId!, weekStart, weekEnd);
      if (weekScores.length > 0) {
        const avg = weekScores.reduce((sum, s) => sum + s.score, 0) / weekScores.length;
        await saveWeeklyScore(req.session.userId!, weekStart, weekEnd, Math.round(avg * 10) / 10, weekScores.length);
      }

      res.json({ score, insight, date });
    } catch (error) {
      console.error("Scoring error:", error);
      res.status(500).json({ message: "Failed to generate score" });
    }
  });

  app.get("/api/scores/daily", requireAuth, async (req: Request, res: Response) => {
    try {
      const { weekStart, weekEnd } = getWeekBounds();
      const scores = await getDailyScores(req.session.userId!, weekStart, weekEnd);
      res.json(scores);
    } catch (error) {
      console.error("Scores fetch error:", error);
      res.status(500).json({ message: "Failed to fetch scores" });
    }
  });

  app.get("/api/scoreboard", requireAuth, async (req: Request, res: Response) => {
    try {
      const { weekStart } = getWeekBounds();
      const scoreboard = await getWeeklyScoreboard(weekStart);
      res.json({ weekStart, scoreboard });
    } catch (error) {
      console.error("Scoreboard fetch error:", error);
      res.status(500).json({ message: "Failed to fetch scoreboard" });
    }
  });

  app.get("/api/chat/messages", requireAuth, async (req: Request, res: Response) => {
    try {
      const messages = await getChatMessages(req.session.userId!);
      res.json(messages);
    } catch (error) {
      console.error("Chat messages fetch error:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.delete("/api/chat/messages", requireAuth, async (req: Request, res: Response) => {
    try {
      await clearChatMessages(req.session.userId!);
      res.json({ message: "Chat cleared" });
    } catch (error) {
      console.error("Chat clear error:", error);
      res.status(500).json({ message: "Failed to clear chat" });
    }
  });

  app.post("/api/chat", requireAuth, async (req: Request, res: Response) => {
    try {
      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }

      const user = await getUserById(req.session.userId!);
      const chatHistory = await getChatMessages(req.session.userId!);

      await saveChatMessage(req.session.userId!, "user", message);

      const { weekStart, weekEnd } = getWeekBounds();
      const recentEntries = await getEntriesByDateRange(req.session.userId!, weekStart, weekEnd);
      const recentScores = await getDailyScores(req.session.userId!, weekStart, weekEnd);

      const entriesSummary = recentEntries.length > 0
        ? recentEntries
            .slice(0, 20)
            .map((e) => `${e.date}: ${e.title} (${e.category}, ${e.duration}min, ${e.completed ? "done" : "pending"})`)
            .join("\n")
        : "No recent activities logged.";

      const scoresSummary = recentScores.length > 0
        ? recentScores.map((s) => `${s.date}: Score ${s.score}/100`).join(", ")
        : "No scores yet.";

      const systemPrompt = `You are an expert productivity coach. You help users maximize their productivity with actionable, personalized advice.

User Profile:
- Name: ${user?.fullName}
- Occupation: ${user?.occupation}
- Goals: ${user?.goals}

Recent Activities This Week:
${entriesSummary}

Recent Scores: ${scoresSummary}

Guidelines:
- Be encouraging but honest
- Give specific, actionable advice
- Reference their actual activities and scores when relevant
- Keep responses concise (2-4 sentences unless they ask for detailed plans)
- Use their name occasionally for a personal touch`;

      const messages: any[] = [
        { role: "system", content: systemPrompt },
        ...chatHistory.slice(-20).map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: message },
      ];

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();

      const stream = await openai.chat.completions.create({
        model: "gpt-5-nano",
        messages,
        stream: true,
        max_completion_tokens: 1024,
      });

      let fullResponse = "";

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      await saveChatMessage(req.session.userId!, "assistant", fullResponse);

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error) {
      console.error("Chat error:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Failed to get response" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ message: "Failed to chat" });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
