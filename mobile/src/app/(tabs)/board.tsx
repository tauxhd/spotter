// Ranks: leaderboards by event (powerlifting from logged sets, other events self-reported), with open, pound-for-pound
// (DOTS / × bodyweight) and IPF weight-class standards. Same data and maths as the website's /board.
import { Image } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { eventGroups, events, gymLifts, lifters, mockResults, weightClasses, type Sex } from '@shared/data';
import { baseOf, bests, dots, fmtResult, liftsOf, parseResult, weightClass } from '@shared/lifting';
import Avatar from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { BottomTabInset, Lime, Spring } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { sb, useStore, type Profile } from '@/lib/store';
import { img } from '@/lib/web';

type Standard = 'open' | 'p4p' | 'class';
const standards: { id: Standard; label: string }[] = [{ id: 'open', label: 'Open' }, { id: 'p4p', label: 'Pound for pound' }, { id: 'class', label: 'Weight class' }];
const placeholder = { kg: 'kg', reps: 'reps', cm: 'cm', sec: 'seconds, e.g. 12.8', time: 'm:ss, e.g. 9:45' };
const icon = (name: string) => img(`/icons/${name}.webp`);
const layout = LinearTransition.springify().dampingRatio(Spring.dampingRatio).duration(Spring.duration);

export default function Ranks() {
  const { s, me } = useStore();
  const theme = useTheme();
  const [others, setOthers] = useState<Omit<Profile, 'intake'>[]>([]);
  const [group, setGroup] = useState<string>('Powerlifting');
  const [eventId, setEventId] = useState('total');
  const [std, setStd] = useState<Standard>('p4p');
  const [sex, setSex] = useState<'all' | Sex>('all');
  const [cls, setCls] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, number>>({});
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const ev = events.find((e) => e.id === eventId)!;
  const gym = gymLifts.includes(ev.id);
  const standard: Standard = std === 'p4p' && !ev.p4p ? 'open' : std;
  const classSex: Sex = sex === 'all' ? me.sex : sex;
  const limits = weightClasses[classSex];
  const myClass = weightClass(me.bw, limits);
  const activeClass = cls && (cls.endsWith('+') || limits.includes(Number(cls.slice(1)))) ? cls : myClass;

  useEffect(() => {
    sb.from('profiles').select('id, name, faculty, sex, bw, squat, bench, deadlift, avatar_url').neq('id', me.id).then(({ data }) => data && setOthers(data));
  }, [me.id]);
  useEffect(() => {
    if (gym) return;
    sb.from('results').select('user_id, value').eq('event', ev.id)
      .then(({ data }) => setResults(Object.fromEntries((data ?? []).map((r) => [r.user_id, Number(r.value)]))));
  }, [ev.id, gym]);

  const rows = useMemo(() => {
    const lifts = <T extends { squat: number; bench: number; deadlift: number }>(l: T) => ({ ...l, total: l.squat + l.bench + l.deadlift });
    const you = { ...me, name: `${me.name} (you)`, verified: false, ...lifts(liftsOf(bests(baseOf(me), s.sessions))) };
    const people = [
      ...lifters.map((l) => ({ ...lifts(l), avatar_url: null as string | null | undefined, value: gym ? lifts(l)[ev.id as 'total'] : mockResults[l.id]?.[ev.id] })),
      ...others.map((p) => { const l = lifts({ squat: Number(p.squat), bench: Number(p.bench), deadlift: Number(p.deadlift) }); return { ...p, ...l, bw: Number(p.bw), verified: false, value: gym ? l[ev.id as 'total'] : results[p.id] }; }),
      { ...you, value: gym ? you[ev.id as 'total'] : results[me.id] },
    ];
    return people
      .filter((l) => l.value && l.value > 0)
      .filter((l) => (standard === 'class' ? l.sex === classSex && weightClass(l.bw, limits) === activeClass : sex === 'all' || l.sex === sex))
      .map((l) => ({ ...l, score: standard !== 'p4p' ? l.value! : ev.p4p === 'dots' ? dots(l.value!, l.bw, l.sex) : l.value! / l.bw }))
      .sort((x, y) => (ev.lower && standard !== 'p4p' ? x.score - y.score : y.score - x.score));
  }, [me, s.sessions, others, results, gym, ev, standard, classSex, limits, activeClass, sex]);

  const fmt = (v: number) => (ev.unit === 'kg' ? `${Math.round(v * 10) / 10} kg` : fmtResult(v, ev.unit));
  const show = (n: number) => (standard === 'p4p' ? (ev.p4p === 'dots' ? n.toFixed(1) : `${n.toFixed(2)}×`) : fmt(n));
  const unitLabel = standard === 'p4p' ? (ev.p4p === 'dots' ? 'DOTS' : '× bodyweight') : '';
  const myRank = rows.findIndex((l) => l.id === me.id);
  const ahead = myRank > 0 ? rows[myRank - 1] : null;
  const myValue = gym ? undefined : results[me.id];
  const podium = rows.slice(0, 3);

  async function save() {
    const v = parseResult(draft, ev.unit);
    if (!v || (myValue && !(ev.lower ? v < myValue : v > myValue))) return setDraft('');
    setSaving(true);
    const { error } = await sb.from('results').upsert({ user_id: me.id, event: ev.id, value: v, updated_at: new Date().toISOString() });
    setSaving(false);
    if (!error) { setResults((r) => ({ ...r, [me.id]: v })); setDraft(''); }
  }

  const card = { backgroundColor: theme.backgroundElement };
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={[styles.page, { paddingBottom: BottomTabInset + 40 }]} keyboardShouldPersistTaps="handled">
        <ThemedText style={styles.h1}>Ranks</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {standard === 'p4p' ? (ev.p4p === 'dots' ? 'DOTS: total adjusted for bodyweight, so every size competes fairly' : 'Lift divided by bodyweight')
            : standard === 'class' ? `IPF weight classes, ${classSex === 'M' ? 'men' : 'women'}` : ev.lower ? 'Fastest time wins' : 'Best result, any bodyweight'}
        </ThemedText>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs} style={[styles.tabRow, { borderColor: theme.border }]}>
          {eventGroups.map((g) => (
            <Pressable key={g} onPress={() => { setGroup(g); setEventId(events.find((e) => e.group === g)!.id); }} style={[styles.tab, group === g && { borderBottomColor: Lime }]}>
              <ThemedText type="smallBold" style={{ color: group === g ? theme.text : theme.textSecondary }}>{g}</ThemedText>
            </Pressable>
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {events.filter((e) => e.group === group).map((e) => {
            const on = e.id === eventId, src = icon(e.icon);
            return (
              <Pressable key={e.id} onPress={() => setEventId(e.id)} style={[styles.event, card, on && { borderColor: Lime, backgroundColor: 'rgba(132,204,22,0.1)' }]}>
                {src ? <Image source={src} style={{ width: 36, height: 36 }} /> : <View style={{ height: 36 }} />}
                <ThemedText type="small" style={{ fontSize: 11, textAlign: 'center', fontWeight: on ? '800' : '500' }}>{e.name}</ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={[styles.segment, card]}>
          {standards.map((x) => {
            const off = x.id === 'p4p' && !ev.p4p, on = standard === x.id;
            return (
              <Pressable key={x.id} disabled={off} onPress={() => setStd(x.id)} style={[styles.segBtn, on && { backgroundColor: Lime }, off && { opacity: 0.3 }]}>
                <ThemedText type="smallBold" style={{ fontSize: 12, color: on ? '#09090b' : theme.textSecondary }}>{x.label}</ThemedText>
              </Pressable>
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', gap: 18 }}>
          {(standard === 'class' ? (['M', 'F'] as const) : (['all', 'M', 'F'] as const)).map((x) => {
            const on = (standard === 'class' ? classSex : sex) === x;
            return (
              <Pressable key={x} onPress={() => setSex(x)} style={[styles.tab, on && { borderBottomColor: Lime }]}>
                <ThemedText type="smallBold" style={{ color: on ? theme.text : theme.textSecondary }}>{x === 'all' ? 'Everyone' : x === 'M' ? 'Men' : 'Women'}</ThemedText>
              </Pressable>
            );
          })}
        </View>
        {standard === 'class' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {[...limits.map((l) => `-${l}`), `${limits.at(-1)}+`].map((c) => (
              <Pressable key={c} onPress={() => setCls(c)} style={[styles.chip, card, activeClass === c && { backgroundColor: Lime }]}>
                <ThemedText type="smallBold" style={{ fontSize: 12, color: activeClass === c ? '#09090b' : theme.text }}>{c} kg{c === myClass && classSex === me.sex ? ' · you' : ''}</ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {podium.length === 3 && (
          <Animated.View layout={layout} style={[styles.podium, card]}>
            {[podium[1], podium[0], podium[2]].map((l) => {
              const place = rows.indexOf(l), first = place === 0;
              return (
                <View key={l.id} style={{ flex: 1, alignItems: 'center' }}>
                  <Avatar url={l.avatar_url} name={l.name} size={first ? 72 : 56} ring={first ? '#fbbf24' : place === 1 ? '#d4d4d8' : '#fb923c'} />
                  <ThemedText style={{ fontSize: 18, marginTop: -8 }}>{['🥇', '🥈', '🥉'][place]}</ThemedText>
                  <ThemedText type="smallBold" numberOfLines={1}>{l.name}</ThemedText>
                  <ThemedText style={{ fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{show(l.score)}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 10 }}>{unitLabel || ' '}</ThemedText>
                  <View style={{ height: first ? 52 : place === 1 ? 38 : 26, alignSelf: 'stretch', marginTop: 6, borderTopLeftRadius: 12, borderTopRightRadius: 12, backgroundColor: first ? 'rgba(251,191,36,0.2)' : place === 1 ? 'rgba(161,161,170,0.15)' : 'rgba(251,146,60,0.15)' }} />
                </View>
              );
            })}
          </Animated.View>
        )}

        {myRank >= 0 && (
          <View style={[styles.row, card]}>
            <View style={{ flex: 1 }}>
              <ThemedText type="smallBold" style={{ fontSize: 16 }}>You&apos;re #{myRank + 1} of {rows.length}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">{ahead ? `${show(Math.abs(ahead.score - rows[myRank].score))}${unitLabel === 'DOTS' ? ' DOTS' : ''} to pass ${ahead.name}` : 'Top of the board. Defend it 💪'}</ThemedText>
            </View>
            <ThemedText style={{ fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{show(rows[myRank].score)}</ThemedText>
          </View>
        )}

        {!gym && (
          <View style={[styles.row, card]}>
            <View style={{ flex: 1 }}>
              <ThemedText type="smallBold">{myValue ? `Your best: ${fmt(myValue)}` : `Log your ${ev.name.toLowerCase()}`}</ThemedText>
              <TextInput value={draft} onChangeText={setDraft} placeholder={placeholder[ev.unit]} placeholderTextColor={theme.textSecondary}
                keyboardType={ev.unit === 'time' ? 'default' : 'decimal-pad'} style={[styles.input, { backgroundColor: theme.backgroundSelected, color: theme.text }]} />
            </View>
            <Button onPress={save} disabled={saving || !parseResult(draft, ev.unit)} style={{ paddingVertical: 10, alignSelf: 'flex-end' }}>{saving ? '…' : 'Save'}</Button>
          </View>
        )}
        {gym && myRank < 0 && <ThemedText type="small" themeColor="textSecondary" style={[styles.row, card]}>Log {ev.name.toLowerCase()} sets in Train to get on this board.</ThemedText>}

        {rows.map((l, i) => (
          <Animated.View key={l.id} entering={FadeInDown.delay(Math.min(i, 8) * 30).springify().dampingRatio(1).duration(350)} layout={layout}
            style={[styles.row, card, l.id === me.id && { backgroundColor: 'rgba(132,204,22,0.12)' }]}>
            <ThemedText type="smallBold" style={{ width: 22, textAlign: 'center', color: i < 3 ? '#f59e0b' : theme.textSecondary }}>{i + 1}</ThemedText>
            <Avatar url={l.avatar_url} name={l.name} size={42} />
            <View style={{ flex: 1 }}>
              <ThemedText type="smallBold" numberOfLines={1}>{l.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>{l.faculty} · {Math.round(l.bw)} kg · {weightClass(l.bw, weightClasses[l.sex])} class</ThemedText>
              {standard === 'p4p' && <ThemedText type="small" themeColor="textSecondary">{fmt(l.value!)}</ThemedText>}
            </View>
            <ThemedText style={{ fontSize: 17, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{show(l.score)}</ThemedText>
          </Animated.View>
        ))}
        {rows.length === 0 && <ThemedText themeColor="textSecondary" style={{ textAlign: 'center', marginTop: 20 }}>Nobody here yet. Log a result and take first place.</ThemedText>}
        <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 11 }}>Gym lifts come from logged sets; other events are self-reported.</ThemedText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 12 },
  h1: { fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.6 },
  tabRow: { flexGrow: 0, borderBottomWidth: StyleSheet.hairlineWidth },
  tabs: { gap: 20 },
  tab: { paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  event: { width: 84, alignItems: 'center', gap: 4, borderRadius: 16, padding: 8, borderWidth: 2, borderColor: 'transparent' },
  segment: { flexDirection: 'row', borderRadius: 16, padding: 4, gap: 4 },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 12 },
  chip: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  podium: { flexDirection: 'row', alignItems: 'flex-end', borderRadius: 18, paddingTop: 20, paddingHorizontal: 8, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 12 },
  input: { marginTop: 6, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 16 },
});
