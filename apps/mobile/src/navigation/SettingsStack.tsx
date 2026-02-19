import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { SettingsScreen } from "@/screens/settings/SettingsScreen";
import { BusinessProfileScreen } from "@/screens/settings/BusinessProfileScreen";
import { PhoneNumbersScreen } from "@/screens/settings/PhoneNumbersScreen";
import { IntegrationsScreen } from "@/screens/settings/IntegrationsScreen";
import { colors } from "@/lib/theme";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SettingsStackParamList = {
  SettingsHome: undefined;
  BusinessProfile: undefined;
  PhoneNumbers: undefined;
  Integrations: undefined;
};

// ---------------------------------------------------------------------------
// Stack
// ---------------------------------------------------------------------------

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export function SettingsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="SettingsHome" component={SettingsScreen} />
      <Stack.Screen name="BusinessProfile" component={BusinessProfileScreen} />
      <Stack.Screen name="PhoneNumbers" component={PhoneNumbersScreen} />
      <Stack.Screen name="Integrations" component={IntegrationsScreen} />
    </Stack.Navigator>
  );
}
