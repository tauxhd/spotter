import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'small' | 'smallBold' | 'link';
  themeColor?: ThemeColor;
};

// Geist, like the website. Each weight is its own font file, so the weight picks the family.
const family: Record<string, string> = { 400: 'Geist_400Regular', 500: 'Geist_500Medium', 600: 'Geist_600SemiBold', 700: 'Geist_700Bold', 800: 'Geist_700Bold', 900: 'Geist_700Bold' };
export const geist = (weight: string | number = 400) => ({ fontFamily: family[String(weight === 'bold' ? 700 : weight === 'normal' ? 400 : weight)] ?? family[400], fontWeight: 'normal' as const });

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const flat: TextStyle = StyleSheet.flatten([styles[type], style]) ?? {};
  return <Text style={[{ color: theme[themeColor ?? 'text'] }, flat, geist(flat.fontWeight)]} {...rest} />;
}

// The website's text: body 16 regular (leading 1.45), text-sm 14, semibold 600 for labels.
const styles = StyleSheet.create({
  default: { fontSize: 16, lineHeight: 23 },
  small: { fontSize: 14, lineHeight: 20 },
  smallBold: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  link: { fontSize: 14, lineHeight: 20, color: '#84cc16' },
});
