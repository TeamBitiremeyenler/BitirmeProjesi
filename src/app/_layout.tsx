// src/app/_layout.tsx
import { SplashScreen, Stack, useRouter, useSegments } from "expo-router";
import { HeroUINativeProvider } from 'heroui-native';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import '../../global.css';
import '@/src/i18n/index';
import { Uniwind } from "uniwind";
import { initMixpanel } from '@/src/mixpanel';
import { KeyboardProvider } from "react-native-keyboard-controller";
import { useAuthContext } from "../hooks/auth-hooks";
import { useEffect, useState } from "react";
import AuthProvider from "../providers/auth-provider";

initMixpanel();
Uniwind.setTheme('tagged-light');

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { profile, isLoading, isLoggedIn } = useAuthContext();
  const segments = useSegments();
  const router = useRouter();
  const [isNavigationReady, setIsNavigationReady] = useState(false);

  // CRITICAL: All hooks must be called before any conditional returns
  // Navigation logic
  useEffect(() => {
    if (isLoading) return;

    const currentPath = segments[0] || "";
    const inAuthGroup = currentPath === "login" || currentPath === "register";
    const inOnboarding = currentPath === "onboarding";
    const isAtRoot = segments.length < 1;

    if (!isLoggedIn) {
      // User is not logged in
      // Allow them to stay on welcome (root), login, or register screens
      // Redirect from any other screen to welcome
      if (!inAuthGroup && !isAtRoot) {
        router.replace("/");
      }
    } else {
      // User is logged in
      if (!profile?.onboarding_completed) {
        // User hasn't completed onboarding
        // Force them to onboarding screen unless already there
        if (!inOnboarding) {
          router.replace("/onboarding");
        }
      } else {
        if (isAtRoot || inAuthGroup || inOnboarding) {
          router.replace("/home");
        }
      }
    }

    setIsNavigationReady(true);
  }, [isLoading, isLoggedIn, profile?.onboarding_completed, segments]);

  // Hide splash screen once navigation is ready
  useEffect(() => {
    if (isNavigationReady && !isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isNavigationReady, isLoading]);

  // Keep splash screen visible while auth is loading or navigation isn't ready
  if (isLoading || !isNavigationReady) {
    return null;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <AuthProvider>
        <KeyboardProvider>
          <HeroUINativeProvider>
            <RootLayoutNav />
          </HeroUINativeProvider>
        </KeyboardProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});