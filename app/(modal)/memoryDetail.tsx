import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { doc, deleteDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useState, useEffect } from 'react';
import { Memory } from '../types/memories';

export default function MemoryDetail() {
  const params = useLocalSearchParams();
  const [memory, setMemory] = useState<Memory | null>(null);
  
  useEffect(() => {
    if (params.memory) {
      setMemory(JSON.parse(params.memory as string));
    }
  }, [params.memory]);

  if (!memory) {
    return <Text>Yükleniyor...</Text>;
  }

  const handleDelete = () => {
    Alert.alert(
      'Anıyı Sil',
      'Bu anıyı silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              const relationRef = doc(db, 'relations', memory.relationId);
              const relationDoc = await getDoc(relationRef);
              
              if (relationDoc.exists()) {
                const relationData = relationDoc.data();
                const updatedMemories = relationData.memories.filter(
                  (m: Memory) => m.id !== memory.id
                );
                
                await updateDoc(relationRef, {
                  memories: updatedMemories
                });

                const updatedDoc = await getDoc(relationRef);
                
                router.replace({
                  pathname: '/relationDetail',
                  params: { relation: JSON.stringify(updatedDoc.data()) }
                });
              }
            } catch (error) {
              console.error('Anı silme hatası:', error);
              Alert.alert('Hata', 'Anı silinirken bir hata oluştu');
            }
          },
        },
      ]
    );
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Tarih formatı hatası:', error);
      return '';
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: memory.title }} />
      
      <ScrollView style={styles.scrollContainer}>
        <Text style={styles.title}>{memory.title}</Text>
        <Text style={styles.content}>{memory.content}</Text>
        
        <View style={styles.dateContainer}>
          <Text style={styles.date}>
            Tarih: {formatDate(memory.memoryDate)}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={styles.deleteButton} 
          onPress={handleDelete}
        >
          <Text style={styles.deleteButtonText}>Anıyı Sil</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  content: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 16,
  },
  date: {
    fontSize: 16,
    color: '#666',
  },
  bottomContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dateContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
}); 