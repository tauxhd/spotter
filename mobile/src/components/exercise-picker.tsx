// Add exercise: a native page sheet (slides up, swipe down to close on iOS) with search, muscle and equipment filters.
// Same filters as the website's picker (shared from lib/muscles).
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Exercise } from '@shared/data';
import { baseOf, bests } from '@shared/lifting';
import { family, kit, pickerGroups } from '@shared/muscles';
import { bodyFor } from '@shared/strength';
import { ThemedText } from '@/components/themed-text';
import { Press } from '@/components/ui/button';
import { Lime } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useStore } from '@/lib/store';
import { webUrl } from '@/lib/web';

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export default function ExercisePicker({ open, onPick, onClose, taken }: { open: boolean; onPick: (e: Exercise) => void; onClose: () => void; taken: string[] }) {
  const { s, me } = useStore();
  const theme = useTheme();
  const [q, setQ] = useState('');
  const [g, setG] = useState('all');
  const [k, setK] = useState('any');
  const logged = useMemo(() => bests(baseOf(me), s.sessions, bodyFor(s.library, Number(me.bw))), [me, s.sessions, s.library]);
  const inGroup = pickerGroups.find(([x]) => x === g)![1];
  const list = s.library.filter((e) => inGroup(e) && (k === 'any' || family(e.equipment) === k) && `${e.name} ${e.muscle} ${e.equipment}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: theme.background }}>
        <View style={styles.head}>
          <ThemedText style={styles.h1}>Add exercise</ThemedText>
          <Press onPress={onClose} style={[styles.close, { backgroundColor: theme.backgroundElement }]} accessibilityLabel="Close">
            <ThemedText type="smallBold">Done</ThemedText>
          </Press>
        </View>
        <TextInput value={q} onChangeText={setQ} placeholder="Search exercises…" placeholderTextColor={theme.textSecondary} autoCorrect={false}
          style={[styles.search, { backgroundColor: theme.backgroundElement, color: theme.text }]} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.groups} style={{ flexGrow: 0 }}>
          {pickerGroups.map(([x]) => {
            const on = g === x, img = webUrl(`/muscles/${x.replace(' ', '-')}.webp`);
            return (
              <Pressable key={x} onPress={() => setG(x)} style={styles.group} accessibilityState={{ selected: on }}>
                <View style={[styles.figure, { borderColor: on ? Lime : 'transparent', opacity: on ? 1 : 0.7 }]}>
                  {x !== 'all' && img ? <Image source={{ uri: img }} style={{ width: 44, height: 44 }} /> : <ThemedText style={{ fontSize: 20, color: '#d4d4d8' }}>/</ThemedText>}
                </View>
                <ThemedText type="small" style={{ fontSize: 11, color: on ? Lime : theme.textSecondary }}>{cap(x)}</ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kit} style={{ flexGrow: 0, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.border }}>
          {kit.map(([x, label]) => (
            <Pressable key={x} onPress={() => setK(x)} style={[styles.kitTab, k === x && { borderBottomColor: Lime }]}>
              <ThemedText type="smallBold" style={{ color: k === x ? theme.text : theme.textSecondary }}>{label}</ThemedText>
            </Pressable>
          ))}
        </ScrollView>
        <FlatList
          data={list}
          keyExtractor={(e) => e.id}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={14}
          ListHeaderComponent={<ThemedText type="small" themeColor="textSecondary" style={{ paddingVertical: 8 }}>{list.length} exercise{list.length === 1 ? '' : 's'}</ThemedText>}
          ListEmptyComponent={<ThemedText themeColor="textSecondary" style={{ textAlign: 'center', marginTop: 30 }}>No matches. Try another filter.</ThemedText>}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30 }}
          renderItem={({ item: e }) => {
            const has = taken.includes(e.name), img = webUrl(e.image);
            return (
              <Press disabled={has} onPress={() => onPick(e)} style={[styles.item, { opacity: has ? 0.4 : 1 }]}>
                {img ? <Image source={{ uri: img }} style={styles.thumb} /> : <View style={[styles.thumb, { backgroundColor: theme.backgroundElement }]} />}
                <View style={{ flex: 1 }}>
                  <ThemedText style={{ fontWeight: '600' }}>{e.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">{cap(e.muscle)} · {cap(e.equipment)}{has ? ' · added' : ''}</ThemedText>
                  {!!logged[e.name] && <ThemedText type="small" style={{ color: Lime }}>1RM {Math.round(logged[e.name] * 10) / 10} kg</ThemedText>}
                </View>
                <ThemedText style={{ color: Lime, fontSize: 22, fontWeight: '700' }}>+</ThemedText>
              </Press>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingBottom: 8 },
  h1: { fontSize: 26, lineHeight: 32, fontWeight: '800', letterSpacing: -0.5 },
  close: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  search: { marginHorizontal: 16, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 16 },
  groups: { paddingHorizontal: 12, paddingTop: 12, gap: 4 },
  group: { width: 66, alignItems: 'center', gap: 6 },
  figure: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, backgroundColor: '#18181b', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  kit: { paddingHorizontal: 16, gap: 20, paddingTop: 12 },
  kitTab: { paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  thumb: { width: 52, height: 52, borderRadius: 26 },
});
