// First launch (the website's Onboarding): sign in with your APU TP number, we pull your records, then bodyweight and
// (optional) lifts.
import { Image } from 'expo-image';
import { LogIn } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { apuStudent, isTp } from '@shared/apu';
import type { Profile } from '@/lib/store';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icon } from '@/components/ui/kit';
import { Lime, Red } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { img } from '@/lib/web';

type P = Omit<Profile, 'id'>;

function Login({ onFound }: { onFound: (p: P) => void }) {
  const theme = useTheme();
  const [tp, setTp] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const field = [styles.field, { backgroundColor: theme.backgroundElement, color: theme.text }];
  function submit() {
    const s = apuStudent(tp);
    if (!s) return setErr('TP number looks like TP012345');
    onFound({ ...s, bw: 70, squat: 0, bench: 0, deadlift: 0 });
  }
  return (
    <View style={{ gap: 15 }}>
      <View>
        <ThemedText themeColor="textSecondary" style={styles.label}>TP number</ThemedText>
        <Input value={tp} onChangeText={(v) => { setTp(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)); setErr(''); }} placeholder="TP012345"
          placeholderTextColor={theme.textSecondary} autoCapitalize="characters" autoCorrect={false} autoComplete="username" style={field} />
      </View>
      <View>
        <ThemedText themeColor="textSecondary" style={styles.label}>APU password</ThemedText>
        <Input value={pw} onChangeText={setPw} secureTextEntry autoComplete="current-password" style={field} onSubmitEditing={submit} />
      </View>
      {!!err && <ThemedText type="small" style={{ color: Red }}>{err}</ThemedText>}
      <Button onPress={submit} disabled={!isTp(tp) || !pw}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><LogIn size={18} color="#09090b" /><ThemedText type="smallBold" style={{ color: '#09090b', fontSize: 16 }}>Sign in with APU</ThemedText></View>
      </Button>
      <ThemedText themeColor="textSecondary" style={{ fontSize: 12, textAlign: 'center' }}>Demo build: any TP number and password works. Your details are pulled from APU records.</ThemedText>
    </View>
  );
}

// The read-only part of the profile that comes from APU.
function Records({ p }: { p: P }) {
  const theme = useTheme();
  const rows = ([['grad-cap', 'Course', p.course], ['building', 'Faculty', p.faculty], ['intake', 'Intake', p.intake], ['category', 'Category', p.sex === 'F' ? 'Women' : 'Men']] as const).filter(([, , v]) => v);
  return (
    <View style={[styles.section, { borderBottomColor: theme.border, paddingTop: 0 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15, paddingVertical: 8 }}>
        <Icon name="id-card" size={52} />
        <View style={{ flex: 1 }}>
          <ThemedText numberOfLines={1} style={{ fontSize: 20, lineHeight: 24, fontWeight: '700' }}>{p.name}</ThemedText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            {p.tp && <ThemedText type="smallBold" style={{ letterSpacing: 1, fontVariant: ['tabular-nums'] }}>{p.tp}</ThemedText>}
            <Icon name="shield" size={14} /><ThemedText type="small" style={{ fontWeight: '500', color: Lime }}>APU verified</ThemedText>
          </View>
        </View>
      </View>
      {rows.map(([icon, k, v], i) => (
        <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 15, paddingTop: 9 }}>
          <Icon name={icon} size={30} />
          <View style={{ flex: 1, paddingBottom: 9, borderBottomWidth: i < rows.length - 1 ? StyleSheet.hairlineWidth : 0, borderBottomColor: theme.border }}>
            <ThemedText themeColor="textSecondary" style={{ fontSize: 12, lineHeight: 16 }}>{k}</ThemedText>
            <ThemedText style={{ fontWeight: '500', lineHeight: 21 }}>{v}</ThemedText>
          </View>
        </View>
      ))}
    </View>
  );
}

export default function Onboarding({ onSave }: { onSave: (p: P) => Promise<void> }) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [p, setP] = useState<P | null>(null);
  const [nums, setNums] = useState<Record<string, string>>({ bw: '70', squat: '', bench: '', deadlift: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function save() {
    if (!p) return;
    const n = (k: string) => Math.round((Number(nums[k].replace(',', '.')) || 0) * 100) / 100;
    setBusy(true); setErr('');
    try { await onSave({ ...p, bw: n('bw'), squat: n('squat'), bench: n('bench'), deadlift: n('deadlift') }); }
    catch (x) { setErr(x instanceof Error ? x.message : 'Couldn’t save'); setBusy(false); }
  }
  const bw = Number(nums.bw.replace(',', '.'));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {!p ? (
            <>
              <Image source={img('/welcome.webp')} style={{ width, height: width * (800 / 1200), marginHorizontal: -16, marginBottom: 19 }} contentFit="cover" />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Image source={img('/icon-512.png')} style={{ width: 24, height: 24, borderRadius: 3 }} />
                <ThemedText type="smallBold" style={{ color: Lime, letterSpacing: 1.2, fontWeight: '700' }}>SPOTTER</ThemedText>
              </View>
              <ThemedText style={[styles.title, { marginTop: 4 }]}>Welcome to the APU gym</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={{ marginBottom: 19 }}>Sign in with your student account.</ThemedText>
              <Login onFound={setP} />
            </>
          ) : (
            <View style={{ gap: 19 }}>
              <View>
                <ThemedText style={styles.title}>Hi, {p.name.split(' ')[0]} 👋</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">We found you. Add your bodyweight and you&apos;re in.</ThemedText>
              </View>
              <Records p={p} />
              <View style={[styles.section, { borderBottomColor: theme.border }]}>
                <ThemedText style={{ fontWeight: '600' }}>Body &amp; bests <ThemedText type="small" themeColor="textSecondary">(kg)</ThemedText></ThemedText>
                <ThemedText themeColor="textSecondary" style={{ fontSize: 12, lineHeight: 17 }}>Bodyweight is needed for DOTS. Lifts are optional, they put you on the leaderboard and update as you log sets.</ThemedText>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 15 }}>
                  {([['bw', 'Body', 'scale'], ['squat', 'Squat', 'squat'], ['bench', 'Bench', 'bench'], ['deadlift', 'Deadlift', 'deadlift']] as const).map(([k, label, icon]) => (
                    <View key={k} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                      <Icon name={icon} size={36} />
                      <ThemedText themeColor="textSecondary" style={{ fontSize: 12, lineHeight: 16 }}>{label}</ThemedText>
                      <Input value={nums[k]} onChangeText={(v) => setNums((x) => ({ ...x, [k]: v }))} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={theme.textSecondary} selectTextOnFocus
                        style={[styles.num, { backgroundColor: theme.backgroundElement, color: theme.text }, k === 'bw' && { borderWidth: 1, borderColor: 'rgba(132,204,22,0.5)' }]} />
                    </View>
                  ))}
                </View>
              </View>
              {!!err && <ThemedText type="small" style={{ color: Red }}>{err}</ThemedText>}
              <Button onPress={save} disabled={busy || !(bw >= 30 && bw <= 250)}>{busy ? 'Saving…' : 'Let’s go'}</Button>
              <Pressable onPress={() => setP(null)} style={{ alignSelf: 'center' }}><ThemedText type="small" themeColor="textSecondary">Not you? Sign in again</ThemedText></Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, paddingBottom: 40 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700', letterSpacing: -0.5 },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
  field: { marginTop: 4, borderRadius: 5, paddingHorizontal: 11, paddingVertical: 9, fontSize: 16 },
  section: { marginHorizontal: -16, paddingHorizontal: 16, paddingVertical: 15, borderBottomWidth: StyleSheet.hairlineWidth },
  num: { alignSelf: 'stretch', borderRadius: 4, paddingVertical: 8, fontSize: 16, fontWeight: '600', textAlign: 'center', fontVariant: ['tabular-nums'] },
});
