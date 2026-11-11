// First launch on this phone: a short profile so workouts, posts and ranks have a name and bodyweight to work with.
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { faculties, type Sex } from '@shared/data';
import type { Profile } from '@/lib/store';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Lime, Red } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function Onboarding({ onSave }: { onSave: (p: Omit<Profile, 'id'>) => Promise<void> }) {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [faculty, setFaculty] = useState(faculties[0]);
  const [sex, setSex] = useState<Sex>('M');
  const [bw, setBw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function save() {
    const kg = Number(bw);
    if (!name.trim()) return setErr('Add your name');
    if (!(kg >= 30 && kg <= 250)) return setErr('Bodyweight should be between 30 and 250 kg');
    setBusy(true); setErr('');
    try {
      await onSave({ name: name.trim().slice(0, 40), faculty, sex, bw: kg, squat: 0, bench: 0, deadlift: 0, intake: null });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Couldn’t save');
      setBusy(false);
    }
  }

  const input = [styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <ThemedText style={styles.title}>Welcome to Spotter</ThemedText>
          <ThemedText themeColor="textSecondary">Set up your profile to start logging.</ThemedText>

          <ThemedText type="smallBold" style={styles.label}>Name</ThemedText>
          <TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={theme.textSecondary} style={input} />

          <ThemedText type="smallBold" style={styles.label}>Faculty</ThemedText>
          <View style={styles.chips}>
            {faculties.map((f) => (
              <Pressable key={f} onPress={() => setFaculty(f)}
                style={[styles.chip, { backgroundColor: faculty === f ? Lime : theme.backgroundElement }]}>
                <ThemedText type="small" style={faculty === f && { color: '#09090b' }}>{f}</ThemedText>
              </Pressable>
            ))}
          </View>

          <ThemedText type="smallBold" style={styles.label}>Sex (for strength standards)</ThemedText>
          <View style={styles.chips}>
            {(['M', 'F'] as const).map((x) => (
              <Pressable key={x} onPress={() => setSex(x)} style={[styles.chip, { backgroundColor: sex === x ? Lime : theme.backgroundElement }]}>
                <ThemedText type="small" style={sex === x && { color: '#09090b' }}>{x === 'M' ? 'Male' : 'Female'}</ThemedText>
              </Pressable>
            ))}
          </View>

          <ThemedText type="smallBold" style={styles.label}>Bodyweight (kg)</ThemedText>
          <TextInput value={bw} onChangeText={setBw} keyboardType="decimal-pad" placeholder="70" placeholderTextColor={theme.textSecondary} style={input} />

          {!!err && <ThemedText type="small" style={{ color: Red, marginTop: 12 }}>{err}</ThemedText>}
          <Button style={{ marginTop: 24 }} onPress={save} disabled={busy}>{busy ? 'Saving…' : 'Start'}</Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, paddingTop: 40 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.6, marginBottom: 4 },
  label: { marginTop: 20, marginBottom: 8 },
  input: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
});
