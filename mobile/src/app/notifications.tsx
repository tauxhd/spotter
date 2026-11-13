// Who followed you, liked or commented on your posts (the website's /notifications); new ones highlighted. Opening this
// screen marks them seen.
import { router, Stack } from 'expo-router';
import { Heart, MessageCircle, UserPlus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { timeAgo } from '@shared/data';
import { isNew, loadNotes, markSeen, SEEN_KEY, type Note, type Seen } from '@shared/notify';
import Avatar from '@/components/avatar';
import { StatsSkeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/kit';
import { Lime } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePullRefresh } from '@/hooks/use-pull-refresh';
import { sb, useStore } from '@/lib/store';

const TINT = { follow: '#0ea5e9', like: '#ef4444', comment: Lime };

export default function Notifications() {
  const { me, s } = useStore();
  const theme = useTheme();
  const pull = usePullRefresh();
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [seen, setSeen] = useState<Seen | null>(null);

  useEffect(() => {
    let before: Seen | null = null;
    try { before = JSON.parse(localStorage.getItem(SEEN_KEY) ?? 'null'); } catch {}
    loadNotes(sb, me.id).then((n) => {
      setSeen(before); setNotes(n);
      try { localStorage.setItem(SEEN_KEY, JSON.stringify(markSeen(n))); } catch {}
    }).catch(() => setNotes([]));
  }, [me.id, s.rev]);

  const Icon = ({ k }: { k: Note['kind'] }) => k === 'follow' ? <UserPlus size={12} color="#fff" /> : k === 'like' ? <Heart size={12} color="#fff" fill="#fff" /> : <MessageCircle size={12} color="#09090b" />;
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen options={{ title: 'Notifications' }} />
      {notes === null ? <View style={{ padding: 16 }}><StatsSkeleton /></View> : (
        <FlatList data={notes} keyExtractor={(n) => n.key} refreshControl={pull}
          ListEmptyComponent={<EmptyState art="followers" title="Nothing yet" text="When people follow you, like or comment on your workouts, it shows up here." />}
          renderItem={({ item: n }) => (
            <Pressable onPress={() => (n.post ? router.push({ pathname: '/post/[id]', params: { id: n.post.id } }) : router.push({ pathname: '/u/[id]', params: { id: n.who.id } }))}
              style={({ pressed }) => [styles.row, isNew(n, seen) && { backgroundColor: 'rgba(132,204,22,0.1)' }, pressed && { opacity: 0.6 }]}>
              <View>
                <Avatar id={n.who.id} url={n.who.avatar} name={n.who.name} size={44} />
                <View style={[styles.kind, { backgroundColor: TINT[n.kind], borderColor: theme.background }]}><Icon k={n.kind} /></View>
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="small">
                  <ThemedText type="smallBold">{n.who.name}</ThemedText>
                  {n.kind === 'follow' ? ' started following you' : n.kind === 'like' ? <> liked <ThemedText type="smallBold">{n.post?.title}</ThemedText></> : <> commented on <ThemedText type="smallBold">{n.post?.title}</ThemedText>: “{n.text}”</>}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>{n.kind === 'like' ? 'on your post' : timeAgo(n.at)}</ThemedText>
              </View>
            </Pressable>
          )} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  kind: { position: 'absolute', right: -4, bottom: -4, width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
