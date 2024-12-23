import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Platform, SafeAreaView } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { doc, deleteDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useState, useEffect } from 'react';
import { Memory } from '../types/memories';
import MapView, { Marker } from 'react-native-maps';

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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Stack.Screen options={{ title: memory.title }} />
        
        <ScrollView style={styles.scrollContainer}>
          <Text style={styles.title}>{memory.title}</Text>
          <Text style={styles.content}>{memory.content}</Text>
          
          {memory.location && (
            <View style={styles.mapContainer}>
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: memory.location.latitude,
                  longitude: memory.location.longitude,
                  latitudeDelta: Platform.select({ ios: 0.002, android: 0.005 }) || 0.002,
                  longitudeDelta: Platform.select({ ios: 0.002, android: 0.005 }) || 0.002,
                }}
                scrollEnabled={false}
                zoomEnabled={false}
                pitchEnabled={false}
                rotateEnabled={false}
                moveOnMarkerPress={false}
                minZoomLevel={Platform.select({ ios: 15, android: 17 }) || 15}
                maxZoomLevel={Platform.select({ ios: 20, android: 20 }) || 20}
                mapType={Platform.select({ ios: 'standard', android: 'standard' })}
                camera={Platform.OS === 'android' ? {
                  center: {
                    latitude: memory.location.latitude,
                    longitude: memory.location.longitude,
                  },
                  pitch: 0,
                  heading: 0,
                  altitude: 1000,
                  zoom: 17,
                } : undefined}
              >
                <Marker
                  coordinate={{
                    latitude: memory.location.latitude,
                    longitude: memory.location.longitude,
                  }}
                  title={memory.location.name}
                />
              </MapView>
              <Text style={styles.locationName}>{memory.location.name}</Text>
            </View>
          )}

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
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
    paddingBottom: Platform.OS === 'ios' ? 0 : 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
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
  mapContainer: {
    marginTop: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    overflow: 'hidden',
  },
  map: {
    height: 200,
    width: '100%',
  },
  locationName: {
    padding: 12,
    fontSize: 16,
    color: '#666',
  },
}); 