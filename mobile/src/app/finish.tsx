// Save workout (the website's /train/finish): title, notes, duration, photo or video, date, who can see it.
// Saving writes the workout, posts it (media first on the feed) and updates your best lifts.
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, Stack } from 'expo-router';
import { CalendarDays, ChevronRight, Eye, Globe, ImagePlus, Lock, Pencil, Users } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { Visibility } from '@shared/data';
import { baseOf, bests, liftsOf } from '@shared/lifting';
import { bodyFor } from '@shared/strength';
import { summarize } from '@shared/workout';
import { ThemedText } from '@/components/themed-text';
import { Press } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/kit';
import { Lime, Red } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useStore, type Media } from '@/lib/store';
import { Input } from '@/components/ui/input';

const visibilities = [
  { id: 'everyone', label: 'Everyone', hint: 'Anyone on Spotter can see this workout.', icon: Globe },
  { id: 'friends', label: 'Friends', hint: 'Only people you follow who follow you back.', icon: Users },
  { id: 'private', label: 'Only me', hint: 'Saved to your history, hidden from everyone else.', icon: Lock },
] as const;

export default function Finish() {
  const { s, me, setActive, finishWorkout } = useStore();
  const theme = useTheme();
  const a = s.active;
  const [title, setTitle] = useState(a?.title ?? 'Workout');
  const [note, setNote] = useState('');
  const [duration, setDuration] = useState(() => (a ? String(Math.max(1, Math.round((Date.now() - new Date(a.startedAt).getTime()) / 60000))) : ''));
  const [daysAgo, setDaysAgo] = useState(0);
  const [visibility, setVisibility] = useState<Visibility>('everyone');
  const [media, setMedia] = useState<(Media & { name: string; size?: number }) | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  if (!a) return <View style={{ flex: 1, backgroundColor: theme.background }}><EmptyState art="workouts" title="No workout in progress" /></View>;
  const body = bodyFor(s.library, Number(me.bw));
  const prev = bests(baseOf(me), s.sessions, body);
  const sum = summarize(a.exercises, s.library, prev, body);
  const start = new Date(a.startedAt);

  async function pickMedia() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 0.7, videoMaxDuration: 60 });
    if (res.canceled || !res.assets[0]) return;
    const x = res.assets[0];
    if ((x.fileSize ?? 0) > 50 * 1024 * 1024) return setErr('Max 50 MB. Trim the video and try again');
    setErr('');
    setMedia({ uri: x.uri, type: x.type === 'video' ? 'video' : 'image', mime: x.mimeType ?? undefined, file: x.file, name: x.fileName ?? (x.type === 'video' ? 'Video' : 'Photo'), size: x.fileSize });
  }
  async function save() {
    if (saving) return;
    if (!sum.done.length) return setErr('Tick at least one set before saving');
    const at = new Date(start); at.setDate(at.getDate() - daysAgo);
    setSaving(true); setErr('');
    try {
      await finishWorkout(
        { title: a!.title, exercises: sum.done },
        { title: title.trim() || a!.title, note: note.trim() || undefined, prs: sum.prs, exercises: sum.exercises, volume: sum.volume,
          duration: Math.min(600, Math.max(1, Number(duration) || 1)), visibility, at: at.toISOString() },
        liftsOf(bests(prev, [{ exercises: sum.done }], body)),
        media,
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.dismissAll();
      router.navigate('/feed');
    } catch (x) {
      setErr(x instanceof Error ? x.message : 'Couldn’t save');
      setSaving(false);
    }
  }
  function discard() {
    const go = () => { setActive(() => null); router.back(); };
    if (Platform.OS === 'web') { if (confirm('Discard this workout? Your logged sets will be lost.')) go(); return; }
    Alert.alert('Discard this workout?', 'Your logged sets will be lost.', [{ text: 'Keep', style: 'cancel' }, { text: 'Discard', style: 'destructive', onPress: go }]);
  }

  const row = [styles.row, { borderBottomColor: theme.border }];
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{
        title: 'Save workout',
        headerLeft: () => <Pressable onPress={() => router.back()} hitSlop={8}><ThemedText type="smallBold" style={{ color: Lime }}>Resume</ThemedText></Pressable>,
        headerRight: () => (
          <Press onPress={save} disabled={saving || !sum.done.length} style={[styles.save, { opacity: saving || !sum.done.length ? 0.4 : 1 }]}>
            <ThemedText type="smallBold" style={{ color: '#09090b' }}>{saving ? (media ? 'Uploading…' : 'Saving…') : 'Save'}</ThemedText>
          </Press>
        ),
      }} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <View style={[row, { paddingTop: 16 }]}>
          <Input value={title} onChangeText={setTitle} maxLength={80} placeholder="Name this workout" placeholderTextColor={theme.textSecondary} style={[styles.title, { color: theme.text }]} />
          <Pencil size={18} color={theme.textSecondary} />
        </View>
        <Input value={note} onChangeText={setNote} maxLength={500} multiline placeholder="How did it go? Add notes for yourself or your friends…" placeholderTextColor={theme.textSecondary}
          style={[styles.note, { color: theme.text, borderBottomColor: theme.border }]} />
        <View style={[row, { paddingVertical: 16 }]}>
          <View style={{ flex: 1 }}>
            <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>Duration</ThemedText>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
              <Input value={duration} onChangeText={(v) => setDuration(v.replace(/\D/g, '').slice(0, 3))} keyboardType="number-pad" style={[styles.dur, { borderBottomColor: 'rgba(132,204,22,0.6)' }]} />
              <ThemedText type="small" themeColor="textSecondary">min</ThemedText>
            </View>
          </View>
          <View style={{ flex: 1 }}><ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>Volume</ThemedText><ThemedText style={styles.stat}>{Math.round(sum.volume).toLocaleString()}<ThemedText type="small" themeColor="textSecondary"> kg</ThemedText></ThemedText></View>
          <View style={{ flex: 1 }}><ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>Sets</ThemedText><ThemedText style={styles.stat}>{sum.sets}</ThemedText></View>
        </View>

        <Pressable onPress={pickMedia} style={row}>
          {media ? <Image source={{ uri: media.uri }} style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: '#000' }} /> : <ImagePlus size={22} color={Lime} />}
          <View style={{ flex: 1 }}>
            <ThemedText style={{ fontWeight: '500' }} numberOfLines={1}>{media ? media.name : 'Add photo or video'}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>{media ? (media.size ? `${(media.size / 1048576).toFixed(1)} MB` : media.type) : 'Shows first on the feed. Max 50 MB'}</ThemedText>
          </View>
          {media ? <ThemedText type="smallBold" style={{ color: Red }} onPress={() => setMedia(null)}>Remove</ThemedText> : <ChevronRight size={18} color={theme.textSecondary} />}
        </Pressable>

        <View style={row}>
          <CalendarDays size={22} color={Lime} />
          <ThemedText style={{ flex: 1, fontWeight: '500' }}>Date</ThemedText>
          {(['Today', 'Yesterday'] as const).map((d, i) => (
            <Pressable key={d} onPress={() => setDaysAgo(i)} style={[styles.chip, { backgroundColor: daysAgo === i ? Lime : theme.backgroundElement }]}>
              <ThemedText type="smallBold" style={{ fontSize: 12, color: daysAgo === i ? '#09090b' : theme.text }}>{d}</ThemedText>
            </Pressable>
          ))}
          <ThemedText type="small" themeColor="textSecondary">{start.toLocaleTimeString('en-MY', { hour: 'numeric', minute: '2-digit' })}</ThemedText>
        </View>

        <View style={[row, { flexDirection: 'column', alignItems: 'stretch', gap: 8 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Eye size={22} color={Lime} /><ThemedText style={{ fontWeight: '500' }}>Visibility</ThemedText></View>
          <View style={[styles.seg, { backgroundColor: theme.backgroundElement }]}>
            {visibilities.map(({ id, label, icon: I }) => {
              const on = visibility === id;
              return (
                <Pressable key={id} onPress={() => setVisibility(id)} style={[styles.segBtn, on && { backgroundColor: theme.backgroundSelected }]}>
                  <I size={15} color={on ? theme.text : theme.textSecondary} />
                  <ThemedText type="smallBold" style={{ fontSize: 13, color: on ? theme.text : theme.textSecondary }}>{label}</ThemedText>
                </Pressable>
              );
            })}
          </View>
          <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>{visibilities.find((v) => v.id === visibility)!.hint}</ThemedText>
        </View>

        {!!err && <ThemedText type="small" style={{ color: Red, paddingVertical: 12 }}>{err}</ThemedText>}
        <Pressable onPress={discard} style={{ alignItems: 'center', paddingVertical: 16, marginTop: 16 }}>
          <ThemedText type="smallBold" style={{ color: Red, fontSize: 16 }}>Discard workout</ThemedText>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, marginHorizontal: -16, paddingHorizontal: 16 },
  title: { flex: 1, fontSize: 24, fontWeight: '700', letterSpacing: -0.4 },
  note: { minHeight: 80, fontSize: 16, paddingVertical: 12, textAlignVertical: 'top', borderBottomWidth: StyleSheet.hairlineWidth, marginHorizontal: -16, paddingHorizontal: 16 },
  dur: { width: 52, fontSize: 20, fontWeight: '700', color: Lime, borderBottomWidth: 1, borderStyle: 'dashed', paddingVertical: 0 },
  stat: { fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
  chip: { borderRadius: 4, paddingHorizontal: 10, paddingVertical: 5 },
  seg: { flexDirection: 'row', borderRadius: 5, padding: 4 },
  segBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 4 },
  save: { backgroundColor: Lime, borderRadius: 3, paddingHorizontal: 14, paddingVertical: 6 },
});
