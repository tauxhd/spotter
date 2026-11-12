import { StyleSheet, TextInput, type TextInputProps, type TextStyle } from 'react-native';

import { geist } from '@/components/themed-text';

// TextInput in the website's font (Geist), weight taken from the style like ThemedText.
export function Input({ style, ...rest }: TextInputProps) {
  const flat: TextStyle = StyleSheet.flatten(style) ?? {};
  return <TextInput style={[flat, geist(flat.fontWeight)]} {...rest} />;
}
