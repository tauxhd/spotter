import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Lime } from '@/constants/theme';
import { webUrl } from '@/lib/web';

// Round profile picture, or the first letter on lime when there isn't one.
export default function Avatar({ url, name, size = 40, ring }: { url?: string | null; name?: string; size?: number; ring?: string }) {
  const src = webUrl(url);
  const frame = { width: size, height: size, borderRadius: size / 2, ...(ring ? { borderWidth: 3, borderColor: ring } : {}) };
  return src ? <Image source={{ uri: src }} style={frame} /> : (
    <View style={[frame, styles.initial]}>
      <ThemedText style={{ color: '#09090b', fontWeight: '800', fontSize: size * 0.4 }}>{name?.[0]?.toUpperCase() ?? '?'}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({ initial: { backgroundColor: Lime, alignItems: 'center', justifyContent: 'center' } });
