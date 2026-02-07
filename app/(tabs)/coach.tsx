import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetch } from "expo/fetch";
import { getApiUrl, apiRequest, queryClient } from "@/lib/query-client";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

let msgCounter = 0;
function generateId(): string {
  msgCounter++;
  return `msg-${Date.now()}-${msgCounter}-${Math.random().toString(36).substr(2, 9)}`;
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <View
      style={[
        styles.bubbleRow,
        isUser ? styles.bubbleRowUser : styles.bubbleRowAssistant,
      ]}
    >
      {!isUser && (
        <View style={styles.avatarCircle}>
          <Ionicons name="sparkles" size={14} color={Colors.light.tint} />
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAssistant,
        ]}
      >
        <Text
          style={[
            styles.bubbleText,
            isUser ? styles.bubbleTextUser : styles.bubbleTextAssistant,
          ]}
        >
          {message.content}
        </Text>
      </View>
    </View>
  );
}

function TypingIndicator() {
  return (
    <View style={[styles.bubbleRow, styles.bubbleRowAssistant]}>
      <View style={styles.avatarCircle}>
        <Ionicons name="sparkles" size={14} color={Colors.light.tint} />
      </View>
      <View style={[styles.bubble, styles.bubbleAssistant]}>
        <View style={styles.typingDots}>
          <View style={[styles.dot, { opacity: 0.4 }]} />
          <View style={[styles.dot, { opacity: 0.6 }]} />
          <View style={[styles.dot, { opacity: 0.8 }]} />
        </View>
      </View>
    </View>
  );
}

export default function CoachScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const initializedRef = useRef(false);

  const historyQuery = useQuery<any[]>({
    queryKey: ["/api/chat/messages"],
    queryFn: async () => {
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}api/chat/messages`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  useEffect(() => {
    if (historyQuery.data && !initializedRef.current) {
      const mapped = historyQuery.data.map((m: any) => ({
        id: generateId(),
        role: m.role as "user" | "assistant",
        content: m.content,
      }));
      setMessages(mapped);
      initializedRef.current = true;
    }
  }, [historyQuery.data]);

  const clearMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/chat/messages"),
    onSuccess: () => {
      setMessages([]);
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
    },
  });

  async function handleSend() {
    const text = inputText.trim();
    if (!text || isStreaming) return;

    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInputText("");

    const currentMessages = [...messages];
    const userMsg: Message = { id: generateId(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);
    setShowTyping(true);

    try {
      const baseUrl = getApiUrl();
      const response = await fetch(`${baseUrl}api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({ message: text }),
        credentials: "include",
      });

      if (!response.ok) throw new Error("Failed to get response");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let fullContent = "";
      let buffer = "";
      let assistantAdded = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              fullContent += parsed.content;
              if (!assistantAdded) {
                setShowTyping(false);
                setMessages((prev) => [
                  ...prev,
                  { id: generateId(), role: "assistant", content: fullContent },
                ]);
                assistantAdded = true;
              } else {
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: fullContent,
                  };
                  return updated;
                });
              }
            }
          } catch {}
        }
      }
    } catch (error) {
      setShowTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "assistant",
          content: "Sorry, I had trouble responding. Please try again.",
        },
      ]);
    } finally {
      setIsStreaming(false);
      setShowTyping(false);
    }
  }

  const reversedMessages = [...messages].reverse();

  return (
    <View style={[styles.container, { backgroundColor: Colors.light.background }]}>
      <View style={[styles.headerBar, { paddingTop: insets.top + 12 + webTopInset }]}>
        <View>
          <Text style={styles.headerTitle}>AI Coach</Text>
          <Text style={styles.headerSubtitle}>Your productivity advisor</Text>
        </View>
        <Pressable
          onPress={() => clearMutation.mutate()}
          style={styles.clearBtn}
        >
          <Ionicons name="trash-outline" size={20} color={Colors.light.textSecondary} />
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
        <FlatList
          data={reversedMessages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          inverted={messages.length > 0}
          ListHeaderComponent={showTyping ? <TypingIndicator /> : null}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.messagesList,
            messages.length === 0 && styles.emptyList,
          ]}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="sparkles" size={32} color={Colors.light.tint} />
              </View>
              <Text style={styles.emptyTitle}>Your AI Coach</Text>
              <Text style={styles.emptySubtitle}>
                Ask for productivity tips, time management advice, or help with your goals
              </Text>
              <View style={styles.suggestionsGrid}>
                {[
                  "How can I be more productive today?",
                  "Help me plan my week",
                  "Tips for better focus",
                ].map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => {
                      setInputText(s);
                      if (Platform.OS !== "web") Haptics.selectionAsync();
                    }}
                    style={({ pressed }) => [
                      styles.suggestionChip,
                      { opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <Text style={styles.suggestionText}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          }
        />

        <View
          style={[
            styles.inputBar,
            { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) },
          ]}
        >
          <View style={styles.inputWrapper}>
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask your coach..."
              placeholderTextColor={Colors.light.textSecondary}
              multiline
              maxLength={1000}
              blurOnSubmit={false}
              onSubmitEditing={handleSend}
            />
            <Pressable
              onPress={() => {
                handleSend();
                inputRef.current?.focus();
              }}
              disabled={isStreaming || !inputText.trim()}
              style={({ pressed }) => [
                styles.sendBtn,
                {
                  opacity: inputText.trim() && !isStreaming ? (pressed ? 0.7 : 1) : 0.4,
                },
              ]}
            >
              {isStreaming ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons name="send" size={18} color="#FFF" />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    backgroundColor: Colors.light.surface,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800" as const,
    color: Colors.light.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  clearBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emptyList: {
    flex: 1,
    justifyContent: "center",
  },
  bubbleRow: {
    flexDirection: "row",
    marginBottom: 12,
    maxWidth: "85%",
  },
  bubbleRowUser: {
    alignSelf: "flex-end",
  },
  bubbleRowAssistant: {
    alignSelf: "flex-start",
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.light.tintLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    marginTop: 2,
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: "100%",
  },
  bubbleUser: {
    backgroundColor: Colors.light.tint,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: Colors.light.surface,
    borderBottomLeftRadius: 4,
    shadowColor: Colors.light.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
  },
  bubbleTextUser: {
    color: "#FFFFFF",
  },
  bubbleTextAssistant: {
    color: Colors.light.text,
  },
  typingDots: {
    flexDirection: "row",
    gap: 4,
    paddingVertical: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.textSecondary,
  },
  inputBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: Colors.light.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: Colors.light.background,
    borderRadius: 24,
    paddingLeft: 16,
    paddingRight: 4,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.light.text,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyChat: {
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.light.tintLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.light.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  suggestionsGrid: {
    gap: 8,
    marginTop: 8,
    width: "100%",
  },
  suggestionChip: {
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  suggestionText: {
    fontSize: 14,
    color: Colors.light.tint,
    fontWeight: "500" as const,
    textAlign: "center",
  },
});
