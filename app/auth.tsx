import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth-context";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";

type Mode = "login" | "register";

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [occupation, setOccupation] = useState("");
  const [goals, setGoals] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const fullNameRef = useRef<TextInput>(null);
  const occupationRef = useRef<TextInput>(null);
  const goalsRef = useRef<TextInput>(null);

  async function handleSubmit() {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setLoading(true);
    try {
      if (mode === "login") {
        if (!username || !password) {
          Alert.alert("Missing Fields", "Please enter username and password.");
          setLoading(false);
          return;
        }
        await login(username, password);
      } else {
        if (!username || !password || !email || !fullName || !occupation || !goals) {
          Alert.alert("Missing Fields", "Please fill in all fields.");
          setLoading(false);
          return;
        }
        await register({ username, email, password, fullName, occupation, goals });
      }
    } catch (error: any) {
      const msg = error?.message || "Something went wrong";
      Alert.alert("Error", msg.includes(":") ? msg.split(": ").slice(1).join(": ") : msg);
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    setMode(mode === "login" ? "register" : "login");
  }

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.container, { backgroundColor: Colors.light.background }]}>
      <KeyboardAwareScrollViewCompat
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 40 + webTopInset,
          paddingBottom: insets.bottom + 40 + (Platform.OS === "web" ? 34 : 0),
          paddingHorizontal: 24,
        }}
        bottomOffset={40}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerArea}>
          <View style={styles.logoCircle}>
            <Ionicons name="flash" size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.appName}>PeakFlow</Text>
          <Text style={styles.tagline}>
            {mode === "login"
              ? "Welcome back. Let's keep the momentum."
              : "Start your productivity journey."}
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username</Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="person-outline"
                size={18}
                color={Colors.light.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Enter username"
                placeholderTextColor={Colors.light.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() =>
                  mode === "register" ? emailRef.current?.focus() : passwordRef.current?.focus()
                }
              />
            </View>
          </View>

          {mode === "register" && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="mail-outline"
                    size={18}
                    color={Colors.light.textSecondary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    ref={emailRef}
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    placeholderTextColor={Colors.light.textSecondary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    returnKeyType="next"
                    onSubmitEditing={() => fullNameRef.current?.focus()}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name</Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="id-card-outline"
                    size={18}
                    color={Colors.light.textSecondary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    ref={fullNameRef}
                    style={styles.input}
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="John Doe"
                    placeholderTextColor={Colors.light.textSecondary}
                    returnKeyType="next"
                    onSubmitEditing={() => occupationRef.current?.focus()}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Occupation</Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="briefcase-outline"
                    size={18}
                    color={Colors.light.textSecondary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    ref={occupationRef}
                    style={styles.input}
                    value={occupation}
                    onChangeText={setOccupation}
                    placeholder="Software Engineer"
                    placeholderTextColor={Colors.light.textSecondary}
                    returnKeyType="next"
                    onSubmitEditing={() => goalsRef.current?.focus()}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Productivity Goals</Text>
                <View style={[styles.inputContainer, { minHeight: 80, alignItems: "flex-start" }]}>
                  <Ionicons
                    name="flag-outline"
                    size={18}
                    color={Colors.light.textSecondary}
                    style={[styles.inputIcon, { marginTop: 14 }]}
                  />
                  <TextInput
                    ref={goalsRef}
                    style={[styles.input, { minHeight: 60, textAlignVertical: "top" }]}
                    value={goals}
                    onChangeText={setGoals}
                    placeholder="e.g., Ship 2 features per week, exercise daily"
                    placeholderTextColor={Colors.light.textSecondary}
                    multiline
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                  />
                </View>
              </View>
            </>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={Colors.light.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                ref={passwordRef}
                style={[styles.input, { flex: 1 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter password"
                placeholderTextColor={Colors.light.textSecondary}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={Colors.light.textSecondary}
                />
              </Pressable>
            </View>
          </View>

          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            style={({ pressed }) => [
              styles.submitBtn,
              { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitText}>
                {mode === "login" ? "Sign In" : "Create Account"}
              </Text>
            )}
          </Pressable>

          <Pressable onPress={switchMode} style={styles.switchBtn}>
            <Text style={styles.switchText}>
              {mode === "login"
                ? "Don't have an account? Sign Up"
                : "Already have an account? Sign In"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerArea: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.light.tint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  appName: {
    fontSize: 28,
    fontWeight: "800" as const,
    color: Colors.light.text,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    marginTop: 6,
    textAlign: "center",
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.light.text,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 15,
    color: Colors.light.text,
  },
  eyeBtn: {
    padding: 8,
  },
  submitBtn: {
    backgroundColor: Colors.light.tint,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700" as const,
  },
  switchBtn: {
    alignItems: "center",
    paddingVertical: 12,
  },
  switchText: {
    fontSize: 14,
    color: Colors.light.tint,
    fontWeight: "500" as const,
  },
});
