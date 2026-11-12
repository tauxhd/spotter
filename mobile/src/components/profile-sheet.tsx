// Edit profile (the website's /me/edit): photo, name, bio, faculty, APU intake, kg / lb, bodyweight and starting lifts.
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { faculties } from '@shared/data';
import { fromUnit, toUnit, type Unit } from '@shared/units';
import Avatar from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { Button, Press } from '@/components/ui/button';
import { Icon } from '@/components/ui/kit';
import { Lime, Red } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useStore } from '@/lib/store';

const lifts = [['bw', 'Body', 'scale'], ['squat', 'Squat', 'squat'], ['bench', 'Bench', 'bench'], ['deadlift', 'Deadlift', 'deadlift']] as const;
const round = (n: number) => String(Math.round(n * 10) / 10);

export default function ProfileSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { me, updateProfile, setAvatar } = useStore();
  const theme = useTheme();
  const [unit, setUnit] = useState<Unit>(me.unit ?? 'kg');
  const [name, setName] = useState(me.name);
  const [bio, setBio] = useState(me.bio ?? '');
  const [faculty, setFaculty] = useState(me.faculty);
  const [intake, setIntake] = useState(me.intake ?? '');
  const [kg, setKg] = useState<Record<string, string>>(() => Object.fromEntries(lifts.map(([k]) => [k, round(toUnit(Number(me[k]), me.unit ?? 'kg'))])));
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');

  function switchUnit(u: Unit) { // keep the same weights, shown in the new unit
    setKg((x) => Object.fromEntries(Object.entries(x).map(([k, v]) => [k, round(toUnit(fromUnit(Number(v) || 0, unit), u))])));
    setUnit(u);
  }
  async function pickPhoto() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    setUploading(true); setErr('');
    try { await setAvatar({ uri: a.uri, type: 'image', mime: a.mimeType ?? 'image/jpeg', file: a.file }); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Couldn’t upload'); }
    setUploading(false);
  }
  async function save() {
    const v = Object.fromEntries(Object.entries(kg).map(([k, x]) => [k, Math.round(fromUnit(Number(x.replace(',', '.')) || 0, unit) * 100) / 100]));
    if (!name.trim()) return setErr('Add your name');
    if (!(v.bw >= 30 && v.bw <= 250)) return setErr('Bodyweight should be between 30 and 250 kg');
    setBusy(true); setErr('');
    try {
      await updateProfile({ name: name.trim().slice(0, 40), bio: bio.trim().slice(0, 150) || null, faculty, intake: intake.trim().toUpperCase() || null, unit, bw: v.bw, squat: v.squat, bench: v.bench, deadlift: v.deadlift });
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
            <ThemedText style={styles.h1}>Edit profile</ThemedText>
            <Press onPress={onClose} style={[styles.close, { backgroundColor: theme.backgroundElement }]}><ThemedText type="smallBold">Cancel</ThemedText></Press>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
            <Pressable onPress={pickPhoto} style={{ alignItems: 'center', gap: 6 }} accessibilityLabel="Change profile photo">
              <View style={{ opacity: uploading ? 0.5 : 1 }}>
                <Avatar id={me.id} url={me.avatar_url} name={me.name} size={96} ring="rgba(132,204,22,0.3)" />
                <View style={[styles.cam, { borderColor: theme.background }]}><Camera size={16} color="#09090b" /></View>
              </View>
              <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>{uploading ? 'Uploading…' : 'Tap to change your photo'}</ThemedText>
            </Pressable>

            <ThemedText type="smallBold" style={styles.label}>Name</ThemedText>
            <TextInput value={name} onChangeText={setName} style={input} />
            <ThemedText type="smallBold" style={styles.label}>Bio</ThemedText>
            <TextInput value={bio} onChangeText={setBio} multiline maxLength={150} placeholder="Goals, split, PRs you're chasing…" placeholderTextColor={theme.textSecondary} style={[input, { minHeight: 84, textAlignVertical: 'top' }]} />
            <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12, textAlign: 'right', marginTop: 4, color: bio.length > 135 ? '#f59e0b' : theme.textSecondary }}>{bio.length}/150</ThemedText>

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

            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 10 }}>
              <ThemedText type="smallBold" style={{ flex: 1 }}>Bodyweight and best lifts</ThemedText>
              <View style={[styles.seg, { backgroundColor: theme.backgroundElement }]}>
                {(['kg', 'lb'] as const).map((u) => (
                  <Pressable key={u} onPress={() => switchUnit(u)} style={[styles.segBtn, unit === u && { backgroundColor: Lime }]}>
                    <ThemedText type="smallBold" style={{ fontSize: 13, color: unit === u ? '#09090b' : theme.textSecondary }}>{u}</ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {lifts.map(([k, label, ic]) => (
                <View key={k} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                  <Icon name={ic} size={36} />
                  <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>{label}</ThemedText>
                  <TextInput value={kg[k]} onChangeText={(v) => setKg((x) => ({ ...x, [k]: v }))} keyboardType="decimal-pad" selectTextOnFocus
                    style={[input, { width: '100%', textAlign: 'center', paddingHorizontal: 4 }]} />
                </View>
              ))}
            </View>

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
  cam: { position: 'absolute', right: -4, bottom: -4, width: 36, height: 36, borderRadius: 18, backgroundColor: Lime, alignItems: 'center', justifyContent: 'center', borderWidth: 4 },
  seg: { flexDirection: 'row', borderRadius: 8, padding: 2 },
  segBtn: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6 },
});
