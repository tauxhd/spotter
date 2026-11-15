// Settings (from the gear on your profile; the website's /settings): your account, quick links, and log out.
import Constants from 'expo-constants';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronRight, Lock, LogOut } from 'lucide-react-native';
import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import Avatar from '@/components/avatar';
import HevyImport from '@/components/hevy-import';
import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/kit';
import { Lime, Red } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useStore } from '@/lib/store';
import { WEB } from '@/lib/web';

const WARN = 'Sign back in any time with your TP number and password.';

export default function Settings() {
  const { hevy } = useLocalSearchParams<{ hevy?: string }>(); // a Hevy CSV shared to Spotter (ShareHandler)
  const { me, signOut, updateProfile } = useStore();
  const theme = useTheme();
  const [busy, setBusy] = useState(false);

  const out = async () => { setBusy(true); await signOut(); };
  function logOut() {
    if (Platform.OS === 'web') { if (confirm(`Log out of Spotter on this device?\n\n${WARN}`)) out(); return; }
    Alert.alert('Log out of Spotter?', WARN, [{ text: 'Cancel', style: 'cancel' }, { text: 'Log out', style: 'destructive', onPress: out }]);
  }

  const rows = [
    ['edit', 'Edit profile', () => router.push({ pathname: '/me', params: { edit: '1' } })],
    ['target', 'Nutrition plan', () => router.push('/plan')],
    ['stats', 'Gym stats', () => router.push({ pathname: '/stats/[id]', params: { id: me.id } })],
  ] as const;
  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
      <View style={[styles.card, { borderBottomColor: theme.border }]}>
        <Avatar id={me.id} url={me.avatar_url} name={me.name} size={56} ring="rgba(132,204,22,0.4)" />
        <View style={{ flex: 1 }}>
          <ThemedText numberOfLines={1} style={{ fontSize: 18, fontWeight: '700' }}>{me.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>{me.tp ? `${me.tp} · ` : ''}{me.course || me.faculty}</ThemedText>
        </View>
      </View>
      <View style={[styles.list, { borderBottomColor: theme.border }]}>
        {rows.map(([ic, label, go]) => (
          <Pressable key={label} onPress={go} style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.backgroundElement }]}>
            <Icon name={ic} size={26} /><ThemedText style={{ flex: 1, fontWeight: '500' }}>{label}</ThemedText><ChevronRight size={18} color={theme.textSecondary} />
          </Pressable>
        ))}
      </View>
      {/* Private account: posts set to Everyone only reach friends (mutual follows); enforced in the database (can_see_post) */}
      <View style={[styles.row, styles.list, { borderBottomColor: theme.border }]}>
        <View style={{ width: 26, alignItems: 'center' }}><Lock size={20} color={Lime} /></View>
        <View style={{ flex: 1 }}>
          <ThemedText style={{ fontWeight: '500' }}>Private account</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>Only friends (people you follow who follow you back) see your workouts.</ThemedText>
        </View>
        <Switch value={!!me.private} onValueChange={(v) => updateProfile({ private: v }).catch(() => Alert.alert("Couldn't save that", 'Check your connection and try again.'))}
          trackColor={{ true: Lime, false: theme.backgroundSelected }} thumbColor="#fff" accessibilityLabel="Private account" />
      </View>
      <View style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}><HevyImport shared={hevy} /></View>
      <Pressable onPress={logOut} disabled={busy} accessibilityRole="button"
        style={({ pressed }) => [styles.logout, { opacity: busy ? 0.5 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
        <LogOut size={18} color={Red} /><ThemedText style={{ color: Red, fontWeight: '600' }}>{busy ? 'Logging out…' : 'Log out'}</ThemedText>
      </Pressable>
      <VersionInfo />
    </ScrollView>
  );
}

// Which Spotter this phone runs, for bug reports and to spot an old install: the APK's build number (native code: the
// 3D views, the icon) and the date of the over-the-air update on top of it (everything else). Compared with the newest
// APK the website lists (public/app-version.json); if this one is older it says so, with a link to download.
function VersionInfo() {
  const build = Constants.platform?.android?.versionCode;
  const [latest, setLatest] = useState<{ version: string; versionCode: number; url: string } | null>(null);
  useEffect(() => { if (WEB && build) fetch(`${WEB}/app-version.json`, { cache: 'no-store' }).then((r) => r.json()).then(setLatest).catch(() => {}); }, [build]);
  const at = Updates.createdAt;
  const behind = !!(latest && build && latest.versionCode > build);
  return (
    <View style={{ alignItems: 'center', marginTop: 16, gap: 2 }}>
      <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>
        Spotter {Constants.expoConfig?.version}{build ? ` · build ${build}` : ''}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>
        {Updates.isEmbeddedLaunch || !at ? 'Running the version built into the app' : `Updated ${at.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}, ${at.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`}
      </ThemedText>
      {latest && build ? (behind
        ? <Pressable onPress={() => Linking.openURL(latest.url)} accessibilityRole="link"><ThemedText type="small" style={{ fontSize: 12, color: Lime, fontWeight: '700' }}>Spotter {latest.version} is out: tap to download</ThemedText></Pressable>
        : <ThemedText type="small" style={{ fontSize: 12, color: Lime }}>Up to date</ThemedText>) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 16, marginHorizontal: -16, paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  list: { marginHorizontal: -16, borderBottomWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  logout: { marginTop: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 5, paddingVertical: 13, backgroundColor: 'rgba(239,68,68,0.1)' },
});
