// A small (i) next to a word: tap it for a short explanation in a bubble anchored under it; tap anywhere to close.
// The website's twin is src/components/InfoTip.tsx; the words live in src/lib/help.ts.
import * as Haptics from 'expo-haptics';
import { Info } from 'lucide-react-native';
import { useRef, useState, type ComponentRef } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Lime } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function InfoTip({ text, label = 'More info', size = 15 }: { text: string; label?: string; size?: number }) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const ref = useRef<ComponentRef<typeof View>>(null);
  const [at, setAt] = useState<{ top: number; left: number; arrow: number } | null>(null);
  const w = Math.min(272, width - 24);

  function open() {
    Haptics.selectionAsync().catch(() => {});
    ref.current?.measureInWindow((x, y, bw, bh) => {
      const mid = x + bw / 2, left = Math.min(Math.max(12, mid - w / 2), width - 12 - w);
      setAt({ top: y + bh + 8, left, arrow: mid - left });
    });
  }

  return (
    <>
      <Pressable onPress={open} hitSlop={10} accessibilityRole="button" accessibilityLabel={label} accessibilityHint={text}>
        <View ref={ref} collapsable={false}><Info size={size} strokeWidth={2.25} color={at ? Lime : theme.textSecondary} /></View>
      </Pressable>
      <Modal visible={!!at} transparent animationType="none" onRequestClose={() => setAt(null)}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setAt(null)} accessibilityLabel="Close">
          {at && (
            <Animated.View entering={FadeIn.duration(120)} style={{ position: 'absolute', top: at.top, left: at.left, width: w }}>
              <Animated.View entering={ZoomIn.springify().dampingRatio(0.8).duration(300)} style={[styles.bubble, { backgroundColor: theme.backgroundSelected }]}>
                <View style={[styles.arrow, { left: at.arrow - 5, backgroundColor: theme.backgroundSelected }]} />
                <ThemedText style={styles.text}>{text}</ThemedText>
              </Animated.View>
            </Animated.View>
          )}
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bubble: { borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  arrow: { position: 'absolute', top: -5, width: 10, height: 10, transform: [{ rotate: '45deg' }] },
  text: { fontSize: 13, lineHeight: 18 },
});
