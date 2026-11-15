// Feed header (the website's FeedActions): search people, and notifications with a badge for unseen ones.
import { router, useFocusEffect } from 'expo-router';
import { Bell, Search } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { isNew, loadNotes, onSeen, readSeen, type Note } from '@shared/notify';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { sb, useStore } from '@/lib/store';

export default function FeedActions() {
  const { me, s } = useStore();
  const theme = useTheme();
  const [notes, setNotes] = useState<Note[]>([]);
  const [seen, setSeen] = useState(readSeen);
  useEffect(() => onSeen(() => setSeen(readSeen())), []); // opening Notifications clears the badge at once
  // re-fetched whenever the feed comes back into view, and live while it's open: someone likes, comments or follows and
  // the badge updates without a reload (batched, ~1 s)
  useFocusEffect(useCallback(() => {
    let t: ReturnType<typeof setTimeout> | undefined, live = true;
    const load = () => loadNotes(sb, me.id).then((n) => live && setNotes(n)).catch(() => {});
    load();
    const again = () => { clearTimeout(t); t = setTimeout(load, 1000); };
    const ch = sb.channel(`notes-${me.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'likes' }, again)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, again)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'follows', filter: `followee=eq.${me.id}` }, again)
      .subscribe();
    return () => { live = false; clearTimeout(t); sb.removeChannel(ch); };
  }, [me.id, s.rev]));
  const unseen = notes.filter((x) => isNew(x, seen)).length;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 }}>
      <Pressable onPress={() => router.push('/search')} hitSlop={6} accessibilityLabel="Search people" style={styles.btn}><Search size={22} color={theme.text} /></Pressable>
      <Pressable onPress={() => router.push('/notifications')} hitSlop={6} accessibilityLabel={unseen ? `Notifications, ${unseen} new` : 'Notifications'} style={styles.btn}>
        <Bell size={22} color={theme.text} />
        {unseen > 0 && <View style={[styles.badge, { borderColor: theme.background }]}><ThemedText style={styles.count}>{unseen > 99 ? '99+' : unseen}</ThemedText></View>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 2, right: 1, minWidth: 20, height: 20, paddingHorizontal: 4, borderRadius: 10, borderWidth: 2, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
  // own line height (ThemedText's default is far taller than the dot) so the number sits in the middle of it
  count: { color: '#fff', fontSize: 10, lineHeight: 16, height: 16, fontWeight: '700', textAlign: 'center', includeFontPadding: false, textAlignVertical: 'center', fontVariant: ['tabular-nums'] },
});
