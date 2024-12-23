import { Link } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { type ComponentProps } from 'react';
import { Platform, Linking } from 'react-native';
import { TouchableOpacity, Text } from 'react-native';

type Props = {
  href: string;
  children: React.ReactNode;
};

export function ExternalLink({ href, children }: Props) {
  const handlePress = async () => {
    if (Platform.OS !== 'web') {
      await openBrowserAsync(href);
    } else {
      Linking.openURL(href);
    }
  };

  return (
    <TouchableOpacity onPress={handlePress}>
      <Text style={{ color: '#2e78b7' }}>{children}</Text>
    </TouchableOpacity>
  );
}
