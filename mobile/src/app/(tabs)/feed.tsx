// Feed: what APU is lifting, live. Suggested people to follow, then every post (the website's /feed).
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import Avatar from '@/components/avatar';
import PostCard, { FollowButton } from '@/components/post-card';
import { ThemedText } from '@/components/themed-text';
import { EmptyState, Title } from '@/components/ui/kit';
import WorkoutPill from '@/components/workout-pill';
import { BottomTabInset, Lime } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { sb, useStore } from '@/lib/store';

type Suggestion = { id: string; name: string; faculty: string; avatar_url: string | null };

export default function Feed() {
  const { s, me, refresh } = useStore();
  const theme = useTheme();
  const [busy, setBusy] = useState(false);
  const [people, setPeople] = useState<Suggestion[]>([]);
  useEffect(() => { sb.from('profiles').select('id, name, faculty, avatar_url').neq('id', me.id).limit(20).then(({ data }) => data && setPeople(data)); }, [me.id]);
  const suggested = people.filter((p) => !s.following.includes(p.id));

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.background }}>
      <FlatList
        data={s.posts}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: BottomTabInset + 90 }}
        refreshControl={<RefreshControl refreshing={busy} tintColor={Lime} onRefresh={async () => { setBusy(true); await refresh(); setBusy(false); }} />}
        ListHeaderComponent={
          <View style={{ gap: 16, marginBottom: 4 }}>
            <Title icon="feed" sub={<><View style={styles.live} />  What APU is lifting, live</>}>Feed</Title>
            {suggested.length > 0 && (
              <View>
                <ThemedText type="smallBold" themeColor="textSecondary" style={styles.kicker}>SUGGESTED FOR YOU</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
                  {suggested.map((u) => (
                    <View key={u.id} style={[styles.tile, { backgroundColor: theme.backgroundElement }]}>
                      <Pressable onPress={() => router.push({ pathname: '/u/[id]', params: { id: u.id } })} style={{ alignItems: 'center' }}>
                        <Avatar url={u.avatar_url} name={u.name} size={64} />
                        <ThemedText type="smallBold" numberOfLines={1} style={{ marginTop: 6 }}>{u.name}</ThemedText>
                      </Pressable>
                      <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12, marginBottom: 6 }}>{u.faculty}</ThemedText>
                      <FollowButton id={u.id} name={u.name} />
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={<EmptyState art="workouts" title="No workouts yet" text="Finish a workout in Train and it shows up here." />}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(Math.min(index, 6) * 40).springify().dampingRatio(1).duration(350)}>
            <PostCard post={item} />
          </Animated.View>
        )}
      />
      <WorkoutPill />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  live: { width: 8, height: 8, borderRadius: 4, backgroundColor: Lime },
  kicker: { fontSize: 12, letterSpacing: 1, marginBottom: 8 },
  tile: { width: 144, alignItems: 'center', borderRadius: 16, padding: 12, gap: 2 },
});
