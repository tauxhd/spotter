// Best lifts on the stats page (the website's BestLifts.tsx): swipe (or tap the dots) between the heaviest weights actually
// lifted and the estimated one-rep maxes, each with its total and DOTS.
import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { dots } from '@shared/lifting';
import type { Sex } from '@shared/data';
import { ThemedText } from '@/components/themed-text';
import { InfoTip } from '@/components/ui/info-tip';
import { Icon } from '@/components/ui/kit';
import { Lime } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Lifts = { squat: number; bench: number; deadlift: number };
export type LiftPage = { title: string; info: string; lifts: Lifts };

export function BestLifts({ pages, bw, sex }: { pages: LiftPage[]; bw: number; sex: Sex }) {
  const theme = useTheme();
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  const [w, setW] = useState(0);
  const [page, setPage] = useState(0);
  const go = (i: number) => { ref.current?.scrollTo({ x: i * w, animated: true }); setPage(i); };

  return (
    <View style={[styles.section, { borderBottomColor: theme.border }]} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <View style={styles.head}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <ThemedText type="smallBold" style={{ fontSize: 16 }}>{pages[page].title}</ThemedText>
          <InfoTip text={pages[page].info} />
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }} accessibilityRole="tablist">
          {pages.map((pg, i) => (
            <Pressable key={pg.title} onPress={() => go(i)} hitSlop={8} accessibilityRole="tab" accessibilityLabel={pg.title} accessibilityState={{ selected: page === i }}
              style={[styles.dot, page === i ? { width: 20, backgroundColor: Lime } : { backgroundColor: theme.backgroundSelected }]} />
          ))}
        </View>
      </View>
      <ScrollView ref={ref} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => w && setPage(Math.round(e.nativeEvent.contentOffset.x / w))}>
        {pages.map(({ title, lifts }) => {
          const total = lifts.squat + lifts.bench + lifts.deadlift;
          return (
            <View key={title} style={{ width: w, paddingHorizontal: 16 }} accessibilityLabel={title}>
              <View style={{ flexDirection: 'row' }}>
                {([['squat', 'Squat', lifts.squat], ['bench', 'Bench', lifts.bench], ['deadlift', 'Deadlift', lifts.deadlift], ['ranks', 'Total', total]] as const).map(([ic, k, v]) => (
                  <View key={k} style={{ flex: 1, alignItems: 'center' }}>
                    <Icon name={ic} size={44} />
                    <ThemedText style={{ fontSize: 18, fontWeight: '700', marginTop: 6, fontVariant: ['tabular-nums'] }}>{v ? Math.round(v * 10) / 10 : '–'}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>{k} kg</ThemedText>
                  </View>
                ))}
              </View>
              <View style={[styles.dotsRow, { borderTopColor: theme.border }]}>
                <Icon name="p4p" size={24} />
                <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>
                  <ThemedText type="smallBold" style={{ color: Lime, fontSize: 12 }}>{dots(total, bw, sex).toFixed(1)} DOTS</ThemedText> at {bw} kg bodyweight
                </ThemedText>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginHorizontal: -16, paddingVertical: 15, borderBottomWidth: StyleSheet.hairlineWidth },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
