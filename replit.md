# PeakFlow - Productivity Tracking App

## Overview
PeakFlow is a productivity tracking app where users log daily activities, receive AI-generated productivity scores (0-100), compete on a weekly scoreboard, and chat with an AI productivity coach. Built with Expo (React Native) on the frontend and Express on the backend.

## Recent Changes
- 2026-02-07: Initial MVP built with full auth, activity logging, AI scoring, scoreboard, AI coach chat

## Architecture

### Frontend (Expo/React Native)
- **app/_layout.tsx** - Root layout with providers (QueryClient, Auth, Keyboard)
- **app/auth.tsx** - Login/Register screen with profile fields
- **app/(tabs)/index.tsx** - Dashboard with daily score, weekly graph, today's activities
- **app/(tabs)/log.tsx** - Activity logger with categories, durations, completion status
- **app/(tabs)/scoreboard.tsx** - Weekly rankings with medals
- **app/(tabs)/coach.tsx** - AI coach chat with streaming responses
- **lib/auth-context.tsx** - Auth context provider with login/register/logout
- **constants/colors.ts** - App color scheme (indigo/purple primary: #4F46E5)

### Backend (Express)
- **server/routes.ts** - All API routes (auth, entries, scoring, chat, scoreboard)
- **server/storage.ts** - Database operations
- **server/db.ts** - Database connection (Drizzle ORM + Neon PostgreSQL)
- **shared/schema.ts** - Database schema (users, productivity_entries, daily_scores, weekly_scores, chat_messages)

### Key Decisions
- Session-based auth with express-session and connect-pg-simple
- OpenAI GPT-5-nano via Replit AI Integrations for scoring and chat
- Activity categories: work, learning, exercise, creative, health, social
- Week defined as Monday-Sunday for weekly scoring
- Streaming SSE for AI coach responses

## User Preferences
- App name: PeakFlow
- Color scheme: Indigo/purple (#4F46E5)
- Social features planned for future expansion but not part of MVP
