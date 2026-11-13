// Create / edit a routine (the website's /train/routine). ?id= edits, ?from=<example> copies an example, nothing = blank.
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Clock, Hash, Link2, Trash2, X } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { setTypes, templates, timedByDefault, type Exercise, type ExerciseLog } from '@shared/data';
import { mmss, parseResult, setLabels } from '@shared/lifting';
import ExercisePicker from '@/components/exercise-picker';
import { ExerciseThumb } from '@/components/post-card';
import SetTypeSheet from '@/components/set-type-sheet';
import { ThemedText } from '@/components/themed-text';
import { Press } from '@/components/ui/button';
import { EmptyState, Icon, Section } from '@/components/ui/kit';
import { Lime, Red } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useStore } from '@/lib/store';
import { setTypeColor, supersetHex } from '@/lib/tw';
import { Input } from '@/components/ui/input';

export default function Routine() {
  const { id, from } = useLocalSearchParams<{ id?: string; from?: string }>();
  const { s, saveRoutine, deleteRoutine } = useStore();
  const theme = useTheme();
  const existing = s.routines.find((r) => r.id === id);
  const example = templates.find((t) => t.name === from);
  const [name, setName] = useState(existing?.name ?? (example ? `${example.name} day` : ''));
  const [list, setList] = useState<ExerciseLog[]>(() => structuredClone(existing?.exercises ?? example?.exercises ?? []));
  const [picking, setPicking] = useState(false);
  const [typing, setTyping] = useState<{ i: number; j: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const lib = new Map(s.library.map((e) => [e.name, e]));
  const edit = (fn: (x: ExerciseLog[]) => void) => setList((l) => { const x = structuredClone(l); fn(x); return x; });
  const isTimed = (e: ExerciseLog) => e.timed ?? timedByDefault(lib.get(e.name)?.id);
  const groups = [...new Set(list.map((e) => e.superset).filter((g) => g !== undefined))];

  const add = (picked: Exercise[]) => {
    edit((x) => {
      for (const e of picked) {
        const bw = ['bodyweight', 'cardio', 'other'].includes(e.equipment), timed = timedByDefault(e.id);
        x.push({ name: e.name, ...(timed ? { timed } : {}), sets: [0, 1, 2].map(() => (timed ? { kg: 0, reps: 0, secs: 30 } : { kg: bw ? 0 : 20, reps: 10 })) });
      }
    });
    setPicking(false);
  };
  const superset = (i: number) => edit((x) => {
    if (x[i].superset !== undefined) { const g = x[i].superset; delete x[i].superset; const left = x.filter((e) => e.superset === g); if (left.length < 2) left.forEach((e) => delete e.superset); return; }
    if (!x[i + 1]) return;
    const g = x[i + 1].superset ?? Date.now();
    x[i].superset = g; x[i + 1].superset = g;
  });
  async function save() {
    if (!name.trim()) return setErr('Give the routine a name');
    if (!list.length) return setErr('Add at least one exercise');
    setSaving(true); setErr('');
    try {
      await saveRoutine({ id: existing?.id, name, exercises: list.map((e) => ({ ...e, sets: e.sets.map(({ kg, reps, type, secs }) => ({ kg, reps, ...(type ? { type } : {}), ...(secs !== undefined ? { secs } : {}) })) })) });
      router.back();
    } catch (x) { setErr((x as Error).message); setSaving(false); }
  }
  function remove() {
    if (!existing) return;
    const go = async () => { await deleteRoutine(existing.id); router.back(); };
    if (Platform.OS === 'web') { if (confirm(`Delete "${existing.name}"?`)) go(); return; }
    Alert.alert(`Delete "${existing.name}"?`, undefined, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: go }]);
  }

  if (id && !existing) return <View style={{ flex: 1, backgroundColor: theme.background }}><EmptyState art="not-found" title="Routine not found" text="It may have been deleted." /></View>;
  const typingSet = typing && list[typing.i]?.sets[typing.j];
  const input = [styles.num, { color: theme.text, backgroundColor: theme.backgroundSelected }];

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen options={{
        title: existing ? 'Edit routine' : 'New routine',
        headerRight: () => (
          <Press onPress={save} disabled={saving} style={styles.save}><ThemedText type="smallBold" style={{ color: '#09090b' }}>{saving ? 'Saving…' : 'Save'}</ThemedText></Press>
        ),
      }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 12 }} keyboardShouldPersistTaps="handled">
        <Input value={name} onChangeText={setName} maxLength={60} placeholder="Routine name, e.g. Upper A" placeholderTextColor={theme.textSecondary}
          style={[styles.name, { color: theme.text, backgroundColor: theme.backgroundElement }]} />
        {!!err && <ThemedText type="small" style={{ color: Red }}>{err}</ThemedText>}
        {list.length === 0 && <EmptyState art="exercises" title="No exercises yet" text="Add some below and set the target sets, weight and reps." />}
        {list.map((ex, i) => {
          const labels = setLabels(ex.sets, setTypes);
          const sc = ex.superset !== undefined ? supersetHex(groups.indexOf(ex.superset)) : undefined;
          const timed = isTimed(ex);
          return (
            <Section key={`${ex.name}-${i}`} style={sc ? { borderLeftWidth: 4, borderLeftColor: sc } : undefined}>
              {sc && <ThemedText style={[styles.ssTag, { backgroundColor: sc }]}>SUPERSET {String.fromCharCode(65 + groups.indexOf(ex.superset!))}</ThemedText>}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                <ExerciseThumb ex={lib.get(ex.name)} size={44} />
                <View style={{ flex: 1 }}>
                  <ThemedText type="smallBold" style={{ fontSize: 16 }}>{ex.name}</ThemedText>
                  {(list[i + 1] || ex.superset !== undefined) && (
                    <Pressable onPress={() => superset(i)} style={styles.small}>
                      <Link2 size={13} color={sc ?? theme.textSecondary} />
                      <ThemedText type="smallBold" style={{ fontSize: 12, color: sc ?? theme.textSecondary }}>{ex.superset !== undefined ? 'Unlink superset' : 'Superset'}</ThemedText>
                    </Pressable>
                  )}
                  {(ex.timed || timedByDefault(lib.get(ex.name)?.id)) && (
                    <Pressable onPress={() => edit((x) => { const on = !isTimed(x[i]); x[i].timed = on; if (on) x[i].sets.forEach((st) => { st.secs ??= 30; }); })} style={styles.small}>
                      {timed ? <Hash size={13} color={theme.textSecondary} /> : <Clock size={13} color={theme.textSecondary} />}
                      <ThemedText type="smallBold" themeColor="textSecondary" style={{ fontSize: 12 }}>{timed ? 'Log reps instead' : 'Log time instead'}</ThemedText>
                    </Pressable>
                  )}
                </View>
                <Pressable onPress={() => edit((x) => { x.splice(i, 1); })} hitSlop={8} accessibilityLabel={`Remove ${ex.name}`}><Trash2 size={16} color={theme.textSecondary} /></Pressable>
              </View>
              <View style={[styles.row, { marginTop: 12 }]}>
                <ThemedText style={[styles.head, { width: 52, textAlign: 'left' }]}>Set</ThemedText>
                <ThemedText style={[styles.head, styles.flex]}>kg</ThemedText>
                <ThemedText style={[styles.head, styles.flex]}>{timed ? 'Target time' : 'Reps'}</ThemedText>
                <View style={{ width: 28 }} />
              </View>
              {ex.sets.map((st, j) => (
                <View key={j} style={[styles.row, { marginTop: 6 }]}>
                  <Pressable onPress={() => setTyping({ i, j })} style={[styles.setBtn, { backgroundColor: theme.backgroundSelected }]}>
                    <ThemedText type="smallBold" style={{ color: setTypeColor(st.type) ?? theme.text }}>{labels[j]}</ThemedText>
                  </Pressable>
                  <Input value={st.kg ? String(st.kg) : ''} placeholder="0" placeholderTextColor={theme.textSecondary} keyboardType="decimal-pad" selectTextOnFocus
                    onChangeText={(v) => edit((x) => { x[i].sets[j].kg = Math.max(0, Number(v.replace(',', '.')) || 0); })} style={[styles.flex, input]} />
                  {timed
                    ? <Input key={`${j}-${st.secs}`} defaultValue={mmss(st.secs ?? 0)} selectTextOnFocus style={[styles.flex, input]}
                        onEndEditing={(e) => { const v = parseResult(e.nativeEvent.text, 'time'); edit((x) => { x[i].sets[j].secs = v ?? 0; }); }} />
                    : <Input value={String(st.reps)} keyboardType="number-pad" selectTextOnFocus style={[styles.flex, input]}
                        onChangeText={(v) => edit((x) => { x[i].sets[j].reps = Number(v.replace(/\D/g, '')) || 0; })} />}
                  <Pressable onPress={() => edit((x) => { x[i].sets.splice(j, 1); if (!x[i].sets.length) x.splice(i, 1); })} style={{ width: 28, alignItems: 'center' }} accessibilityLabel={`Remove set ${labels[j]}`}>
                    <X size={16} strokeWidth={1.75} color={Red} />
                  </Pressable>
                </View>
              ))}
              <Pressable onPress={() => edit((x) => { const l = x[i].sets.at(-1)!; x[i].sets.push({ kg: l.kg, reps: l.reps, ...(l.secs !== undefined ? { secs: l.secs } : {}) }); })} style={[styles.small, { marginTop: 12, gap: 6 }]}>
                <Icon name="plus" size={14} /><ThemedText type="smallBold" themeColor="textSecondary">Add set</ThemedText>
              </Pressable>
            </Section>
          );
        })}
        <Press onPress={() => setPicking(true)} style={[styles.addEx, { backgroundColor: theme.backgroundElement }]}>
          <Icon name="plus-circle" size={20} /><ThemedText type="smallBold" style={{ fontSize: 16 }}>Add exercise</ThemedText>
        </Press>
        {existing && (
          <Pressable onPress={remove} style={[styles.small, { alignSelf: 'center', paddingVertical: 8, gap: 6 }]}>
            <Trash2 size={16} color={Red} /><ThemedText type="smallBold" style={{ color: Red }}>Delete routine</ThemedText>
          </Pressable>
        )}
      </ScrollView>
      <SetTypeSheet open={!!typingSet} current={typingSet ? typingSet.type : undefined} onClose={() => setTyping(null)}
        onPick={(t) => { if (typing) edit((x) => { const st = x[typing.i].sets[typing.j]; if (t) st.type = t; else delete st.type; }); setTyping(null); }} />
      <ExercisePicker open={picking} onPick={add} onClose={() => setPicking(false)} taken={list.map((e) => e.name)} />
    </View>
  );
}

const styles = StyleSheet.create({
  save: { backgroundColor: Lime, borderRadius: 3, paddingHorizontal: 14, paddingVertical: 6 },
  name: { borderRadius: 5, paddingHorizontal: 12, paddingVertical: 12, fontSize: 18, fontWeight: '600' },
  ssTag: { position: 'absolute', top: -8, left: 12, fontSize: 10, fontWeight: '700', letterSpacing: 0.5, color: '#09090b', paddingHorizontal: 8, paddingVertical: 1, borderRadius: 2, overflow: 'hidden' },
  small: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, alignSelf: 'flex-start' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  head: { fontSize: 12, color: '#a1a1aa', textAlign: 'center' },
  flex: { flex: 1, minWidth: 0, width: 0, textAlign: 'center' },
  setBtn: { width: 52, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  num: { borderRadius: 4, paddingVertical: 8, fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
  addEx: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 5, paddingVertical: 14 },
});
