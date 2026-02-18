// ---------------------------------------------------------------------------
// CallsScreen — stack navigator wrapping the call list and call detail screens.
// This is the entry point referenced by MainTabs for the "Calls" tab.
// ---------------------------------------------------------------------------

import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { CallListScreen } from "./CallListScreen";
import { CallDetailScreen } from "./CallDetailScreen";
import { colors } from "@/lib/theme";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CallsStackParamList = {
  CallList: undefined;
  CallDetail: { callId: string };
};

// ---------------------------------------------------------------------------
// Stack
// ---------------------------------------------------------------------------

const Stack = createNativeStackNavigator<CallsStackParamList>();

export function CallsScreen() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="CallList" component={CallListScreen} />
      <Stack.Screen name="CallDetail" component={CallDetailScreen} />
    </Stack.Navigator>
  );
}
