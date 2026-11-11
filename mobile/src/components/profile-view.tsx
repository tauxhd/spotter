// Social-style profile (the website's ProfileView): photo, Workouts / Followers / Following, bio, follow or edit, share,
// then every workout they've posted that you're allowed to see. Used by /u/[id] and /me.
import { router } from 'expo-router';
import { Share2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { lifters, type Post } from '@shared/data';
import Avatar from '@/components/avatar';
import PostCard, { FollowButton } from '@/components/post-card';
import ProfileSheet from '@/components/profile-sheet';
import { ThemedText } from '@/components/themed-text';
import { Button, Press } from '@/components/ui/button';
import { Bone, EmptyState, Icon } from '@/components/ui/kit';
import { Lime } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { POST_SELECT, sb, toPost, useStore, type Profile } from '@/lib/store';

type Person = { id: string; name: string; faculty: string; avatar_url: string | null };
type Stats = { workouts: number; followers: number; following: number };

export default function ProfileView({ userId }: { userId: string }) {
  const { s, me } = useStore();
  const theme = useTheme();
  const own = userId === me.id;
  const demo = lifters.find((l) => l.id === userId);
  const [other, setOther] = useState<Profile | null | undefined>(own ? me : demo ? { ...demo, intake: null, avatar_url: null, bio: null } : undefined);
  const [stats, setStats] = useState<Stats | null>(null);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [list, setList] = useState<{ kind: 'followers' | 'following'; people: Person[] | null } | null>(null);
  const [editing, setEditing] = useState(false);
  const p = own ? me : other;

  useEffect(() => {
    if (own || demo) return;
    sb.from('profiles').select('*').eq('id', userId).maybeSingle().then(({ data }) => setOther(data));
  }, [own, userId, demo]);
  useEffect(() => {
    if (demo) return;
    sb.rpc('profile_stats', { uid: userId }).then(({ data }) => data?.[0] && setStats(data[0]));
  }, [userId, demo, s.following.length, s.followers.length, s.posts.length]);
  useEffect(() => {
    const base = sb.from('posts').select(POST_SELECT);
    (demo ? base.is('user_id', null).eq('by', demo.name) : base.eq('user_id', userId))
      .order('created_at', { ascending: false }).order('created_at', { referencedTable: 'comments' }).limit(30)
      .then(({ data }) => {
        const l = (data ?? []).map((r) => toPost(r, me.id));
        setPosts(l);
        if (demo) setStats({ workouts: l.length, followers: 0, following: 0 });
      });
  }, [userId, demo, me.id, s.posts.length]);

  async function openList(kind: 'followers' | 'following') {
    setList({ kind, people: null });
    const { data } = await sb.rpc('follow_list', { uid: userId, kind });
    setList({ kind, people: data ?? [] });
  }

  if (p === undefined) return <View style={{ padding: 16, gap: 12 }}><View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}><Bone w={84} h={84} r={42} /><Bone w={180} h={20} /></View><Bone w="60%" h={16} /><Bone w="100%" h={180} /></View>;
  if (p === null) return <EmptyState art="not-found" title="This profile doesn't exist" text="The link may be old, or the student deleted their account." />;

  const stat = (n: number | undefined, label: string, onPress?: () => void) => (
    <Pressable onPress={onPress} disabled={!onPress} style={{ flex: 1, alignItems: 'center' }}>
      <ThemedText style={{ fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{n ?? '–'}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>{label}</ThemedText>
    </Pressable>
  );

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 60 }}>
      <View style={[styles.head, { borderBottomColor: theme.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
          <Avatar url={p.avatar_url} name={p.name} size={84} ring="rgba(132,204,22,0.4)" />
          <View style={{ flex: 1, flexDirection: 'row' }}>
            {stat(stats?.workouts, 'Workouts')}
            {stat(stats?.followers, 'Followers', demo ? undefined : () => openList('followers'))}
            {stat(stats?.following, 'Following', demo ? undefined : () => openList('following'))}
          </View>
        </View>
        <ThemedText style={{ fontSize: 18, fontWeight: '800', marginTop: 12 }}>{p.name}</ThemedText>
        <ThemedText type="small">
          {p.tp ? <><ThemedText type="smallBold">{p.tp}</ThemedText><ThemedText type="small" themeColor="textSecondary"> · </ThemedText></> : null}
          <ThemedText type="small" themeColor="textSecondary">{p.course || p.faculty}</ThemedText>
        </ThemedText>
        {p.bio ? <ThemedText type="small" style={{ marginTop: 8 }}>{p.bio}</ThemedText>
          : own ? <ThemedText type="smallBold" style={{ color: Lime, marginTop: 8 }} onPress={() => setEditing(true)}>Add a bio</ThemedText> : null}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
          {own ? <Button variant="ghost" style={styles.half} onPress={() => setEditing(true)}>Edit profile</Button>
            : demo ? <View style={[styles.half, styles.note, { backgroundColor: theme.backgroundElement }]}><ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>Demo student · can&apos;t be followed</ThemedText></View>
            : <View style={[styles.half, styles.note, { backgroundColor: theme.backgroundElement }]}><FollowButton id={p.id} name={p.name} /></View>}
          <Press onPress={() => Share.share({ message: `${p.name} on Spotter` })} style={[styles.half, styles.share, { backgroundColor: theme.backgroundElement }]}>
            <Share2 size={15} color={theme.text} /><ThemedText type="smallBold">Share profile</ThemedText>
          </Press>
        </View>
        <Press onPress={() => router.push({ pathname: '/stats/[id]', params: { id: p.id } })} style={[styles.statsLink, { backgroundColor: theme.backgroundElement }]}>
          <Icon name="stats" size={26} /><ThemedText type="smallBold" style={{ flex: 1 }}>{own ? 'Your gym stats' : 'Gym stats'}</ThemedText><ThemedText themeColor="textSecondary">›</ThemedText>
        </Press>
      </View>

      <ThemedText type="smallBold" style={{ fontSize: 16, paddingTop: 16 }}>Workouts</ThemedText>
      {posts === null && <View style={{ gap: 10, marginTop: 12 }}><Bone w="70%" h={18} /><Bone w="100%" h={120} /></View>}
      {posts?.length === 0 && (
        <EmptyState art="workouts" title={own ? 'No workouts posted yet' : 'Nothing to show yet'} text={own ? 'Finish a workout and it shows up here.' : 'Their workouts appear here once they post (or follow each other to see friends-only ones).'}>
          {own && <Button style={{ marginTop: 16, paddingVertical: 10 }} onPress={() => router.navigate('/train')}>Start a workout</Button>}
        </EmptyState>
      )}
      {posts?.map((post, i) => <PostCard key={post.id} post={post} showFollow={false} last={i === posts.length - 1} />)}

      <Modal visible={!!list} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setList(null)}>
        <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: theme.background }}>
          <View style={styles.sheetHead}>
            <ThemedText style={{ fontSize: 22, fontWeight: '800' }}>{list?.kind === 'followers' ? 'Followers' : 'Following'}</ThemedText>
            <Press onPress={() => setList(null)} style={[styles.close, { backgroundColor: theme.backgroundElement }]}><ThemedText type="smallBold">Done</ThemedText></Press>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16 }}>
            {list?.people === null && <View style={{ gap: 12 }}>{[0, 1, 2].map((i) => <Bone key={i} w="100%" h={44} />)}</View>}
            {list?.people?.length === 0 && <EmptyState art="followers" size={96} title={list.kind === 'followers' ? 'No followers yet' : 'Not following anyone yet'} text={list.kind === 'followers' ? 'Post workouts and people will find you.' : 'Follow students from the feed to see their workouts.'} />}
            {list?.people?.map((u) => (
              <View key={u.id} style={[styles.person, { borderBottomColor: theme.border }]}>
                <Pressable style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }} onPress={() => { setList(null); router.push(u.id === me.id ? '/me' : { pathname: '/u/[id]', params: { id: u.id } }); }}>
                  <Avatar url={u.avatar_url} name={u.name} size={40} />
                  <View><ThemedText type="smallBold">{u.name}</ThemedText><ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>{u.faculty}</ThemedText></View>
                </Pressable>
                <FollowButton id={u.id} name={u.name} />
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
      {own && <ProfileSheet open={editing} onClose={() => setEditing(false)} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  head: { marginHorizontal: -16, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20, borderBottomWidth: StyleSheet.hairlineWidth },
  half: { flex: 1, paddingVertical: 10 },
  note: { borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  share: { borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  statsLink: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginTop: 8 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  close: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
});
