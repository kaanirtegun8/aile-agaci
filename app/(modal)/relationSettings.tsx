import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView } from 'react-native';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { RelationType, relationLabels, RelationSettings } from '../types/relations';

export default function RelationSettingsModal() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<RelationSettings>({
    visibleTypes: []
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    if (user?.uid) {
      const settingsRef = doc(db, 'userSettings', user.uid);
      const settingsSnap = await getDoc(settingsRef);
      
      if (settingsSnap.exists()) {
        setSettings(settingsSnap.data() as RelationSettings);
      }
    }
  };

  const toggleType = async (type: RelationType) => {
    if (!user?.uid) return;

    const newVisibleTypes = settings.visibleTypes.includes(type)
      ? settings.visibleTypes.filter(t => t !== type)
      : [...settings.visibleTypes, type];

    const settingsRef = doc(db, 'userSettings', user.uid);
    await setDoc(settingsRef, {
      visibleTypes: newVisibleTypes
    });

    setSettings({ visibleTypes: newVisibleTypes });
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Görünür Bağlantı Tipleri</Text>
      
      {Object.values(RelationType).map((type) => (
        <View key={type} style={styles.row}>
          <Text style={styles.label}>{relationLabels[type]}</Text>
          <Switch
            value={settings.visibleTypes.includes(type)}
            onValueChange={() => toggleType(type)}
          />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  label: {
    fontSize: 16,
    color: '#333',
  },
}); 