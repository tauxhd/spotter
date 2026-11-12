import { Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold, useFonts } from '@expo-google-fonts/geist';
import { DarkTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import Onboarding from '@/components/onboarding';
import { ThemedText } from '@/components/themed-text';
import { Splash } from '@/components/ui/kit';
import { Colors, Lime } from '@/constants/theme';
import { StoreProvider, useStatus } from '@/lib/store';

SplashScreen.preventAutoHideAsync();

// Spotter is a dark app, like the website on a phone.
const theme = { ...DarkTheme, colors: { ...DarkTheme.colors, primary: Lime, background: Colors.dark.background, card: Colors.dark.background, border: Colors.dark.border } };

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={theme}>
        <StoreProvider>
          <AnimatedSplashOverlay />
          <Gate />
        </StoreProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

// Signed in and set up → the app (tabs, with pages pushed over them); first launch → profile setup.
function Gate() {
  const st = useStatus();
  const [fonts] = useFonts({ Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold }); // the website's font
  if (!fonts) return <Splash />;
  if (st.kind === 'onboarding') return <Onboarding onSave={st.save} />;
  if (st.kind === 'loading') return <Splash />;
  if (st.kind === 'error') return <View style={styles.center}><ThemedText>Couldn&apos;t connect: {st.message}</ThemedText></View>;
  return (
    <Stack screenOptions={{ headerTintColor: Lime, headerTitleStyle: { color: Colors.dark.text, fontFamily: 'Geist_600SemiBold' }, headerShadowVisible: false, headerBackButtonDisplayMode: 'minimal', contentStyle: { backgroundColor: Colors.dark.background } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="finish" options={{ title: 'Finish workout', presentation: 'modal' }} />
      <Stack.Screen name="exercise/[id]" options={{ title: '' }} />
      <Stack.Screen name="post/[id]" options={{ title: 'Workout' }} />
      <Stack.Screen name="u/[id]" options={{ title: '' }} />
      <Stack.Screen name="me" options={{ title: 'Profile' }} />
      <Stack.Screen name="stats/[id]" options={{ title: 'Gym stats' }} />
      <Stack.Screen name="map" options={{ title: 'Gym map' }} />
      <Stack.Screen name="routine" options={{ title: 'Routine' }} />
      <Stack.Screen name="food/[id]" options={{ title: '' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({ center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 } });
