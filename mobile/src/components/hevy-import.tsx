// Settings: bring your Hevy history over (the website's HevyImport). Reads Hevy's CSV export on the phone, converts it
// like a finished workout, and saves it to your account (workouts already here are skipped, so running it twice is safe).
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Upload } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, View } from 'react-native';

import { convert, readHevy } from '@shared/hevy';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Lime, Red } from '@/constants/theme';
import { useStore } from '@/lib/store';

export default function HevyImport() {
  const { s, me, importHevy } = useStore();
  const [state, setState] = useState<{ busy?: string; done?: string; err?: string; unmatched?: string[] }>({});

  async function pick() {
    const r = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/comma-separated-values', 'text/plain', 'application/vnd.ms-excel', '*/*'], copyToCacheDirectory: true });
    if (r.canceled || !r.assets?.[0]) return;
    setState({ busy: 'Reading your Hevy export…' });
    try {
      const uri = r.assets[0].uri;
      const text = Platform.OS === 'web' ? await (await fetch(uri)).text() : await new File(uri).text();
      const ws = readHevy(text);
      if (!ws.length) throw new Error('No workouts found in that file.');
      setState({ busy: `Converting ${ws.length} workouts…` });
      const before = s.sessions.map((x) => ({ at: x.at, exercises: x.exercises }));
      const { items, lifts, unmatched } = convert(ws, s.library, { squat: Number(me.squat), bench: Number(me.bench), deadlift: Number(me.deadlift), bw: Number(me.bw) }, before);
      setState({ busy: `Saving ${items.length} workouts…` });
      const n = await importHevy(items, lifts);
      setState({ done: n ? `Imported ${n} workout${n === 1 ? '' : 's'} from Hevy${items.length > n ? ` (${items.length - n} were already here)` : ''}.` : 'Everything in that file is already in Spotter.', unmatched });
    } catch (e) {
      setState({ err: (e as Error).message });
    }
  }

  return (
    <View style={{ paddingVertical: 16, gap: 6 }}>
      <ThemedText type="smallBold" style={{ fontSize: 16 }}>Import from Hevy</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">1. In Hevy: Settings → Export Data → Export Workout Data.</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">2. Pick the CSV file here. Your workouts, sets and PRs come over; photos don&apos;t.</ThemedText>
      <Button onPress={pick} disabled={!!state.busy} style={{ marginTop: 6, alignSelf: 'flex-start', paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Upload size={16} color="#09090b" /><ThemedText style={{ color: '#09090b', fontWeight: '700' }}>{state.busy ? 'Importing…' : 'Choose Hevy CSV'}</ThemedText></View>
      </Button>
      {!!state.busy && <ThemedText type="small" themeColor="textSecondary">{state.busy}</ThemedText>}
      {!!state.done && <ThemedText type="smallBold" style={{ color: Lime }}>{state.done}</ThemedText>}
      {!!state.err && <ThemedText type="small" style={{ color: Red }}>{state.err}</ThemedText>}
      {!!state.unmatched?.length && <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>Not in Spotter&apos;s library, kept under their Hevy name: {state.unmatched.join(', ')}.</ThemedText>}
    </View>
  );
}
