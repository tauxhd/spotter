// Feed: everyone's workouts, the same posts as the website. Pull to refresh; tap the heart to like.
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

import { timeAgo } from '@shared/data';
import { ThemedText } from '@/components/themed-text';
import { Press } from '@/components/ui/button';
import { BottomTabInset, Lime, Red } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useStore } from '@/lib/store';

export default function Feed() {
  const { s, like, refresh } = useStore();
  const theme = useTheme();
  const [busy, setBusy] = useState(false);
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.background }}>
      <FlatList
        data={s.posts}
        keyExtractor={(p) => p.id}
        contentContainerStyle={[styles.page, { paddingBottom: BottomTabInset + 40 }]}
        refreshControl={<RefreshControl refreshing={busy} tintColor={Lime} onRefresh={async () => { setBusy(true); await refresh(); setBusy(false); }} />}
        ListHeaderComponent={<ThemedText style={styles.h1}>Feed</ThemedText>}
        ListEmptyComponent={<ThemedText themeColor="textSecondary" style={{ textAlign: 'center', marginTop: 40 }}>No workouts yet.</ThemedText>}
        renderItem={({ item: p, index }) => (
          <Animated.View entering={FadeInDown.delay(Math.min(index, 6) * 40).springify().dampingRatio(1).duration(350)}
            style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.who}>
              {p.avatar ? <Image source={{ uri: p.avatar }} style={styles.avatar} />
                : <View style={[styles.avatar, styles.initial, { backgroundColor: Lime }]}><ThemedText type="smallBold" style={{ color: '#09090b' }}>{p.by?.[0] ?? '?'}</ThemedText></View>}
              <View style={{ flex: 1 }}>
                <ThemedText type="smallBold">{p.by}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">{p.faculty} · {timeAgo(p.at)}</ThemedText>
              </View>
            </View>
            <ThemedText style={styles.title}>{p.title}</ThemedText>
            <View style={styles.stats}>
              <Stat k="Time" v={p.duration ? `${p.duration}min` : '–'} />
              <Stat k="Volume" v={`${Math.round(p.volume).toLocaleString()} kg`} />
              <Stat k="Records" v={String(p.prs?.length ?? 0)} />
            </View>
            {p.exercises.slice(0, 4).map((e) => (
              <ThemedText key={e.name} type="small" themeColor="textSecondary">{e.sets} × {e.name}  <ThemedText type="small">{e.best}</ThemedText></ThemedText>
            ))}
            <Press onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); like(p.id); }} haptic={false} scaleTo={0.85}
              style={styles.like} accessibilityLabel={p.liked ? 'Unlike' : 'Like'}>
              <ThemedText style={{ color: p.liked ? Red : theme.textSecondary, fontSize: 18 }}>{p.liked ? '♥' : '♡'}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">{p.likes}</ThemedText>
            </Press>
          </Animated.View>
        )}
      />
    </SafeAreaView>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <View style={{ flex: 1 }}>
      <ThemedText type="small" themeColor="textSecondary">{k}</ThemedText>
      <ThemedText type="smallBold" style={{ fontSize: 16 }}>{v}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 12 },
  h1: { fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.6, marginBottom: 4 },
  card: { borderRadius: 18, padding: 14, gap: 6 },
  who: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  initial: { alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800', marginTop: 4 },
  stats: { flexDirection: 'row', marginVertical: 4 },
  like: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4, marginTop: 2 },
});
