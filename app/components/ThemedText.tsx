import { Text, TextProps, TextStyle } from 'react-native';

interface ThemedTextProps extends TextProps {
  type?: 'title' | 'link';
}

const ThemedText = ({ type, style, ...props }: ThemedTextProps) => {
  const styles: Record<string, TextStyle> = {
    title: { fontSize: 20, fontWeight: '700' },
    link: { color: '#2e78b7' }
  };

  return <Text style={[type ? styles[type] : undefined, style]} {...props} />;
};

export default ThemedText; 