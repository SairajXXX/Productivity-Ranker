import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { fetch } from "expo/fetch";

interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  occupation: string;
  goals: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: {
    username: string;
    email: string;
    password: string;
    fullName: string;
    occupation: string;
    goals: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}api/auth/me`, {
        credentials: "include",
      });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  }

  async function login(username: string, password: string) {
    const res = await apiRequest("POST", "/api/auth/login", { username, password });
    const userData = await res.json();
    setUser(userData);
  }

  async function register(data: {
    username: string;
    email: string;
    password: string;
    fullName: string;
    occupation: string;
    goals: string;
  }) {
    const res = await apiRequest("POST", "/api/auth/register", data);
    const userData = await res.json();
    setUser(userData);
  }

  async function logout() {
    await apiRequest("POST", "/api/auth/logout");
    setUser(null);
  }

  const value = useMemo(
    () => ({ user, isLoading, login, register, logout }),
    [user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
