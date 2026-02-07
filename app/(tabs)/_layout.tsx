import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { Platform, StyleSheet, useColorScheme, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import React from "react";
import Colors from "@/constants/colors";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "chart.bar", selected: "chart.bar.fill" }} />
        <Label>Dashboard</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="log">
        <Icon sf={{ default: "plus.circle", selected: "plus.circle.fill" }} />
        <Label>Log</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="scoreboard">
        <Icon sf={{ default: "trophy", selected: "trophy.fill" }} />
        <Label>Board</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="coach">
        <Icon sf={{ default: "sparkles", selected: "sparkles" }} />
        <Label>Coach</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isWeb = Platform.OS === "web";
  const isIOS = Platform.OS === "ios";
  const safeAreaInsets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.light.tint,
        tabBarInactiveTintColor: Colors.light.tabIconDefault,
        tabBarStyle: {
          position: "absolute" as const,
          backgroundColor: isIOS ? "transparent" : isDark ? "#000" : "#fff",
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: isDark ? "#333" : "#ccc",
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: isDark ? "#000" : "#fff" },
              ]}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "bar-chart" : "bar-chart-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: "Log",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "add-circle" : "add-circle-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="scoreboard"
        options={{
          title: "Board",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "trophy" : "trophy-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: "Coach",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "sparkles" : "sparkles-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
