import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { ActivityIndicator, StyleSheet, useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import Onboarding from '@/components/onboarding';
import { ThemedText } from '@/components/themed-text';
import { Lime } from '@/constants/theme';
import { StoreProvider, useStatus } from '@/lib/store';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <StoreProvider>
          <AnimatedSplashOverlay />
          <Gate />
        </StoreProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

// Signed in and set up → the tabs; first launch → profile setup.
function Gate() {
  const st = useStatus();
  if (st.kind === 'ready') return <AppTabs />;
  if (st.kind === 'onboarding') return <Onboarding onSave={st.save} />;
  return (
    <View style={styles.center}>
      {st.kind === 'error' ? <ThemedText>Couldn&apos;t connect: {st.message}</ThemedText> : <ActivityIndicator color={Lime} />}
    </View>
  );
}

const styles = StyleSheet.create({ center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 } });
