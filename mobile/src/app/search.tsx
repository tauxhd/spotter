// Find someone by name or TP number (the website's /search), open their profile or follow them.
import { router, Stack } from 'expo-router';
import { Search as SearchIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';

import Avatar from '@/components/avatar';
import { FollowButton } from '@/components/post-card';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/kit';
import { useTheme } from '@/hooks/use-theme';
import { sb, useStore } from '@/lib/store';

type Person = { id: string; name: string; faculty: string | null; tp: string | null; avatar_url: string | null };

export default function Search() {
  const { me } = useStore();
  const theme = useTheme();
  const [q, setQ] = useState('');
  const [found, setFound] = useState<Person[] | null>(null);

  useEffect(() => {
    const term = q.trim().replace(/[%,()]/g, '');
    if (term.length < 2) return;
    const t = setTimeout(() => {
      sb.from('profiles').select('id, name, faculty, tp, avatar_url').neq('id', me.id).or(`name.ilike.%${term}%,tp.ilike.%${term}%`).order('name').limit(30)
        .then(({ data }) => setFound(data ?? []));
    }, 250); // wait for typing to pause
    return () => clearTimeout(t);
  }, [q, me.id]);

  const shown = q.trim().replace(/[%,()]/g, '').length < 2 ? null : found;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen options={{ title: 'Search' }} />
      <View style={[styles.box, { backgroundColor: theme.backgroundElement }]}>
        <SearchIcon size={18} color={theme.textSecondary} />
        <TextInput autoFocus value={q} onChangeText={setQ} placeholder="Search by name or TP number" placeholderTextColor={theme.textSecondary}
          autoCorrect={false} accessibilityLabel="Search people" style={{ flex: 1, color: theme.text, paddingVertical: 10, fontSize: 16 }} />
      </View>
      {shown === null && <EmptyState art="search" title="Find someone" text="Type at least 2 letters of their name or TP number." />}
      {shown?.length === 0 && <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center', paddingVertical: 40 }}>No one matches “{q.trim()}”.</ThemedText>}
      <FlatList data={shown ?? []} keyExtractor={(p) => p.id} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16 }}
        renderItem={({ item: p }) => (
          <View style={styles.row}>
            <Pressable onPress={() => router.push({ pathname: '/u/[id]', params: { id: p.id } })} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Avatar id={p.id} url={p.avatar_url} name={p.name} size={44} />
              <View style={{ flex: 1 }}>
                <ThemedText type="smallBold" numberOfLines={1} style={{ fontSize: 16 }}>{p.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={{ fontSize: 12 }}>{[p.tp, p.faculty].filter(Boolean).join(' · ')}</ThemedText>
              </View>
            </Pressable>
            <FollowButton id={p.id} name={p.name} />
          </View>
        )} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 16, marginBottom: 8, paddingHorizontal: 12, borderRadius: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
});
