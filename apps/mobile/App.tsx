import React from "react";
import { StatusBar, ActivityIndicator, View, StyleSheet } from "react-native";
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";

import { AuthStack } from "@/navigation/AuthStack";
import { MainTabs } from "@/navigation/MainTabs";
import { colors } from "@/lib/theme";

// ---------------------------------------------------------------------------
// Clerk token cache backed by expo-secure-store
// ---------------------------------------------------------------------------

const tokenCache = {
  async getToken(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Silently fail
    }
  },
  clearToken(key: string): void {
    SecureStore.deleteItemAsync(key).catch(() => {});
  },
};

// ---------------------------------------------------------------------------
// Clerk publishable key
// ---------------------------------------------------------------------------

const CLERK_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

// ---------------------------------------------------------------------------
// Navigation theme (matches our dark palette)
// ---------------------------------------------------------------------------

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.background,
    border: colors.border,
    text: colors.textPrimary,
    primary: colors.primary,
    notification: colors.error,
  },
};

// ---------------------------------------------------------------------------
// Root navigator: signed-in vs signed-out
// ---------------------------------------------------------------------------

function RootNavigator() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      {isSignedIn ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}

// ---------------------------------------------------------------------------
// App entry point
// ---------------------------------------------------------------------------

export default function App() {
  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      tokenCache={tokenCache}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <RootNavigator />
    </ClerkProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
});
