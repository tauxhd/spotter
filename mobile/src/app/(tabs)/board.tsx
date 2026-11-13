// Ranks: leaderboards by event (powerlifting from logged sets, other events self-reported), with open, pound-for-pound
// (DOTS / × bodyweight) and IPF weight-class standards. Same data, maths and layout as the website's /board.
import { router } from 'expo-router';
import { Check, ChevronDown } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { eventGroups, events, gymLifts, lifters, mockResults, weightClasses, type Sex } from '@shared/data';
import { baseOf, heaviest, dots, fmtResult, liftsOf, parseResult, weightClass } from '@shared/lifting';
import Avatar from '@/components/avatar';
import { FollowButton } from '@/components/post-card';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { EmptyState, Icon, Title } from '@/components/ui/kit';
import WorkoutPill from '@/components/workout-pill';
import { BottomTabInset, Lime, Spring } from '@/constants/theme';
import { usePullRefresh } from '@/hooks/use-pull-refresh';
import { useTheme } from '@/hooks/use-theme';
import { sb, useStore, type Profile } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { ranksHelp } from '@shared/help';

type Standard = 'open' | 'p4p' | 'class';
type Who = 'all' | 'faculty' | 'following' | 'followers' | 'friends';
const standards: { id: Standard; label: string; icon: string }[] = [
  { id: 'open', label: 'Open', icon: 'medal' }, { id: 'p4p', label: 'Pound for pound', icon: 'p4p' }, { id: 'class', label: 'Weight class', icon: 'scale' },
];
const placeholder = { kg: 'kg', reps: 'reps', cm: 'cm', sec: 'seconds, e.g. 12.8', time: 'm:ss, e.g. 9:45' };
const layout = LinearTransition.springify().dampingRatio(Spring.dampingRatio).duration(Spring.duration);
const toProfile = (id: string) => router.push({ pathname: '/u/[id]', params: { id } });

function Stat({ icon, children }: { icon: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: theme.backgroundSelected }]}>
      <Icon name={icon} size={14} /><ThemedText themeColor="textSecondary" style={{ fontSize: 11, fontWeight: '500', fontVariant: ['tabular-nums'] }}>{children}</ThemedText>
    </View>
  );
}

export default function Ranks() {
  const { s, me } = useStore();
  const pull = usePullRefresh();
  const theme = useTheme();
  const [others, setOthers] = useState<Omit<Profile, 'intake'>[]>([]);
  const [group, setGroup] = useState<string>('Powerlifting');
  const [eventId, setEventId] = useState('total');
  const [std, setStd] = useState<Standard>('p4p');
  const [sex, setSex] = useState<'all' | Sex>('all');
  const [who, setWho] = useState<Who>('all');
  const [picking, setPicking] = useState(false);
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
  const whoOptions: [Who, string][] = [['all', 'All students'], ['faculty', me.faculty], ['following', 'Following'], ['followers', 'Followers'], ['friends', 'Friends']];

  useEffect(() => {
    sb.from('profiles').select('id, name, faculty, sex, bw, squat, bench, deadlift, avatar_url').neq('id', me.id).then(({ data }) => data && setOthers(data));
  }, [me.id, s.rev]); // s.rev: pull to refresh
  useEffect(() => {
    if (gym) return;
    sb.from('results').select('user_id, value').eq('event', ev.id)
      .then(({ data }) => setResults(Object.fromEntries((data ?? []).map((r) => [r.user_id, Number(r.value)]))));
  }, [ev.id, gym, s.rev]);

  const rows = useMemo(() => {
    const lifts = <T extends { squat: number; bench: number; deadlift: number }>(l: T) => ({ ...l, total: l.squat + l.bench + l.deadlift });
    const you = { ...me, name: `${me.name} (you)`, verified: false, ...lifts(liftsOf(heaviest(baseOf(me), s.sessions))) };
    const people = [
      ...lifters.map((l) => ({ ...lifts(l), avatar_url: null as string | null | undefined, value: gym ? lifts(l)[ev.id as 'total'] : mockResults[l.id]?.[ev.id] })),
      ...others.map((p) => { const l = lifts({ squat: Number(p.squat), bench: Number(p.bench), deadlift: Number(p.deadlift) }); return { ...p, ...l, bw: Number(p.bw), verified: false, value: gym ? l[ev.id as 'total'] : results[p.id] }; }),
      { ...you, value: gym ? you[ev.id as 'total'] : results[me.id] },
    ];
    return people
      .filter((l) => l.value && l.value > 0)
      .filter((l) => l.id === me.id || who === 'all' // you always stay in, so you see where you rank
        || (who === 'faculty' && l.faculty === me.faculty)
        || (who === 'following' && s.following.includes(l.id))
        || (who === 'followers' && s.followers.includes(l.id))
        || (who === 'friends' && s.following.includes(l.id) && s.followers.includes(l.id)))
      .filter((l) => (standard === 'class' ? l.sex === classSex && weightClass(l.bw, limits) === activeClass : sex === 'all' || l.sex === sex))
      .map((l) => ({ ...l, score: standard !== 'p4p' ? l.value! : ev.p4p === 'dots' ? dots(l.value!, l.bw, l.sex) : l.value! / l.bw }))
      .sort((x, y) => (ev.lower && standard !== 'p4p' ? x.score - y.score : y.score - x.score));
  }, [me, s.sessions, s.following, s.followers, others, results, gym, ev, standard, classSex, limits, activeClass, sex, who]);

  const fmt = (v: number) => (ev.unit === 'kg' ? `${Math.round(v * 10) / 10} kg` : fmtResult(v, ev.unit));
  const show = (n: number) => (standard === 'p4p' ? (ev.p4p === 'dots' ? n.toFixed(1) : `${n.toFixed(2)}×`) : fmt(n));
  const unitLabel = standard === 'p4p' ? (ev.p4p === 'dots' ? 'DOTS' : '× bodyweight') : '';
  const myRank = rows.findIndex((l) => l.id === me.id);
  const ahead = myRank > 0 ? rows[myRank - 1] : null;
  const myValue = gym ? undefined : results[me.id];
  const podium = rows.slice(0, 3);
  const isReal = (id: string) => others.some((o) => o.id === id);

  async function save() {
    const v = parseResult(draft, ev.unit);
    if (!v || (myValue && !(ev.lower ? v < myValue : v > myValue))) return setDraft('');
    setSaving(true);
    const { error } = await sb.from('results').upsert({ user_id: me.id, event: ev.id, value: v, updated_at: new Date().toISOString() });
    setSaving(false);
    if (!error) { setResults((r) => ({ ...r, [me.id]: v })); setDraft(''); }
  }

  const card = [styles.card, { borderBottomColor: theme.border }];
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView refreshControl={pull} contentContainerStyle={[styles.page, { paddingBottom: BottomTabInset + 40 }]} keyboardShouldPersistTaps="handled">
        <Title icon="ranks" info={ranksHelp(standard, ev.p4p, ev.lower, classSex, gym)}>Ranks</Title>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 20, paddingHorizontal: 16 }} style={[styles.bleed, styles.tabRow, { borderColor: theme.border }]}>
          {eventGroups.map((g) => (
            <Pressable key={g} onPress={() => { setGroup(g); setEventId(events.find((e) => e.group === g)!.id); }} style={[styles.tab, group === g && { borderBottomColor: Lime }]}>
              <ThemedText type="smallBold" style={{ color: group === g ? theme.text : theme.textSecondary }}>{g}</ThemedText>
            </Pressable>
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 2 }} style={styles.bleed}>
          {events.filter((e) => e.group === group).map((e) => {
            const on = e.id === eventId;
            return (
              <Pressable key={e.id} onPress={() => setEventId(e.id)} style={[styles.event, { backgroundColor: on ? 'rgba(163,230,53,0.1)' : theme.backgroundElement, borderColor: on ? Lime : 'transparent' }]}>
                <Icon name={e.icon} size={40} />
                <ThemedText style={{ fontSize: 11, lineHeight: 13, textAlign: 'center', fontWeight: on ? '700' : '500', color: on ? theme.text : theme.textSecondary }}>{e.name}</ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={[styles.segment, { backgroundColor: theme.backgroundElement }]}>
          {standards.map((x) => {
            const off = x.id === 'p4p' && !ev.p4p, on = standard === x.id;
            return (
              <Pressable key={x.id} disabled={off} onPress={() => setStd(x.id)} style={[styles.segBtn, on && { backgroundColor: '#84cc16' }, off && { opacity: 0.3 }]}>
                <Icon name={x.icon} size={18} />
                <ThemedText style={{ fontSize: 12, lineHeight: 15, fontWeight: '600', textAlign: 'center', flexShrink: 1, color: on ? '#09090b' : theme.textSecondary }}>{x.label}</ThemedText>
              </Pressable>
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 20 }}>
          {(standard === 'class' ? (['M', 'F'] as const) : (['all', 'M', 'F'] as const)).map((x) => {
            const on = (standard === 'class' ? classSex : sex) === x;
            return (
              <Pressable key={x} onPress={() => setSex(x)} style={[styles.tab, on && { borderBottomColor: Lime }]}>
                <ThemedText type="smallBold" style={{ color: on ? theme.text : theme.textSecondary }}>{x === 'all' ? 'Everyone' : x === 'M' ? 'Men' : 'Women'}</ThemedText>
              </Pressable>
            );
          })}
          <Pressable onPress={() => setPicking(true)} style={styles.who} accessibilityLabel="Show">
            <Icon name={who === 'faculty' ? 'faculty' : who === 'all' ? 'crowd' : 'person'} size={16} />
            <ThemedText type="smallBold">{whoOptions.find(([k]) => k === who)![1]}</ThemedText>
            <ChevronDown size={14} color={theme.textSecondary} />
          </Pressable>
        </View>

        {standard === 'class' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }} style={styles.bleed}>
            {[...limits.map((l) => `-${l}`), `${limits.at(-1)}+`].map((c) => (
              <Pressable key={c} onPress={() => setCls(c)} style={[styles.chip, { backgroundColor: activeClass === c ? '#84cc16' : theme.backgroundElement }]}>
                <ThemedText type="smallBold" style={{ fontSize: 12, color: activeClass === c ? '#09090b' : theme.text }}>{c} kg{c === myClass && classSex === me.sex ? ' · you' : ''}</ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {podium.length === 3 && (
          <Animated.View layout={layout} style={[card, styles.podium]}>
            {[podium[1], podium[0], podium[2]].map((l) => {
              const place = rows.indexOf(l), first = place === 0;
              return (
                <View key={l.id} style={{ flex: 1, alignItems: 'center' }}>
                  <Pressable onPress={() => toProfile(l.id)} style={{ alignItems: 'center', alignSelf: 'stretch' }}>
                    <View style={{ borderRadius: 999, borderWidth: 4, borderColor: first ? '#fbbf24' : place === 1 ? '#d4d4d8' : '#fb923c' }}>
                      <Avatar id={l.id} url={l.avatar_url} name={l.name} size={first ? 76 : 60} />
                    </View>
                    <ThemedText style={styles.medal}>{['🥇', '🥈', '🥉'][place]}</ThemedText>
                    <ThemedText type="smallBold" numberOfLines={1} style={{ marginTop: 2 }}>{l.name}</ThemedText>
                  </Pressable>
                  <ThemedText style={{ fontSize: 18, lineHeight: 22, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{show(l.score)}</ThemedText>
                  <ThemedText themeColor="textSecondary" style={{ fontSize: 10 }}>{unitLabel || ' '}</ThemedText>
                  <View style={{ height: first ? 56 : place === 1 ? 40 : 28, alignSelf: 'stretch', marginTop: 8, borderTopLeftRadius: 5, borderTopRightRadius: 5, backgroundColor: first ? 'rgba(251,191,36,0.2)' : place === 1 ? 'rgba(161,161,170,0.15)' : 'rgba(251,146,60,0.15)' }} />
                </View>
              );
            })}
          </Animated.View>
        )}

        {myRank >= 0 ? (
          <View style={[card, styles.rowCard]}>
            <Icon name="medal" size={40} />
            <View style={{ flex: 1 }}>
              <ThemedText type="smallBold" style={{ fontSize: 16 }}>You&apos;re #{myRank + 1} of {rows.length}</ThemedText>
              <ThemedText themeColor="textSecondary" style={{ fontSize: 12 }}>{ahead ? `${show(Math.abs(ahead.score - rows[myRank].score))}${unitLabel === 'DOTS' ? ' DOTS' : ''} to pass ${ahead.name}` : 'Top of the board. Defend it 💪'}</ThemedText>
            </View>
            <ThemedText style={{ fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{show(rows[myRank].score)}</ThemedText>
          </View>
        ) : myValue && standard === 'class' ? (
          <ThemedText type="small" themeColor="textSecondary" style={card}>You compete in the {myClass} kg class ({me.sex === 'M' ? 'men' : 'women'}).</ThemedText>
        ) : null}

        {!gym && (
          <View style={[card, styles.rowCard]}>
            <Icon name={ev.icon} size={40} />
            <View style={{ flex: 1 }}>
              <ThemedText type="smallBold">{myValue ? `Your best: ${fmt(myValue)}` : `Log your ${ev.name.toLowerCase()}`}</ThemedText>
              <Input value={draft} onChangeText={setDraft} placeholder={placeholder[ev.unit]} placeholderTextColor={theme.textSecondary}
                keyboardType={ev.unit === 'time' ? 'default' : 'decimal-pad'} style={[styles.input, { backgroundColor: theme.backgroundSelected, color: theme.text }]} />
            </View>
            <Button onPress={save} disabled={saving || !parseResult(draft, ev.unit)} style={{ paddingVertical: 9, alignSelf: 'flex-end' }}>{saving ? '…' : 'Save'}</Button>
          </View>
        )}
        {gym && myRank < 0 && <ThemedText type="small" themeColor="textSecondary" style={card}>Log {ev.name.toLowerCase()} sets in Train to get on this board.</ThemedText>}

        <View>
          {rows.map((l, i) => (
            <Animated.View key={l.id} entering={FadeInDown.delay(Math.min(i, 8) * 30).springify().dampingRatio(1).duration(350)} layout={layout}
              style={[card, styles.rowCard, { paddingVertical: 12 }, l.id === me.id && { backgroundColor: 'rgba(163,230,53,0.1)' }]}>
              <ThemedText type="smallBold" style={{ width: 20, textAlign: 'center', fontVariant: ['tabular-nums'], color: i < 3 ? '#f59e0b' : theme.textSecondary }}>{i + 1}</ThemedText>
              <Pressable onPress={() => toProfile(l.id)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Avatar id={l.id} url={l.avatar_url} name={l.name} size={44} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <ThemedText type="smallBold" numberOfLines={1} style={{ flexShrink: 1, fontSize: 15 }}>{l.name}</ThemedText>
                    {l.verified && <Icon name="verified" size={16} />}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Icon name="faculty" size={14} /><ThemedText themeColor="textSecondary" style={{ fontSize: 12 }}>{l.faculty}</ThemedText>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                    <Stat icon="scale">{Math.round(l.bw)} kg · {weightClass(l.bw, weightClasses[l.sex])} kg class</Stat>
                    {standard === 'p4p' && <Stat icon={ev.icon}>{fmt(l.value!)}</Stat>}
                  </View>
                </View>
              </Pressable>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <ThemedText style={{ fontSize: 18, lineHeight: 20, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{show(l.score)}</ThemedText>
                {isReal(l.id) && <FollowButton id={l.id} name={l.name} />}
              </View>
            </Animated.View>
          ))}
          {rows.length === 0 && <EmptyState art="podium" title="Nobody here yet" text={['following', 'followers', 'friends'].includes(who) ? 'Follow students from the feed to compare with them.' : 'Log a result and take first place.'} />}
        </View>
      </ScrollView>
      <WorkoutPill />

      <Modal visible={picking} transparent animationType="fade" onRequestClose={() => setPicking(false)}>
        <Pressable style={styles.scrim} onPress={() => setPicking(false)}>
          <Animated.View entering={ZoomIn.springify().dampingRatio(1).duration(300)} style={[styles.menu, { backgroundColor: theme.backgroundElement }]}>
            {whoOptions.map(([k, label]) => (
              <Pressable key={k} onPress={() => { setWho(k); setPicking(false); }} style={styles.menuRow}>
                <ThemedText type="smallBold" style={{ flex: 1 }}>{label}</ThemedText>
                {who === k && <Check size={16} color={Lime} />}
              </Pressable>
            ))}
          </Animated.View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 16, paddingTop: 8, gap: 16 },
  bleed: { marginHorizontal: -16, flexGrow: 0 },
  tabRow: { borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  event: { width: 84, alignItems: 'center', gap: 4, borderRadius: 6, padding: 8, borderWidth: 2 },
  segment: { flexDirection: 'row', borderRadius: 6, padding: 4, gap: 4 },
  segBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 6, borderRadius: 5 },
  who: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4, paddingBottom: 8 },
  chip: { borderRadius: 4, paddingHorizontal: 12, paddingVertical: 7 },
  card: { marginHorizontal: -16, paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  podium: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingTop: 24, paddingBottom: 0 },
  medal: { fontSize: 20, lineHeight: 24, marginTop: -12 },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 2, paddingVertical: 2, paddingLeft: 4, paddingRight: 8 },
  input: { marginTop: 4, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 8, fontSize: 16 },
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 32 },
  menu: { width: '100%', maxWidth: 300, borderRadius: 6, paddingVertical: 6 },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
});
