import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SplashScreen } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#1a1a1a" }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="chatScreen" options={{ headerShown: false }} />
          <Stack.Screen name="paymentScreen" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="light" />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
