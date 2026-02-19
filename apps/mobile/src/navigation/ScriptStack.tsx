import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { ScriptManagerScreen } from "@/screens/scripts/ScriptManagerScreen";
import { EditGreetingScreen } from "@/screens/scripts/EditGreetingScreen";
import { ChangeVoiceScreen } from "@/screens/scripts/ChangeVoiceScreen";
import { ManageFAQsScreen } from "@/screens/scripts/ManageFAQsScreen";
import { ChangeToneScreen } from "@/screens/scripts/ChangeToneScreen";
import { ViewPromptScreen } from "@/screens/scripts/ViewPromptScreen";
import { colors } from "@/lib/theme";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ScriptStackParamList = {
  ScriptManager: undefined;
  EditGreeting: { scriptId: string; currentGreeting: string };
  ChangeVoice: { scriptId: string; currentVoiceId: string };
  ManageFAQs: { scriptId: string };
  ChangeTone: { scriptId: string; currentTone: string };
  ViewPrompt: { scriptId: string };
};

// ---------------------------------------------------------------------------
// Stack
// ---------------------------------------------------------------------------

const Stack = createNativeStackNavigator<ScriptStackParamList>();

export function ScriptStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="ScriptManager" component={ScriptManagerScreen} />
      <Stack.Screen name="EditGreeting" component={EditGreetingScreen} />
      <Stack.Screen name="ChangeVoice" component={ChangeVoiceScreen} />
      <Stack.Screen name="ManageFAQs" component={ManageFAQsScreen} />
      <Stack.Screen name="ChangeTone" component={ChangeToneScreen} />
      <Stack.Screen name="ViewPrompt" component={ViewPromptScreen} />
    </Stack.Navigator>
  );
}
