// Placeholder for tabs that haven't been ported from the website yet.
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export default function ComingNext({ title, icon, text }: { title: string; icon: number; text: string }) {
  const theme = useTheme();
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={styles.page}>
        <ThemedText style={styles.h1}>{title}</ThemedText>
        <View style={styles.center}>
          <Image source={icon} style={{ width: 88, height: 88 }} />
          <ThemedText type="smallBold" style={{ marginTop: 12 }}>Coming to the app next</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>{text}</ThemedText>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 16 },
  h1: { fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.6 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, paddingBottom: 80 },
});
