import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  FlatList,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { apiRequest, queryClient, getApiUrl } from "@/lib/query-client";
import { fetch } from "expo/fetch";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";

const CATEGORIES = [
  { key: "work", label: "Work", icon: "briefcase" as const, color: "#4F46E5" },
  { key: "learning", label: "Learning", icon: "book" as const, color: "#8B5CF6" },
  { key: "exercise", label: "Exercise", icon: "fitness" as const, color: "#10B981" },
  { key: "creative", label: "Creative", icon: "color-palette" as const, color: "#F59E0B" },
  { key: "health", label: "Health", icon: "heart" as const, color: "#EF4444" },
  { key: "social", label: "Social", icon: "people" as const, color: "#3B82F6" },
];

const DURATIONS = [15, 30, 45, 60, 90, 120];

function getToday() {
  return new Date().toISOString().split("T")[0];
}

export default function LogScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("work");
  const [duration, setDuration] = useState(30);
  const [completed, setCompleted] = useState(true);
  const [notes, setNotes] = useState("");
  const [showForm, setShowForm] = useState(false);

  const entriesQuery = useQuery<any[]>({
    queryKey: ["/api/entries"],
    queryFn: async () => {
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}api/entries?date=${getToday()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/entries", {
        title,
        category,
        duration,
        completed,
        notes: notes || null,
        date: getToday(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/scores/daily"] });
      setTitle("");
      setNotes("");
      setCategory("work");
      setDuration(30);
      setCompleted(true);
      setShowForm(false);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (error: any) => {
      Alert.alert("Error", error?.message || "Failed to add activity");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/entries/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/scores/daily"] });
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
  });

  function handleAdd() {
    if (!title.trim()) {
      Alert.alert("Required", "Please enter an activity name");
      return;
    }
    addMutation.mutate();
  }

  function handleDelete(id: number) {
    Alert.alert("Delete", "Remove this activity?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(id) },
    ]);
  }

  const entries = entriesQuery.data || [];

  function renderEntry({ item }: { item: any }) {
    const cat = CATEGORIES.find((c) => c.key === item.category);
    return (
      <Pressable
        onLongPress={() => handleDelete(item.id)}
        style={styles.entryCard}
      >
        <View style={[styles.categoryIcon, { backgroundColor: cat?.color + "18" }]}>
          <Ionicons name={cat?.icon || "ellipse"} size={20} color={cat?.color || "#666"} />
        </View>
        <View style={styles.entryDetails}>
          <Text style={styles.entryTitle}>{item.title}</Text>
          <Text style={styles.entryMeta}>
            {cat?.label} &middot; {item.duration}min
            {item.notes ? ` &middot; ${item.notes}` : ""}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: item.completed
                ? Colors.light.accentLight
                : Colors.light.warningLight,
            },
          ]}
        >
          <Ionicons
            name={item.completed ? "checkmark" : "time-outline"}
            size={14}
            color={item.completed ? Colors.light.accent : Colors.light.warning}
          />
        </View>
      </Pressable>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors.light.background }]}>
      <View style={[styles.headerBar, { paddingTop: insets.top + 12 + webTopInset }]}>
        <Text style={styles.headerTitle}>Log Activity</Text>
        <Pressable
          onPress={() => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowForm(!showForm);
          }}
          style={({ pressed }) => [
            styles.addBtn,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Ionicons name={showForm ? "close" : "add"} size={24} color={Colors.light.tint} />
        </Pressable>
      </View>

      {showForm && (
        <View style={styles.formContainer}>
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder="What did you do?"
            placeholderTextColor={Colors.light.textSecondary}
          />

          <Text style={styles.formLabel}>Category</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat.key}
                onPress={() => {
                  setCategory(cat.key);
                  if (Platform.OS !== "web") Haptics.selectionAsync();
                }}
                style={[
                  styles.categoryChip,
                  category === cat.key && {
                    backgroundColor: cat.color + "18",
                    borderColor: cat.color,
                  },
                ]}
              >
                <Ionicons
                  name={cat.icon}
                  size={16}
                  color={category === cat.key ? cat.color : Colors.light.textSecondary}
                />
                <Text
                  style={[
                    styles.categoryChipText,
                    category === cat.key && { color: cat.color },
                  ]}
                >
                  {cat.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.formLabel}>Duration (minutes)</Text>
          <View style={styles.durationRow}>
            {DURATIONS.map((d) => (
              <Pressable
                key={d}
                onPress={() => {
                  setDuration(d);
                  if (Platform.OS !== "web") Haptics.selectionAsync();
                }}
                style={[
                  styles.durationChip,
                  duration === d && styles.durationChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.durationText,
                    duration === d && styles.durationTextActive,
                  ]}
                >
                  {d}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={() => {
              setCompleted(!completed);
              if (Platform.OS !== "web") Haptics.selectionAsync();
            }}
            style={styles.completedToggle}
          >
            <Ionicons
              name={completed ? "checkmark-circle" : "ellipse-outline"}
              size={22}
              color={completed ? Colors.light.accent : Colors.light.textSecondary}
            />
            <Text style={styles.completedText}>
              {completed ? "Completed" : "In Progress"}
            </Text>
          </Pressable>

          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes (optional)"
            placeholderTextColor={Colors.light.textSecondary}
            multiline
          />

          <Pressable
            onPress={handleAdd}
            disabled={addMutation.isPending}
            style={({ pressed }) => [
              styles.submitBtn,
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            {addMutation.isPending ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="add-circle" size={20} color="#FFF" />
                <Text style={styles.submitText}>Add Activity</Text>
              </>
            )}
          </Pressable>
        </View>
      )}

      <FlatList
        data={entries}
        renderItem={renderEntry}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 100 + (Platform.OS === "web" ? 34 : 0),
          paddingTop: showForm ? 0 : 8,
        }}
        scrollEnabled={entries.length > 0}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="clipboard-outline" size={48} color={Colors.light.border} />
            <Text style={styles.emptyTitle}>No activities today</Text>
            <Text style={styles.emptySubtitle}>
              Tap the + button to log your first activity
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800" as const,
    color: Colors.light.text,
  },
  addBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  formContainer: {
    marginHorizontal: 20,
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: Colors.light.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  titleInput: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.light.text,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    paddingBottom: 12,
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.light.textSecondary,
    marginBottom: 8,
    textTransform: "uppercase" as const,
    letterSpacing: 0.3,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.background,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: Colors.light.textSecondary,
  },
  durationRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  durationChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.light.border,
    alignItems: "center",
    backgroundColor: Colors.light.background,
  },
  durationChipActive: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  durationText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.light.textSecondary,
  },
  durationTextActive: {
    color: "#FFFFFF",
  },
  completedToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  completedText: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: Colors.light.text,
  },
  notesInput: {
    fontSize: 14,
    color: Colors.light.text,
    backgroundColor: Colors.light.background,
    borderRadius: 10,
    padding: 12,
    minHeight: 48,
    marginBottom: 16,
    textAlignVertical: "top" as const,
  },
  submitBtn: {
    backgroundColor: Colors.light.tint,
    height: 48,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700" as const,
  },
  entryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    shadowColor: Colors.light.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  entryDetails: {
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
  statusBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
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
  },
});
