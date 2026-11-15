// Tells you when there's something newer, and lets you take it from inside the app. Checked when the app opens or comes
// back to the front (at most every 10 minutes):
//  - an over-the-air update (JS and pictures): downloaded in the background, then Restart applies it on the spot. An
//    in-progress workout survives the restart (the store keeps it on the device).
//  - a new APK (needed for native changes such as the launcher icon): the website's /app-version.json names the newest
//    build; if it's newer than this one, Download opens the APK.
// ponytail: public/app-version.json is hand-kept; bump it with each APK release (Actions > Android APK).
import * as Updates from 'expo-updates';
import { RefreshCw, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import Constants from 'expo-constants';
import { AppState, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Lime } from '@/constants/theme';
import { WEB } from '@/lib/web';

const EVERY = 10 * 60 * 1000; // ask at most every 10 minutes

export default function UpdateBanner() {
  const insets = useSafeAreaInsets();
  const [ready, setReady] = useState<{ ota: true } | { apk: string; url: string } | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return; // dev builds and Expo Go load JS from elsewhere
    let last = 0, busy = false;
    const check = async () => {
      if (busy || Date.now() - last < EVERY) return;
      busy = true; last = Date.now();
      try {
        const { isAvailable } = await Updates.checkForUpdateAsync();
        if (isAvailable && (await Updates.fetchUpdateAsync()).isNew) { setReady({ ota: true }); setHidden(false); }
      } catch {} // offline: try again next time
      try {
        const mine = Constants.platform?.android?.versionCode; // the installed APK's build number
        if (Platform.OS === 'android' && mine && WEB) {
          const v = await (await fetch(`${WEB}/app-version.json`, { cache: 'no-store' })).json();
          if (v.versionCode > mine) { setReady((r) => r ?? { apk: v.version, url: v.url }); setHidden(false); }
        }
      } catch {}
      busy = false;
    };
    check();
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') check(); });
    return () => sub.remove();
  }, []);

  if (!ready || hidden) return null;
  return (
    <Animated.View entering={FadeInUp.springify().dampingRatio(0.9)} exiting={FadeOutUp} style={[styles.wrap, { top: insets.top + 8 }]} pointerEvents="box-none">
      <View style={styles.pill}>
        <RefreshCw size={18} color={Lime} />
        <ThemedText style={{ flex: 1, fontWeight: '600' }}>{'ota' in ready ? 'A new version of Spotter is ready' : `Spotter ${ready.apk} is out`}</ThemedText>
        <Pressable onPress={() => ('ota' in ready ? Updates.reloadAsync() : Linking.openURL(ready.url)).catch(() => {})} accessibilityRole="button" style={({ pressed }) => [styles.go, { opacity: pressed ? 0.8 : 1 }]}>
          <ThemedText style={{ color: '#09090b', fontWeight: '700' }}>{'ota' in ready ? 'Restart' : 'Download'}</ThemedText>
        </Pressable>
        <Pressable onPress={() => setHidden(true)} hitSlop={10} accessibilityLabel="Later"><X size={18} color="#a1a1aa" /></Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12, zIndex: 100 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 14, paddingRight: 12, paddingVertical: 10, borderRadius: 14, backgroundColor: '#18181b', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.12)', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  go: { backgroundColor: Lime, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
});
