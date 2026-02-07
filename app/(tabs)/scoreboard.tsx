import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { getQueryFn } from "@/lib/query-client";
import { useAuth } from "@/lib/auth-context";
import Colors from "@/constants/colors";

interface ScoreboardEntry {
  userId: number;
  fullName: string;
  occupation: string;
  avgScore: number;
  totalEntries: number;
}

function getMedalColor(rank: number) {
  if (rank === 1) return Colors.light.gold;
  if (rank === 2) return Colors.light.silver;
  if (rank === 3) return Colors.light.bronze;
  return Colors.light.textSecondary;
}

function getMedalIcon(rank: number): "trophy" | "medal" | "ribbon" | "ellipse" {
  if (rank === 1) return "trophy";
  if (rank === 2) return "medal";
  if (rank === 3) return "ribbon";
  return "ellipse";
}

export default function ScoreboardScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const scoreboardQuery = useQuery<{
    weekStart: string;
    scoreboard: ScoreboardEntry[];
  }>({
    queryKey: ["/api/scoreboard"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const scoreboard = scoreboardQuery.data?.scoreboard || [];
  const weekStart = scoreboardQuery.data?.weekStart;

  function formatWeek(ws: string) {
    const d = new Date(ws + "T12:00:00");
    const end = new Date(d);
    end.setDate(d.getDate() + 6);
    return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors.light.background }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 12 + webTopInset,
          paddingBottom: 100 + (Platform.OS === "web" ? 34 : 0),
          paddingHorizontal: 20,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
        bounces={true}
        refreshControl={
          <RefreshControl
            refreshing={!!scoreboardQuery.isRefetching}
            onRefresh={() => scoreboardQuery.refetch()}
            tintColor={Colors.light.tint}
          />
        }
      >
        <View style={styles.headerBar}>
          <Text style={styles.headerTitle}>Scoreboard</Text>
          {weekStart && (
            <Text style={styles.weekLabel}>{formatWeek(weekStart)}</Text>
          )}
        </View>

        {scoreboard.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="podium-outline" size={48} color={Colors.light.border} />
            <Text style={styles.emptyTitle}>No scores yet</Text>
            <Text style={styles.emptySubtitle}>
              Log activities and get scored to appear on the board
            </Text>
          </View>
        ) : (
          scoreboard.map((item, index) => {
            const rank = index + 1;
            const isCurrentUser = item.userId === user?.id;
            const medalColor = getMedalColor(rank);

            return (
              <View
                key={item.userId}
                style={[
                  styles.entryCard,
                  isCurrentUser && styles.currentUserCard,
                ]}
              >
                <View style={styles.rankArea}>
                  {rank <= 3 ? (
                    <View style={[styles.medalCircle, { backgroundColor: medalColor + "20" }]}>
                      <Ionicons name={getMedalIcon(rank)} size={18} color={medalColor} />
                    </View>
                  ) : (
                    <Text style={styles.rankNumber}>#{rank}</Text>
                  )}
                </View>

                <View style={styles.userInfo}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.userName, isCurrentUser && { color: Colors.light.tint }]}>
                      {item.fullName}
                    </Text>
                    {isCurrentUser && (
                      <View style={styles.youBadge}>
                        <Text style={styles.youBadgeText}>You</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.userOccupation}>{item.occupation}</Text>
                </View>

                <View style={styles.scoreArea}>
                  <Text style={[styles.scoreValue, rank <= 3 && { color: medalColor }]}>
                    {Math.round(item.avgScore)}
                  </Text>
                  <Text style={styles.scoreSuffix}>avg</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800" as const,
    color: Colors.light.text,
  },
  weekLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  entryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  currentUserCard: {
    borderWidth: 1.5,
    borderColor: Colors.light.tint,
  },
  rankArea: {
    width: 44,
    alignItems: "center",
    marginRight: 12,
  },
  medalCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  rankNumber: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.light.textSecondary,
  },
  userInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  userName: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.light.text,
  },
  youBadge: {
    backgroundColor: Colors.light.tintLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  youBadgeText: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: Colors.light.tint,
  },
  userOccupation: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  scoreArea: {
    alignItems: "center",
  },
  scoreValue: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: Colors.light.text,
  },
  scoreSuffix: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    fontWeight: "500" as const,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 80,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "600" as const,
    color: Colors.light.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: "center",
    paddingHorizontal: 40,
  },
});
