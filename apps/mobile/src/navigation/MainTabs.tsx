import React from "react";
import { StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  LayoutDashboard,
  Phone,
  Bot,
  Radio,
  Settings,
} from "lucide-react-native";

import { DashboardScreen } from "@/screens/dashboard/DashboardScreen";
import { CallsScreen } from "@/screens/calls/CallsScreen";
import { ScriptStack } from "@/navigation/ScriptStack";
import LiveMonitorScreen from "@/screens/live/LiveMonitorScreen";
import { SettingsStack } from "@/navigation/SettingsStack";
import { colors } from "@/lib/theme";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MainTabsParamList = {
  Dashboard: undefined;
  Calls: undefined;
  Agent: undefined;
  Live: undefined;
  Settings: undefined;
};

// ---------------------------------------------------------------------------
// Tab navigator
// ---------------------------------------------------------------------------

const Tab = createBottomTabNavigator<MainTabsParamList>();

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 88,
          paddingBottom: 28,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <LayoutDashboard color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Calls"
        component={CallsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Phone color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Agent"
        component={ScriptStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Bot color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Live"
        component={LiveMonitorScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Radio color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Settings color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  pulsingDot: {
    position: "absolute",
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
});
