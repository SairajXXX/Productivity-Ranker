import {
  type User,
  type InsertUser,
  type ProductivityEntry,
  type InsertProductivityEntry,
  type DailyScore,
  type WeeklyScore,
  type ChatMessage,
  users,
  productivityEntries,
  dailyScores,
  weeklyScores,
  chatMessages,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import bcrypt from "bcrypt";

export async function createUser(data: InsertUser): Promise<User> {
  const hashedPassword = await bcrypt.hash(data.password, 10);
  const [user] = await db
    .insert(users)
    .values({ ...data, password: hashedPassword })
    .returning();
  return user;
}

export async function getUserByUsername(
  username: string,
): Promise<User | undefined> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username));
  return user;
}

export async function getUserById(id: number): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user;
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createProductivityEntry(
  userId: number,
  data: InsertProductivityEntry,
): Promise<ProductivityEntry> {
  const [entry] = await db
    .insert(productivityEntries)
    .values({ ...data, userId })
    .returning();
  return entry;
}

export async function getEntriesByDate(
  userId: number,
  date: string,
): Promise<ProductivityEntry[]> {
  return db
    .select()
    .from(productivityEntries)
    .where(
      and(
        eq(productivityEntries.userId, userId),
        eq(productivityEntries.date, date),
      ),
    )
    .orderBy(desc(productivityEntries.createdAt));
}

export async function getEntriesByDateRange(
  userId: number,
  startDate: string,
  endDate: string,
): Promise<ProductivityEntry[]> {
  return db
    .select()
    .from(productivityEntries)
    .where(
      and(
        eq(productivityEntries.userId, userId),
        gte(productivityEntries.date, startDate),
        lte(productivityEntries.date, endDate),
      ),
    )
    .orderBy(desc(productivityEntries.createdAt));
}

export async function deleteEntry(
  id: number,
  userId: number,
): Promise<boolean> {
  const result = await db
    .delete(productivityEntries)
    .where(
      and(
        eq(productivityEntries.id, id),
        eq(productivityEntries.userId, userId),
      ),
    )
    .returning();
  return result.length > 0;
}

export async function saveDailyScore(
  userId: number,
  date: string,
  score: number,
  aiInsight: string,
): Promise<DailyScore> {
  const existing = await db
    .select()
    .from(dailyScores)
    .where(and(eq(dailyScores.userId, userId), eq(dailyScores.date, date)));

  if (existing.length > 0) {
    const [updated] = await db
      .update(dailyScores)
      .set({ score, aiInsight })
      .where(and(eq(dailyScores.userId, userId), eq(dailyScores.date, date)))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(dailyScores)
    .values({ userId, date, score, aiInsight })
    .returning();
  return created;
}

export async function getDailyScores(
  userId: number,
  startDate: string,
  endDate: string,
): Promise<DailyScore[]> {
  return db
    .select()
    .from(dailyScores)
    .where(
      and(
        eq(dailyScores.userId, userId),
        gte(dailyScores.date, startDate),
        lte(dailyScores.date, endDate),
      ),
    )
    .orderBy(desc(dailyScores.date));
}

export async function saveWeeklyScore(
  userId: number,
  weekStart: string,
  weekEnd: string,
  avgScore: number,
  totalEntries: number,
): Promise<WeeklyScore> {
  const existing = await db
    .select()
    .from(weeklyScores)
    .where(
      and(
        eq(weeklyScores.userId, userId),
        eq(weeklyScores.weekStart, weekStart),
      ),
    );

  if (existing.length > 0) {
    const [updated] = await db
      .update(weeklyScores)
      .set({ avgScore, totalEntries })
      .where(
        and(
          eq(weeklyScores.userId, userId),
          eq(weeklyScores.weekStart, weekStart),
        ),
      )
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(weeklyScores)
    .values({ userId, weekStart, weekEnd, avgScore, totalEntries })
    .returning();
  return created;
}

export async function getWeeklyScoreboard(
  weekStart: string,
): Promise<
  { userId: number; fullName: string; occupation: string; avgScore: number; totalEntries: number }[]
> {
  const results = await db
    .select({
      userId: weeklyScores.userId,
      fullName: users.fullName,
      occupation: users.occupation,
      avgScore: weeklyScores.avgScore,
      totalEntries: weeklyScores.totalEntries,
    })
    .from(weeklyScores)
    .innerJoin(users, eq(weeklyScores.userId, users.id))
    .where(eq(weeklyScores.weekStart, weekStart))
    .orderBy(desc(weeklyScores.avgScore));
  return results;
}

export async function getChatMessages(userId: number): Promise<ChatMessage[]> {
  return db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.userId, userId))
    .orderBy(chatMessages.createdAt);
}

export async function saveChatMessage(
  userId: number,
  role: string,
  content: string,
): Promise<ChatMessage> {
  const [msg] = await db
    .insert(chatMessages)
    .values({ userId, role, content })
    .returning();
  return msg;
}

export async function clearChatMessages(userId: number): Promise<void> {
  await db.delete(chatMessages).where(eq(chatMessages.userId, userId));
}

export async function getAllUsers(): Promise<User[]> {
  return db.select().from(users);
}
