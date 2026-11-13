// Feed header (the website's FeedActions): search people, and notifications with a badge for unseen ones.
import { router } from 'expo-router';
import { Bell, Search } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { isNew, loadNotes, SEEN_KEY, type Seen } from '@shared/notify';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { sb, useStore } from '@/lib/store';

export default function FeedActions() {
  const { me, s } = useStore();
  const theme = useTheme();
  const [unseen, setUnseen] = useState(0);
  useEffect(() => {
    let seen: Seen | null = null;
    try { seen = JSON.parse(localStorage.getItem(SEEN_KEY) ?? 'null'); } catch {}
    loadNotes(sb, me.id).then((n) => setUnseen(n.filter((x) => isNew(x, seen)).length)).catch(() => {});
  }, [me.id, s.rev]);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 }}>
      <Pressable onPress={() => router.push('/search')} hitSlop={6} accessibilityLabel="Search people" style={styles.btn}><Search size={22} color={theme.text} /></Pressable>
      <Pressable onPress={() => router.push('/notifications')} hitSlop={6} accessibilityLabel={unseen ? `Notifications, ${unseen} new` : 'Notifications'} style={styles.btn}>
        <Bell size={22} color={theme.text} />
        {unseen > 0 && <View style={styles.badge}><ThemedText style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{unseen > 99 ? '99+' : unseen}</ThemedText></View>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 4, right: 3, minWidth: 16, height: 16, paddingHorizontal: 3, borderRadius: 8, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
});
