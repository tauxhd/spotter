// Stats: a month calendar with the days you trained filled in (the website's TrainCalendar). Arrows step through months.
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { trainedDays, type PostLike } from '@shared/progress';
import { ThemedText } from '@/components/themed-text';
import { Section } from '@/components/ui/kit';
import { Lime } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function TrainCalendar({ posts }: { posts: PostLike[] }) {
  const theme = useTheme();
  const [now] = useState(() => new Date());
  const [at, setAt] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const days = trainedDays(posts, at.y, at.m);
  const lead = (new Date(at.y, at.m, 1).getDay() + 6) % 7, len = new Date(at.y, at.m + 1, 0).getDate();
  const step = (d: number) => setAt(({ y, m }) => ({ y: m + d < 0 ? y - 1 : m + d > 11 ? y + 1 : y, m: (m + d + 12) % 12 }));
  const isNow = at.y === now.getFullYear() && at.m === now.getMonth();
  const cells = [...Array.from({ length: lead }, () => 0), ...Array.from({ length: len }, (_, i) => i + 1)];

  return (
    <Section>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <ThemedText type="smallBold" style={{ fontSize: 16, flex: 1 }}>{MONTH[at.m]} {at.y}<ThemedText type="small" themeColor="textSecondary"> · {days.size} day{days.size === 1 ? '' : 's'} trained</ThemedText></ThemedText>
        <Pressable onPress={() => step(-1)} hitSlop={8} accessibilityLabel="Previous month" style={styles.nav}><ChevronLeft size={20} color={theme.text} /></Pressable>
        <Pressable onPress={() => step(1)} disabled={isNow} hitSlop={8} accessibilityLabel="Next month" style={[styles.nav, isNow && { opacity: 0.3 }]}><ChevronRight size={20} color={theme.text} /></Pressable>
      </View>
      <View style={styles.grid}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <ThemedText key={`h${i}`} type="smallBold" themeColor="textSecondary" style={styles.head}>{d}</ThemedText>)}
        {cells.map((d, i) => {
          const n = d ? days.get(d) ?? 0 : 0, today = isNow && d === now.getDate();
          return (
            <View key={i} style={styles.cellWrap}>
              {d > 0 && (
                <View style={[styles.cell, n > 0 && { backgroundColor: Lime }, today && { borderWidth: 2, borderColor: Lime }]}>
                  <ThemedText style={{ fontSize: 12, fontWeight: n ? '700' : '400', color: n ? '#09090b' : theme.textSecondary }}>{d}</ThemedText>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </Section>
  );
}

const styles = StyleSheet.create({
  nav: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  head: { width: `${100 / 7}%`, textAlign: 'center', fontSize: 11, paddingVertical: 4 },
  cellWrap: { width: `${100 / 7}%`, aspectRatio: 1, padding: 3 },
  cell: { flex: 1, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
});
