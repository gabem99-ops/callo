import React, { useState, useEffect } from "react";
import { StatusBar, ActivityIndicator, View, StyleSheet } from "react-native";
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";

import { AuthStack } from "@/navigation/AuthStack";
import { MainTabs } from "@/navigation/MainTabs";
import { OnboardingStack } from "@/navigation/OnboardingStack";
import { OnboardingCompleteContext } from "@/lib/onboarding-context";
import { api } from "@/lib/api";
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
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isSignedIn) {
      setOnboardingDone(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        api.setToken(token);
        const res = await api.getBusiness();
        if (!cancelled) {
          setOnboardingDone(res.data.onboardingCompleted ?? false);
        }
      } catch {
        // If business fetch fails, assume onboarding done to avoid blocking
        if (!cancelled) setOnboardingDone(true);
      }
    })();
    return () => { cancelled = true; };
  }, [isSignedIn, getToken]);

  if (!isLoaded || (isSignedIn && onboardingDone === null)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const handleOnboardingComplete = () => setOnboardingDone(true);

  return (
    <OnboardingCompleteContext.Provider value={handleOnboardingComplete}>
      <NavigationContainer theme={navigationTheme}>
        {!isSignedIn ? (
          <AuthStack />
        ) : onboardingDone ? (
          <MainTabs />
        ) : (
          <OnboardingStack />
        )}
      </NavigationContainer>
    </OnboardingCompleteContext.Provider>
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
