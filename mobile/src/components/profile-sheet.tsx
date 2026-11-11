// Your profile: name, faculty, APU intake (for the Gym tab's real timetable) and bodyweight (strength levels, DOTS).
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { faculties } from '@shared/data';
import Avatar from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { Button, Press } from '@/components/ui/button';
import { Lime, Red } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useStore } from '@/lib/store';

export default function ProfileSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { me, updateProfile } = useStore();
  const theme = useTheme();
  const [name, setName] = useState(me.name);
  const [faculty, setFaculty] = useState(me.faculty);
  const [intake, setIntake] = useState(me.intake ?? '');
  const [bw, setBw] = useState(String(me.bw));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function save() {
    const kg = Number(bw.replace(',', '.'));
    if (!name.trim()) return setErr('Add your name');
    if (!(kg >= 30 && kg <= 250)) return setErr('Bodyweight should be between 30 and 250 kg');
    setBusy(true); setErr('');
    try {
      await updateProfile({ name: name.trim().slice(0, 40), faculty, intake: intake.trim().toUpperCase() || null, bw: kg });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Couldn’t save');
    } finally { setBusy(false); }
  }

  const input = [styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }];
  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: theme.background }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.head}>
            <ThemedText style={styles.h1}>Profile</ThemedText>
            <Press onPress={onClose} style={[styles.close, { backgroundColor: theme.backgroundElement }]}><ThemedText type="smallBold">Close</ThemedText></Press>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Avatar url={me.avatar_url} name={me.name} size={64} />
              <View style={{ flex: 1 }}>
                <ThemedText type="smallBold" style={{ fontSize: 18 }}>{me.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">Squat {me.squat} · Bench {me.bench} · Deadlift {me.deadlift} kg</ThemedText>
              </View>
            </View>
            <ThemedText type="smallBold" style={styles.label}>Name</ThemedText>
            <TextInput value={name} onChangeText={setName} style={input} />
            <ThemedText type="smallBold" style={styles.label}>Faculty</ThemedText>
            <View style={styles.chips}>
              {faculties.map((f) => (
                <Pressable key={f} onPress={() => setFaculty(f)} style={[styles.chip, { backgroundColor: faculty === f ? Lime : theme.backgroundElement }]}>
                  <ThemedText type="small" style={faculty === f && { color: '#09090b' }}>{f}</ThemedText>
                </Pressable>
              ))}
            </View>
            <ThemedText type="smallBold" style={styles.label}>APU intake code</ThemedText>
            <TextInput value={intake} onChangeText={setIntake} autoCapitalize="characters" placeholder="e.g. APD2F2409CS" placeholderTextColor={theme.textSecondary} style={input} />
            <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: 6, fontSize: 12 }}>Used to find your free hours between classes on the Gym tab.</ThemedText>
            <ThemedText type="smallBold" style={styles.label}>Bodyweight (kg)</ThemedText>
            <TextInput value={bw} onChangeText={setBw} keyboardType="decimal-pad" style={input} />
            {!!err && <ThemedText type="small" style={{ color: Red, marginTop: 12 }}>{err}</ThemedText>}
            <Button style={{ marginTop: 24 }} onPress={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingBottom: 4 },
  h1: { fontSize: 26, lineHeight: 32, fontWeight: '800', letterSpacing: -0.5 },
  close: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  label: { marginTop: 18, marginBottom: 8 },
  input: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
});
