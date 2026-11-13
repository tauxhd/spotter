// Workout: choose which exercises go in a superset with this one (the website's SupersetPicker). Each superset has its own
// colour and letter; exercises already in another one show it, and picking them moves them over.
import { Check, X } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { Exercise, ExerciseLog } from '@shared/data';
import { ExerciseThumb } from '@/components/post-card';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Lime } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function SupersetPicker({ exercises, i, lib, hex, letter, onSave, onClose }: {
  exercises: ExerciseLog[]; i: number; lib: Map<string, Exercise>; hex: (g: number) => string; letter: (g?: number) => string;
  onSave: (chosen: number[]) => void; onClose: () => void;
}) {
  const theme = useTheme();
  const g = exercises[i].superset;
  const [pick, setPick] = useState(() => new Set(exercises.flatMap((e, k) => (k !== i && g !== undefined && e.superset === g ? [k] : []))));
  const toggle = (k: number) => setPick((p) => { const n = new Set(p); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.backgroundElement }]} onPress={() => {}}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <ThemedText style={{ fontSize: 18, fontWeight: '700' }}>Superset {g !== undefined && <ThemedText style={{ fontSize: 18, fontWeight: '700', color: hex(g) }}>{letter(g)}</ThemedText>}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">Pick what you do back to back with <ThemedText type="smallBold">{exercises[i].name}</ThemedText></ThemedText>
            </View>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close"><X size={22} color={theme.text} /></Pressable>
          </View>
          <ScrollView style={{ maxHeight: 420, marginTop: 10 }}>
            {exercises.map((e, k) => k === i ? null : (
              <Pressable key={`${e.name}-${k}`} onPress={() => toggle(k)} accessibilityState={{ checked: pick.has(k) }} style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
                <ExerciseThumb ex={lib.get(e.name)} size={40} />
                <View style={{ flex: 1 }}>
                  <ThemedText type="smallBold" numberOfLines={1}>{e.name}</ThemedText>
                  {e.superset !== undefined && e.superset !== g && <ThemedText style={[styles.tag, { backgroundColor: hex(e.superset) }]}>IN SUPERSET {letter(e.superset)}</ThemedText>}
                </View>
                <View style={[styles.box, pick.has(k) ? { backgroundColor: Lime, borderColor: Lime } : { borderColor: theme.textSecondary }]}>{pick.has(k) && <Check size={16} strokeWidth={3} color="#09090b" />}</View>
              </Pressable>
            ))}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            {g !== undefined && <Button variant="ghost" style={{ flex: 1 }} onPress={() => onSave([])}>Remove superset</Button>}
            <Button style={{ flex: 1 }} disabled={g === undefined && pick.size === 0} onPress={() => onSave([...pick])}>
              {pick.size ? `Superset ${pick.size + 1} exercises` : g !== undefined ? 'Remove superset' : 'Pick at least one'}
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  tag: { alignSelf: 'flex-start', marginTop: 3, paddingHorizontal: 6, borderRadius: 3, fontSize: 10, fontWeight: '700', color: '#09090b', overflow: 'hidden' },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
