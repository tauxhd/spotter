// Workout: which plates go on each side of the bar (the website's PlateCalc). Opens on the exercise's heaviest set; type
// any weight, switch the bar.
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { PLATE_COLOR, platesFor } from '@shared/lifting';
import { ThemedText } from '@/components/themed-text';
import { Lime } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const BARS = [20, 15, 10];
const fmt = (n: number) => String(Math.round(n * 100) / 100);

export default function PlateCalc({ name, start, bar: bar0 = 20, onClose }: { name: string; start: number; bar?: number; onClose: () => void }) {
  const theme = useTheme();
  const [kg, setKg] = useState(start ? fmt(start) : '');
  const [bar, setBar] = useState(bar0);
  const total = Number(kg) || 0;
  const { side, left } = platesFor(total, bar);
  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.backgroundElement }]} onPress={() => {}}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <ThemedText style={{ fontSize: 18, fontWeight: '700' }}>Plate calculator</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">{name}</ThemedText>
            </View>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close"><X size={22} color={theme.text} /></Pressable>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 16 }}>
            <TextInput value={kg} onChangeText={(v) => setKg(v.replace(/[^0-9.]/g, '').slice(0, 6))} keyboardType="decimal-pad" autoFocus accessibilityLabel="Total weight"
              style={[styles.input, { color: theme.text, backgroundColor: theme.background }]} />
            <ThemedText themeColor="textSecondary" style={{ fontWeight: '600' }}>kg total</ThemedText>
          </View>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 12 }}>
            {BARS.map((b) => (
              <Pressable key={b} onPress={() => setBar(b)} style={[styles.chip, { backgroundColor: bar === b ? Lime : theme.background }]}>
                <ThemedText type="smallBold" style={{ fontSize: 13, color: bar === b ? '#09090b' : theme.text }}>{b} kg bar</ThemedText>
              </Pressable>
            ))}
          </View>

          <View style={styles.barRow} accessibilityElementsHidden>
            {[...side].reverse().map((p, i) => <Plate key={`l${i}`} p={p} />)}
            <View style={{ height: 12, width: 90, borderRadius: 2, backgroundColor: '#a1a1aa' }} />
            {side.map((p, i) => <Plate key={`r${i}`} p={p} />)}
          </View>

          <ThemedText style={{ textAlign: 'center', fontSize: 17, fontWeight: '600', marginTop: 10 }}>
            {total <= bar ? (total ? `Just the bar (${bar} kg)` : 'Type a weight') : side.length ? `${side.map(fmt).join(' + ')} kg each side` : 'Too light for plates'}
          </ThemedText>
          {left > 0 && <ThemedText type="small" style={{ textAlign: 'center', marginTop: 4, color: '#f59e0b' }}>{fmt(left)} kg can&apos;t be made with standard plates</ThemedText>}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Plate({ p }: { p: number }) {
  return (
    <View style={[styles.plate, { height: 32 + (p / 25) * 76, width: p >= 10 ? 14 : 10, backgroundColor: PLATE_COLOR[p] }]}>
      <ThemedText style={{ fontSize: 8, fontWeight: '700', color: p === 5 || p === 1.25 ? '#18181b' : '#fff', transform: [{ rotate: '90deg' }], width: 30, textAlign: 'center' }}>{fmt(p)}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  input: { width: 130, fontSize: 30, fontWeight: '700', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999 },
  barRow: { height: 120, marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  plate: { marginHorizontal: 1, borderRadius: 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,0,0,0.2)' },
});
