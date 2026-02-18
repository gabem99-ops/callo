import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { WelcomeScreen } from "@/screens/onboarding/WelcomeScreen";
import { IndustryScreen } from "@/screens/onboarding/IndustryScreen";
import { UseCasesScreen } from "@/screens/onboarding/UseCasesScreen";
import { BusinessDetailsScreen } from "@/screens/onboarding/BusinessDetailsScreen";
import { VoiceSelectionScreen } from "@/screens/onboarding/VoiceSelectionScreen";
import { ReviewScreen } from "@/screens/onboarding/ReviewScreen";
import { CompletionScreen } from "@/screens/onboarding/CompletionScreen";
import { colors } from "@/lib/theme";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OnboardingStackParamList = {
  Welcome: undefined;
  Industry: undefined;
  UseCases: { industryId: string };
  BusinessDetails: { industryId: string; useCases: string[] };
  VoiceSelection: {
    industryId: string;
    useCases: string[];
    businessName: string;
    phone?: string;
    timezone: string;
  };
  Review: {
    industryId: string;
    useCases: string[];
    businessName: string;
    phone?: string;
    timezone: string;
    voiceId: string;
  };
  Completion: { businessName: string };
};

// ---------------------------------------------------------------------------
// Stack
// ---------------------------------------------------------------------------

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Industry" component={IndustryScreen} />
      <Stack.Screen name="UseCases" component={UseCasesScreen} />
      <Stack.Screen name="BusinessDetails" component={BusinessDetailsScreen} />
      <Stack.Screen name="VoiceSelection" component={VoiceSelectionScreen} />
      <Stack.Screen name="Review" component={ReviewScreen} />
      <Stack.Screen name="Completion" component={CompletionScreen} />
    </Stack.Navigator>
  );
}
