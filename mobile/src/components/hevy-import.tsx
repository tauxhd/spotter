// Settings: bring your Hevy history over (the website's HevyImport), three ways: sync with your Hevy API key (Hevy Pro,
// remembered on this phone, one tap after that), pick Hevy's CSV export, or share the export straight to Spotter from
// Hevy (`shared` = the file the share sheet handed over). Workouts already here are skipped, so syncing again only adds new ones.
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { RefreshCw, Upload } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, TextInput, View } from 'react-native';

import { convert, fromApi, readHevy, type ApiWorkout, type HevyWorkout } from '@shared/hevy';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Lime, Red } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useStore } from '@/lib/store';
import { WEB } from '@/lib/web';

const KEY = 'spotter:hevyKey'; // on this phone only
const read = async (uri: string) => (Platform.OS === 'web' ? (await fetch(uri)).text() : new File(uri.startsWith('/') ? `file://${uri}` : uri).text());

export default function HevyImport({ shared }: { shared?: string }) {
  const { s, me, importHevy } = useStore();
  const theme = useTheme();
  const [state, setState] = useState<{ busy?: string; done?: string; err?: string; unmatched?: string[] }>({});
  const [saved, setSaved] = useState<string | null>(() => { try { return localStorage.getItem(KEY); } catch { return null; } });
  const [key, setKey] = useState('');

  const bring = useCallback(async (ws: HevyWorkout[]) => {
    if (!ws.length) throw new Error('No workouts found in your Hevy history.');
    setState({ busy: `Converting ${ws.length} workouts…` });
    const before = s.sessions.map((x) => ({ at: x.at, exercises: x.exercises }));
    const { items, lifts, unmatched } = convert(ws, s.library, { squat: Number(me.squat), bench: Number(me.bench), deadlift: Number(me.deadlift), bw: Number(me.bw) }, before);
    setState({ busy: `Saving ${items.length} workouts…` });
    const n = await importHevy(items, lifts);
    setState({ done: n ? `Imported ${n} workout${n === 1 ? '' : 's'} from Hevy${items.length > n ? ` (${items.length - n} were already here)` : ''}.` : "You're up to date: everything from Hevy is already in Spotter.", unmatched });
  }, [s.sessions, s.library, me, importHevy]);

  const fromFile = useCallback(async (uri: string) => {
    setState({ busy: 'Reading your Hevy export…' });
    try { await bring(readHevy(await read(uri))); } catch (e) { setState({ err: (e as Error).message }); }
  }, [bring]);

  // a CSV shared from Hevy: import it straight away, once
  const took = useRef<string | null>(null);
  useEffect(() => { if (shared && took.current !== shared && s.library.length) { took.current = shared; fromFile(shared); } }, [shared, s.library.length, fromFile]);

  async function sync(k: string) {
    setState({ busy: 'Fetching your workouts from Hevy…' });
    try {
      if (!WEB) throw new Error("Sync needs the Spotter website address; use the CSV instead.");
      const r = await fetch(`${WEB}/api/hevy`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key: k.trim() }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Couldn't reach Hevy");
      try { localStorage.setItem(KEY, k.trim()); } catch {}
      setSaved(k.trim()); setKey('');
      await bring(fromApi(j.workouts as ApiWorkout[]));
    } catch (e) { setState({ err: (e as Error).message }); }
  }

  async function pick() {
    const r = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/comma-separated-values', 'text/plain', 'application/vnd.ms-excel', '*/*'], copyToCacheDirectory: true });
    if (!r.canceled && r.assets?.[0]) fromFile(r.assets[0].uri);
  }

  const busy = !!state.busy;
  return (
    <View style={{ paddingVertical: 16, gap: 6 }}>
      <ThemedText type="smallBold" style={{ fontSize: 16 }}>Import from Hevy</ThemedText>
      {saved ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4 }}>
          <Button onPress={() => sync(saved)} disabled={busy} style={{ paddingHorizontal: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><RefreshCw size={16} color="#09090b" /><ThemedText style={{ color: '#09090b', fontWeight: '700' }}>{busy ? 'Syncing…' : 'Sync from Hevy'}</ThemedText></View>
          </Button>
          <Pressable onPress={() => { try { localStorage.removeItem(KEY); } catch {} setSaved(null); }} hitSlop={8}><ThemedText type="small" themeColor="textSecondary" style={{ textDecorationLine: 'underline' }}>Forget API key</ThemedText></Pressable>
        </View>
      ) : (
        <>
          <ThemedText type="small" themeColor="textSecondary">One tap with Hevy Pro: copy your API key from hevy.com → Settings → Developer and paste it here. It stays on this phone.</ThemedText>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            <TextInput value={key} onChangeText={setKey} secureTextEntry autoCapitalize="none" autoCorrect={false} placeholder="Hevy API key" placeholderTextColor={theme.textSecondary} accessibilityLabel="Hevy API key"
              style={{ flex: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: theme.text, backgroundColor: theme.backgroundElement }} />
            <Button onPress={() => key.trim() && sync(key)} disabled={busy || !key.trim()} style={{ paddingHorizontal: 16 }}>Sync</Button>
          </View>
        </>
      )}
      <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: 8 }}>No Hevy Pro? In Hevy: Settings → Export Data → Export Workout Data, then share it to Spotter{Platform.OS === 'android' ? '' : ' or pick the file'}:</ThemedText>
      <Button variant="ghost" onPress={pick} disabled={busy} style={{ alignSelf: 'flex-start', paddingHorizontal: 16, marginTop: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Upload size={16} color={theme.text} /><ThemedText style={{ fontWeight: '700' }}>Choose Hevy CSV</ThemedText></View>
      </Button>
      {!!state.busy && <ThemedText type="small" themeColor="textSecondary">{state.busy}</ThemedText>}
      {!!state.done && <ThemedText type="smallBold" style={{ color: Lime }}>{state.done}</ThemedText>}
      {!!state.err && <ThemedText type="small" style={{ color: Red }}>{state.err}</ThemedText>}
      {!!state.unmatched?.length && <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>Not in Spotter&apos;s library, kept under their Hevy name: {state.unmatched.join(', ')}.</ThemedText>}
      <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>Workouts, sets and PRs come over. Photos don&apos;t (Hevy doesn&apos;t share them).</ThemedText>
    </View>
  );
}
