import { View, StyleSheet } from 'react-native';
import FamilyTree from '../components/FamilyTree';
import { colors, globalStyles } from '../constants/styles';

export default function IndexScreen() {
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
    headerSubtitle: {
      fontSize: 16,
      color: colors.textLight,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    relationCard: {
      ...globalStyles.card,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      marginBottom: 12,
    },
    avatar: {
      width: 60,
      height: 60,
      borderRadius: 30,
      marginRight: 16,
      borderWidth: 2,
      borderColor: colors.primary,
    },
    relationInfo: {
      flex: 1,
    },
    name: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    relationType: {
      fontSize: 14,
      color: colors.textLight,
    },
    addButton: {
      position: 'absolute',
      right: 20,
      bottom: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    emptyStateIcon: {
      marginBottom: 16,
      opacity: 0.5,
    },
    emptyStateText: {
      fontSize: 18,
      color: colors.textLight,
      textAlign: 'center',
      marginBottom: 24,
    },
    searchContainer: {
      padding: 16,
      backgroundColor: colors.surface,
    },
    searchInput: {
      ...globalStyles.input,
      backgroundColor: colors.background,
      paddingLeft: 40,
    },
    searchIcon: {
      position: 'absolute',
      left: 28,
      top: 28,
      color: colors.textLight,
    },
  });

  return (
    <View style={styles.container}>
      <FamilyTree />
    </View>
  );
}
