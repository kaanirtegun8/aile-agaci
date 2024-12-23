import React from 'react';
import { View, StyleSheet } from 'react-native';
import FamilyTree  from '../components/FamilyTree';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <FamilyTree />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
