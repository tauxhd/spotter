// Set-type picker (the website's SetTypeSheet): 2-column grid, descriptions behind an (i) so it never needs scrolling.
import { Info, X } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { setTypes, type SetType } from '@shared/data';
import { ThemedText } from '@/components/themed-text';
import { Lime } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { setTypeColor } from '@/lib/tw';

const normal = { label: 'Normal', short: '1', color: '', hint: 'Numbered working set' };

export default function SetTypeSheet({ open, current, onPick, onClose }: { open: boolean; current?: SetType; onPick: (t: SetType | undefined) => void; onClose: () => void }) {
  const theme = useTheme();
  const options = [[undefined, normal], ...Object.entries(setTypes)] as [SetType | undefined, typeof normal][];
  const [info, setInfo] = useState<string | null>(null);
  const shown = options.find(([, v]) => v.label === info);
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose}>
        <Animated.View entering={ZoomIn.springify().dampingRatio(1).duration(350)} style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <Pressable>
            <View style={styles.head}>
              <ThemedText type="smallBold" style={{ fontSize: 16 }}>Set type</ThemedText>
              <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Close"><X size={18} color={theme.textSecondary} /></Pressable>
            </View>
            <View style={styles.grid}>
              {options.map(([k, v]) => {
                const on = current === k;
                return (
                  <View key={k ?? 'normal'} style={[styles.opt, { backgroundColor: on ? 'rgba(132,204,22,0.15)' : theme.backgroundSelected, borderColor: on ? Lime : 'transparent' }]}>
                    <Pressable onPress={() => onPick(k)} style={styles.optMain}>
                      <View style={[styles.badge, { backgroundColor: theme.background }]}><ThemedText type="smallBold" style={{ fontSize: 12, color: setTypeColor(k) ?? theme.text }}>{v.short}</ThemedText></View>
                      <ThemedText type="smallBold" numberOfLines={1} style={{ flex: 1 }}>{v.label}</ThemedText>
                    </Pressable>
                    <Pressable onPress={() => setInfo(info === v.label ? null : v.label)} hitSlop={6} style={{ padding: 8 }} accessibilityLabel={`What is ${v.label}?`}>
                      <Info size={15} color={info === v.label ? Lime : theme.textSecondary} />
                    </Pressable>
                  </View>
                );
              })}
            </View>
            {shown && (
              <View style={[styles.note, { backgroundColor: theme.backgroundSelected }]}>
                <ThemedText type="smallBold" style={{ fontSize: 12, color: setTypeColor(shown[0]) ?? theme.text }}>{shown[1].short}</ThemedText>
                <ThemedText type="small" style={{ flex: 1, fontSize: 12 }}><ThemedText type="smallBold" style={{ fontSize: 12 }}>{shown[1].label}:</ThemedText> {shown[1].hint}</ThemedText>
              </View>
            )}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: { width: '100%', maxWidth: 380, borderRadius: 8, padding: 16 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  opt: { width: '48.8%', flexDirection: 'row', alignItems: 'center', borderRadius: 5, borderWidth: 1 },
  optMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingLeft: 8 },
  badge: { width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  note: { flexDirection: 'row', gap: 8, borderRadius: 5, paddingHorizontal: 12, paddingVertical: 8, marginTop: 8 },
});
