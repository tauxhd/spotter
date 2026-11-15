// Hand-off from the native splash (app.json: the Spotter logo, 96 wide, on #09090b) to the app: the same logo on the
// same colour, so there's no visible change, then it fades away. (Replaced the Expo template's blue screen with its "^".)
import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';

export function AnimatedSplashOverlay() {
  const [up, setUp] = useState(true);
  if (!up) return null;
  return (
    <Animated.View exiting={FadeOut.duration(250)} style={styles.overlay} pointerEvents="none">
      <View onLayout={() => { SplashScreen.hideAsync().finally(() => setTimeout(() => setUp(false), 150)); }}>
        <Image source={require('@/assets/images/spotter-icon.png')} style={styles.logo} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: '#09090b', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  logo: { width: 96, height: 96 },
});
