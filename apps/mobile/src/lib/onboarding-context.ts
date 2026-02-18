import { createContext, useContext } from "react";

/**
 * Context that provides a callback to signal onboarding completion.
 * The CompletionScreen calls this so App.tsx can switch from the
 * OnboardingStack to MainTabs.
 */
export const OnboardingCompleteContext = createContext<() => void>(() => {});

export const useOnboardingComplete = () => useContext(OnboardingCompleteContext);
