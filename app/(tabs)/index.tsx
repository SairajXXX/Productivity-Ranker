import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient, getApiUrl, getQueryFn } from "@/lib/query-client";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function getDayName(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const entriesQuery = useQuery<any[]>({
    queryKey: ["/api/entries", `date=${getToday()}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const scoresQuery = useQuery<any[]>({
    queryKey: ["/api/scores/daily"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const scoreMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/score/daily", { date: getToday() });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/scores/daily"] });
    },
  });

  const todayEntries = entriesQuery.data || [];
  const weekScores = scoresQuery.data || [];
  const todayScore = weekScores.find((s: any) => s.date === getToday());
  const latestScore = scoreMutation.data as any;

  const displayScore = todayScore || latestScore;

  const completedCount = todayEntries.filter((e: any) => e.completed).length;
  const totalMinutes = todayEntries.reduce((sum: number, e: any) => sum + (e.duration || 0), 0);

  const onRefresh = useCallback(() => {
    entriesQuery.refetch();
    scoresQuery.refetch();
  }, []);

  function getScoreColor(score: number) {
    if (score >= 80) return Colors.light.accent;
    if (score >= 50) return Colors.light.warning;
    return Colors.light.danger;
  }

  async function handleScorePress() {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scoreMutation.mutate();
  }

  async function handleLogout() {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await logout();
  }

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <View style={[styles.container, { backgroundColor: Colors.light.background }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 16 + webTopInset,
          paddingBottom: 100 + (Platform.OS === "web" ? 34 : 0),
          paddingHorizontal: 20,
          flexGrow: 1,
        }}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={Colors.light.tint} />
        }
        showsVerticalScrollIndicator={false}
        bounces={true}
        scrollEnabled={true}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              Hi, {user?.fullName?.split(" ")[0] || "there"}
            </Text>
            <Text style={styles.dateText}>
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </Text>
          </View>
          <Pressable onPress={handleLogout} hitSlop={8}>
            <Ionicons name="log-out-outline" size={22} color={Colors.light.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.scoreCard}>
          <View style={styles.scoreHeader}>
            <Text style={styles.scoreTitle}>Today's Score</Text>
            <Pressable
              onPress={handleScorePress}
              disabled={scoreMutation.isPending}
              hitSlop={8}
            >
              {scoreMutation.isPending ? (
                <ActivityIndicator size="small" color={Colors.light.tint} />
              ) : (
                <Ionicons name="sparkles" size={20} color={Colors.light.tint} />
              )}
            </Pressable>
          </View>

          {displayScore ? (
            <View style={styles.scoreContent}>
              <Text
                style={[
                  styles.scoreNumber,
                  { color: getScoreColor(displayScore.score) },
                ]}
              >
                {Math.round(displayScore.score)}
              </Text>
              <Text style={styles.scoreLabel}>/100</Text>
            </View>
          ) : (
            <View style={styles.scoreContent}>
              <Text style={[styles.scoreNumber, { color: Colors.light.textSecondary, fontSize: 32 }]}>
                --
              </Text>
            </View>
          )}

          {displayScore?.aiInsight || displayScore?.insight ? (
            <Text style={styles.insightText}>{displayScore.aiInsight || displayScore.insight}</Text>
          ) : (
            <Text style={styles.insightText}>
              {todayEntries.length > 0
                ? "Tap the sparkle icon to get your AI score"
                : "Log some activities to get scored"}
            </Text>
          )}
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: Colors.light.tintLight }]}>
            <Ionicons name="checkmark-circle" size={24} color={Colors.light.tint} />
            <Text style={styles.statNumber}>{completedCount}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: Colors.light.accentLight }]}>
            <Ionicons name="time" size={24} color={Colors.light.accent} />
            <Text style={styles.statNumber}>{totalMinutes}</Text>
            <Text style={styles.statLabel}>Minutes</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: Colors.light.warningLight }]}>
            <Ionicons name="list" size={24} color={Colors.light.warning} />
            <Text style={styles.statNumber}>{todayEntries.length}</Text>
            <Text style={styles.statLabel}>Activities</Text>
          </View>
        </View>

        <View style={styles.weekSection}>
          <Text style={styles.sectionTitle}>This Week</Text>
          <View style={styles.weekGrid}>
            {days.map((day) => {
              const scoreData = weekScores.find(
                (s: any) => getDayName(s.date) === day,
              );
              const score = scoreData ? Math.round(scoreData.score) : null;
              const isToday = getDayName(getToday()) === day;

              return (
                <View
                  key={day}
                  style={[
                    styles.dayColumn,
                    isToday && styles.dayColumnToday,
                  ]}
                >
                  <View
                    style={[
                      styles.dayBar,
                      {
                        height: score ? Math.max(8, (score / 100) * 80) : 8,
                        backgroundColor: score
                          ? getScoreColor(score)
                          : Colors.light.border,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.dayScore,
                      score !== null && { color: Colors.light.text },
                    ]}
                  >
                    {score !== null ? score : "-"}
                  </Text>
                  <Text
                    style={[
                      styles.dayLabel,
                      isToday && { color: Colors.light.tint, fontWeight: "700" as const },
                    ]}
                  >
                    {day}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {todayEntries.length > 0 && (
          <View style={styles.recentSection}>
            <Text style={styles.sectionTitle}>Today's Activities</Text>
            {todayEntries.slice(0, 5).map((entry: any) => (
              <View key={entry.id} style={styles.entryRow}>
                <View
                  style={[
                    styles.entryDot,
                    {
                      backgroundColor: entry.completed
                        ? Colors.light.accent
                        : Colors.light.textSecondary,
                    },
                  ]}
                />
                <View style={styles.entryInfo}>
                  <Text style={styles.entryTitle}>{entry.title}</Text>
                  <Text style={styles.entryMeta}>
                    {entry.category} - {entry.duration}min
                  </Text>
                </View>
                {entry.completed && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={Colors.light.accent}
                  />
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "800" as const,
    color: Colors.light.text,
    letterSpacing: -0.3,
  },
  dateText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  scoreCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  scoreHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  scoreTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.light.textSecondary,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  scoreContent: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 12,
  },
  scoreNumber: {
    fontSize: 56,
    fontWeight: "800" as const,
    letterSpacing: -2,
  },
  scoreLabel: {
    fontSize: 20,
    color: Colors.light.textSecondary,
    fontWeight: "500" as const,
    marginLeft: 4,
  },
  insightText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 6,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: Colors.light.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontWeight: "500" as const,
  },
  weekSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: Colors.light.text,
    marginBottom: 14,
  },
  weekGrid: {
    flexDirection: "row",
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 16,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  dayColumn: {
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  dayColumnToday: {
    backgroundColor: Colors.light.tintLight,
    borderRadius: 10,
    paddingVertical: 8,
    marginVertical: -8,
  },
  dayBar: {
    width: 16,
    borderRadius: 8,
    minHeight: 8,
  },
  dayScore: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.light.textSecondary,
  },
  dayLabel: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    fontWeight: "500" as const,
  },
  recentSection: {
    marginBottom: 24,
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  entryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  entryInfo: {
    flex: 1,
  },
  entryTitle: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.light.text,
  },
  entryMeta: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
});
