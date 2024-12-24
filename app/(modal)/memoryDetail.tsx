import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Platform, SafeAreaView, Image, Dimensions, Modal } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { doc, deleteDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useState, useEffect } from 'react';
import { Memory, MemoryPhoto } from '../types/memories';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';

export default function MemoryDetail() {
  const params = useLocalSearchParams();
  const [memory, setMemory] = useState<Memory | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number>(-1);
  
  useEffect(() => {
    if (params.memory) {
      const parsedMemory = JSON.parse(params.memory as string);
      
      if (parsedMemory.photos) {
        parsedMemory.photos = parsedMemory.photos.map((photo: MemoryPhoto) => {
          const urlParts = photo.url.split('/');
          const lastTwoParts = urlParts.slice(-3).join('%2F');
          const otherParts = urlParts.slice(0, -3).join('/');
          
          return {
            ...photo,
            url: `${otherParts}/${lastTwoParts}`
          };
        });
      }
      setMemory(parsedMemory);
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

  const closePhotoViewer = () => setSelectedPhotoIndex(-1);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Stack.Screen 
          options={{ 
            title: memory.title,
            headerRight: () => (
              <TouchableOpacity 
                onPress={() => router.push({
                  pathname: '/editMemory',
                  params: { memory: JSON.stringify(memory) }
                })}
              >
                <Ionicons name="create-outline" size={24} color="#4A90E2" />
              </TouchableOpacity>
            )
          }} 
        />
        
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

          {memory.photos && memory.photos.length > 0 && (
            <View style={styles.photosContainer}>
              <Text style={styles.sectionTitle}>Fotoğraflar</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.photoList}
              >
                {memory.photos.map((photo, index) => (
                  <TouchableOpacity 
                    key={photo.id} 
                    style={styles.photoContainer}
                    onPress={() => setSelectedPhotoIndex(index)}
                  >
                    <Image
                      source={{ uri: photo.url, cache: 'force-cache' }}
                      style={styles.photo}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
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

      <Modal
        visible={selectedPhotoIndex !== -1}
        transparent={true}
        onRequestClose={closePhotoViewer}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={closePhotoViewer}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: selectedPhotoIndex * Dimensions.get('window').width, y: 0 }}
          >
            {memory?.photos?.map((photo) => (
              <View key={photo.id} style={styles.fullScreenPhotoContainer}>
                <Image
                  source={{ uri: photo.url }}
                  style={styles.fullScreenPhoto}
                  resizeMode="contain"
                />
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
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
  photosContainer: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#666',
  },
  photoList: {
    paddingHorizontal: 8,
  },
  photoContainer: {
    margin: 8,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  photo: {
    width: 200,
    height: 200,
    borderRadius: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
    padding: 10,
  },
  fullScreenPhotoContainer: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenPhoto: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height * 0.8,
  },
}); 