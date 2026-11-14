// Add exercise: a native page sheet (slides up, swipe down to close on iOS) with search, muscle and equipment filters.
// Same filters as the website's picker (shared from lib/muscles). Tap exercises to select several (numbered in the order
// picked), then one button adds them all.
import * as Haptics from 'expo-haptics';
import { Check, Plus, Search, Slash, X } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, View, Platform } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Exercise } from '@shared/data';
import { baseOf, heaviest } from '@shared/lifting';
import { family, kit, pickerGroups } from '@shared/muscles';
import { isLoadedBodyweight } from '@shared/strength';
import { ThemedText } from '@/components/themed-text';
import { Button, Press } from '@/components/ui/button';
import { Lime } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useStore } from '@/lib/store';
import { img } from '@/lib/web';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/kit';

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export default function ExercisePicker({ open, onPick, onClose, taken }: { open: boolean; onPick: (list: Exercise[]) => void; onClose: () => void; taken: string[] }) {
  const { s, me } = useStore();
  const theme = useTheme();
  const [q, setQ] = useState('');
  const [g, setG] = useState('all');
  const [k, setK] = useState('any');
  const [picked, setPicked] = useState<Exercise[]>([]);
  const toggle = (e: Exercise) => { Haptics.selectionAsync().catch(() => {}); setPicked((p) => (p.some((x) => x.id === e.id) ? p.filter((x) => x.id !== e.id) : [...p, e])); };
  const close = () => { setPicked([]); onClose(); };
  const add = () => { const p = picked; setPicked([]); onPick(p); };
  const logged = useMemo(() => heaviest(baseOf(me), s.sessions), [me, s.sessions]); // heaviest weight actually lifted
  const inGroup = pickerGroups.find(([x]) => x === g)![1];
  const list = s.library.filter((e) => inGroup(e) && (k === 'any' || family(e.equipment) === k) && `${e.name} ${e.muscle} ${e.equipment}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <SafeAreaView edges={Platform.OS === 'android' ? ['top', 'bottom'] : ['bottom']} style={{ flex: 1, backgroundColor: theme.background }}>
        <View style={styles.head}>
          <ThemedText style={styles.h1}>Add exercise</ThemedText>
          <Press onPress={close} style={[styles.close, { backgroundColor: theme.backgroundElement }]} accessibilityLabel="Close">
            <X size={18} color={theme.text} />
          </Press>
        </View>
        <View style={{ justifyContent: 'center' }}>
          <Input value={q} onChangeText={setQ} placeholder="Search exercises…" placeholderTextColor={theme.textSecondary} autoCorrect={false}
            style={[styles.search, { backgroundColor: theme.backgroundElement, color: theme.text }]} />
          <Search size={16} color={theme.textSecondary} style={{ position: 'absolute', left: 27 }} pointerEvents="none" />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.groups} style={{ flexGrow: 0, flexShrink: 0 }}>
          {pickerGroups.map(([x]) => {
            const on = g === x, pic = img(`/muscles/${x.replace(' ', '-')}.webp`);
            return (
              <Pressable key={x} onPress={() => setG(x)} style={styles.group} accessibilityState={{ selected: on }}>
                <View style={[styles.figure, { borderColor: on ? Lime : 'transparent', opacity: on ? 1 : 0.7 }]}>
                  {x !== 'all' && pic ? <Image source={pic} style={{ width: 44, height: 44 }} /> : <Slash size={20} strokeWidth={1.75} color="#d4d4d8" />}
                </View>
                <ThemedText type="small" style={{ fontSize: 11, color: on ? Lime : theme.textSecondary }}>{cap(x)}</ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kit} style={{ flexGrow: 0, flexShrink: 0, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.border }}>
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
          initialNumToRender={14} maxToRenderPerBatch={12} windowSize={9} removeClippedSubviews={Platform.OS === 'android'}
          ListHeaderComponent={<ThemedText type="small" themeColor="textSecondary" style={{ paddingVertical: 8 }}>{list.length} exercise{list.length === 1 ? '' : 's'}</ThemedText>}
          ListEmptyComponent={<EmptyState art="search" size={96} title="No matches" text={q ? `Nothing called “${q}” with these filters.` : 'Try another muscle or equipment filter.'} />}
          extraData={picked}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: picked.length ? 96 : 30 }}
          renderItem={({ item: e }) => {
            const has = taken.includes(e.name), pic = img(e.image), n = picked.findIndex((x) => x.id === e.id) + 1;
            return (
              <Press disabled={has} onPress={() => toggle(e)} haptic={false} accessibilityState={{ selected: n > 0 }}
                style={[styles.item, { opacity: has ? 0.4 : 1, backgroundColor: n ? 'rgba(132,204,22,0.1)' : 'transparent' }]}>
                {pic ? <Image source={pic} style={styles.thumb} /> : <View style={[styles.thumb, { backgroundColor: theme.backgroundElement }]} />}
                <View style={{ flex: 1 }}>
                  <ThemedText style={{ fontWeight: '600' }}>{e.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">{cap(e.muscle)} · {cap(e.equipment)}{has ? ' · added' : ''}</ThemedText>
                  {!!logged[e.name] && <ThemedText type="small" style={{ color: Lime }}>Best {isLoadedBodyweight(e.id) ? '+' : ''}{Math.round(logged[e.name] * 10) / 10} kg</ThemedText>}
                </View>
                {n ? (
                  <Animated.View key={n} entering={ZoomIn.springify().dampingRatio(0.55).duration(320)} style={[styles.badge, { backgroundColor: Lime }]}>
                    <ThemedText style={{ fontSize: 14, fontWeight: '700', color: '#09090b' }}>{n}</ThemedText>
                  </Animated.View>
                ) : <View style={[styles.badge, { borderWidth: 2, borderColor: 'rgba(132,204,22,0.4)' }]}><Plus size={16} color={Lime} /></View>}
              </Press>
            );
          }}
        />
        {picked.length > 0 && (
          <Animated.View entering={FadeInDown.springify().dampingRatio(0.9).duration(350)} style={[styles.bar, { backgroundColor: theme.background }]}>
            <Button onPress={add}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Check size={18} strokeWidth={2.5} color="#09090b" /><ThemedText style={{ color: '#09090b', fontWeight: '700' }}>Add {picked.length} exercise{picked.length === 1 ? '' : 's'}</ThemedText></View>
            </Button>
          </Animated.View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingBottom: 8 },
  h1: { fontSize: 26, lineHeight: 32, fontWeight: '700', letterSpacing: -0.5 },
  close: { width: 36, height: 36, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  search: { marginHorizontal: 16, borderRadius: 5, paddingLeft: 36, paddingRight: 12, paddingVertical: 11, fontSize: 16 },
  groups: { paddingHorizontal: 12, paddingTop: 12, gap: 4 },
  group: { width: 66, alignItems: 'center', gap: 6 },
  figure: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, backgroundColor: '#18181b', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  kit: { paddingHorizontal: 16, gap: 20, paddingTop: 12 },
  kitTab: { paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 8, marginHorizontal: -8, borderRadius: 5 },
  badge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  bar: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 },
  thumb: { width: 52, height: 52, borderRadius: 26 },
});
