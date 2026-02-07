import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest, getApiUrl, setAuthToken } from "@/lib/query-client";
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
const TOKEN_KEY = "peakflow_auth_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadToken();
  }, []);

  async function loadToken() {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (token) {
        setAuthToken(token);
        const baseUrl = getApiUrl();
        const res = await fetch(`${baseUrl}api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        } else {
          await AsyncStorage.removeItem(TOKEN_KEY);
          setAuthToken(null);
        }
      }
    } catch {
      await AsyncStorage.removeItem(TOKEN_KEY).catch(() => {});
      setAuthToken(null);
    } finally {
      setIsLoading(false);
    }
  }

  const login = useCallback(async (username: string, password: string) => {
    const res = await apiRequest("POST", "/api/auth/login", { username, password });
    const data = await res.json();
    const { token, ...userData } = data;
    await AsyncStorage.setItem(TOKEN_KEY, token);
    setAuthToken(token);
    setUser(userData);
  }, []);

  const register = useCallback(async (data: {
    username: string;
    email: string;
    password: string;
    fullName: string;
    occupation: string;
    goals: string;
  }) => {
    const res = await apiRequest("POST", "/api/auth/register", data);
    const responseData = await res.json();
    const { token, ...userData } = responseData;
    await AsyncStorage.setItem(TOKEN_KEY, token);
    setAuthToken(token);
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
    } catch {}
    await AsyncStorage.removeItem(TOKEN_KEY).catch(() => {});
    setAuthToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, login, register, logout }),
    [user, isLoading, login, register, logout],
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
