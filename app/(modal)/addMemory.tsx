import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Modal,
  SafeAreaView,
  FlatList,
  Image,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Memory, MemoryLocation, MemoryPhoto } from '../types/memories';
import DateTimePicker from '@react-native-community/datetimepicker';
import { formatDateToTurkish } from '../utils/date-utils';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import type { ImagePickerAsset } from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

export default function AddMemoryModal() {
  const params = useLocalSearchParams();
  const relationId = params.relationId as string;
  const { user } = useAuth();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [memoryDate, setMemoryDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<MemoryLocation | null>(null);
  const [region, setRegion] = useState({
    latitude: 41.0082,
    longitude: 28.9784,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [photos, setPhotos] = useState<MemoryPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTag, setNewTag] = useState('');

  const predefinedTags = [
    'Özel Gün', 
    'Tatil', 
    'Yemek', 
    'Gezi', 
    'Eğlence',
    'Aile',
    'Romantik'
  ];

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
      }
    })();
  }, []);

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (selectedDate) {
      setMemoryDate(selectedDate);
    }
  };

  const handleConfirmDate = () => {
    setShowDatePicker(false);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Hata', 'Lütfen başlık ve anı içeriğini doldurun');
      return;
    }

    try {
      const relationRef = doc(db, 'relations', relationId);
      const relationDoc = await getDoc(relationRef);
      
      if (relationDoc.exists()) {
        const memoryId = Date.now().toString();
        const newMemory: Memory = {
          id: memoryId,
          title: title.trim(),
          content: content.trim(),
          memoryDate: memoryDate.getTime(),
          relationId,
          tags: selectedTags.length > 0 ? selectedTags : undefined
        };

        // Fotoğraf varsa ekle
        if (photos.length > 0) {
          newMemory.photos = photos.map(photo => ({
            id: photo.id,
            url: photo.url,
            path: photo.path
          }));
        }

        if (selectedLocation) {
          newMemory.location = selectedLocation;
        }

        const currentMemories = relationDoc.data().memories || [];
        const updatedMemories = [...currentMemories, newMemory];
        
        await updateDoc(relationRef, {
          memories: updatedMemories
        });

        const updatedDoc = await getDoc(relationRef);
        
        router.replace({
          pathname: '/relationDetail',
          params: { 
            relation: JSON.stringify({
              ...updatedDoc.data(),
              id: relationId
            })
          }
        });
      }
    } catch (error) {
      console.error('Anı ekleme hatası:', error);
      Alert.alert('Hata', 'Anı eklenirken bir hata oluştu');
    }
  };

  const searchLocation = async (searchText: string) => {
    try {
      const fullSearchText = `${searchText}, Turkey`;
      const results = await Location.geocodeAsync(fullSearchText);
      
      if (results.length > 0) {
        const { latitude, longitude } = results[0];
        
        // Harita bölgesini güncelle
        const newRegion = {
          latitude,
          longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        };
        
        setRegion(newRegion);
        setSelectedLocation({
          latitude,
          longitude,
          name: searchText
        });

        // Bulunan konumun adresini al
        try {
          const reverseResults = await Location.reverseGeocodeAsync({
            latitude,
            longitude
          });
          if (reverseResults.length > 0) {
            const address = reverseResults[0];
            const locationName = [
              address.street,
              address.district,
              address.subregion,
              address.city
            ].filter(Boolean).join(', ');
            
            setSelectedLocation(prev => ({
              ...prev!,
              name: locationName
            }));
          }
        } catch (error) {
          console.error('Adres çözümleme hatası:', error);
        }
      } else {
        Alert.alert('Hata', 'Konum bulunamadı');
      }
    } catch (error) {
      Alert.alert('Hata', 'Konum araması başarısız oldu');
    }
  };

  const uploadPhoto = async (uri: string): Promise<string> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Unique bir dosya adı oluştur
      const fileName = `${Date.now()}.jpg`;
      // Düzgün bir path yapısı kur
      const storageRef = ref(storage, `memories/${fileName}`);
      
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      
      return downloadURL;
    } catch (error) {
      console.error("Fotoğraf yükleme hatası:", error);
      throw error;
    }
  };

  const uploadPhotos = async (photos: ImagePickerAsset[]): Promise<MemoryPhoto[]> => {
    const uploadPromises = photos.map(async (photo) => {
      const timestamp = Date.now().toString();
      const downloadURL = await uploadPhoto(photo.uri);
      return {
        id: timestamp,
        url: downloadURL,
        path: `memories/${timestamp}.jpg`
      };
    });

    return Promise.all(uploadPromises);
  };

  const pickImage = async () => {
    if (!user?.uid) {
      Alert.alert('Hata', 'Oturum açmanız gerekiyor');
      return;
    }

    if (photos.length >= 3) {
      Alert.alert('Uyarı', 'En fazla 3 fotoğraf ekleyebilirsiniz');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.5,
        aspect: [1, 1]
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setUploading(true);
        try {
          const imageUri = result.assets[0].uri;
          const timestamp = Date.now();
          
          const filePath = `memories/${relationId}/${timestamp}.jpg`;
          const storageRef = ref(storage, filePath);
          
          const response = await fetch(imageUri);
          const blob = await response.blob();
          
          await uploadBytes(storageRef, blob);
          const downloadUrl = await getDownloadURL(storageRef);
          
          const encodedUrl = downloadUrl.replace('memories/', 'memories%2F');
          
          setPhotos(prev => [...prev, {
            id: timestamp.toString(),
            url: encodedUrl,
            path: filePath
          }]);

        } catch (error) {
          console.error('Upload error:', error);
          Alert.alert('Hata', 'Fotoğraf yüklenemedi');
        } finally {
          setUploading(false);
        }
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Hata', 'Fotoğraf seçilemedi');
      setUploading(false);
    }
  };

  const removePhoto = (id: string) => {
    setPhotos(prev => prev.filter(photo => photo.id !== id));
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.content}>
          <TextInput
            style={styles.titleInput}
            placeholder="Anı Başlığı"
            value={title}
            onChangeText={setTitle}
          />

          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateButtonLabel}>Anı Tarihi</Text>
            <Text style={styles.dateText}>
              {formatDateToTurkish(memoryDate)}
            </Text>
          </TouchableOpacity>

          {Platform.OS === 'ios' ? (
            <Modal
              animationType="slide"
              transparent={true}
              visible={showDatePicker}
              onRequestClose={() => setShowDatePicker(false)}
            >
              <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                  <View style={styles.datePickerHeader}>
                    <TouchableOpacity 
                      style={styles.datePickerButton} 
                      onPress={handleConfirmDate}
                    >
                      <Text style={styles.datePickerButtonText}>Tamam</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={memoryDate}
                    mode="date"
                    display="spinner"
                    onChange={onDateChange}
                    maximumDate={new Date()}
                    locale="tr-TR"
                  />
                </View>
              </View>
            </Modal>
          ) : (
            showDatePicker && (
              <DateTimePicker
                value={memoryDate}
                mode="date"
                display="default"
                onChange={onDateChange}
                maximumDate={new Date()}
                locale="tr-TR"
              />
            )
          )}

          <TouchableOpacity 
            style={styles.locationButton}
            onPress={() => setShowLocationPicker(true)}
          >
            <Text style={styles.locationButtonLabel}>Konum Ekle</Text>
            {selectedLocation ? (
              <Text style={styles.locationText}>{selectedLocation.name}</Text>
            ) : (
              <Text style={styles.locationPlaceholder}>Konum seçilmedi</Text>
            )}
          </TouchableOpacity>

          <Modal
            visible={showLocationPicker}
            animationType="slide"
            onRequestClose={() => setShowLocationPicker(false)}
          >
            <SafeAreaView style={styles.locationPickerContainer}>
              <View style={styles.locationPickerHeader}>
                <Text style={styles.locationPickerTitle}>Konum Seç</Text>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setShowLocationPicker(false)}
                >
                  <Text style={styles.closeButtonText}>Kapat</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.searchContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Konum adı girin..."
                  value={selectedLocation?.name || ''}
                  onChangeText={(text) => {
                    setSelectedLocation(prev => prev ? { ...prev, name: text } : {
                      latitude: region.latitude,
                      longitude: region.longitude,
                      name: text
                    });
                  }}
                  onSubmitEditing={(event) => {
                    const searchText = event.nativeEvent.text;
                    if (searchText.trim()) {
                      searchLocation(searchText);
                    }
                  }}
                  returnKeyType="search"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <MapView
                style={styles.map}
                region={region}
                onRegionChangeComplete={setRegion}
                onPress={(e) => {
                  const { latitude, longitude } = e.nativeEvent.coordinate;
                  setSelectedLocation({
                    latitude,
                    longitude,
                    name: selectedLocation?.name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
                  });
                }}
              >
                {selectedLocation && (
                  <Marker
                    coordinate={{
                      latitude: selectedLocation.latitude,
                      longitude: selectedLocation.longitude,
                    }}
                    title={selectedLocation.name}
                  />
                )}
              </MapView>

              <View style={styles.locationPickerButtons}>
                <TouchableOpacity 
                  style={[styles.confirmButton, { marginBottom: Platform.OS === 'ios' ? 10 : 0 }]}
                  onPress={() => setShowLocationPicker(false)}
                >
                  <Text style={styles.confirmButtonText}>Konumu Seç</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </Modal>

          <TextInput
            style={styles.contentInput}
            placeholder="Anınızı yazın..."
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
          />

          <View style={styles.photosContainer}>
            <Text style={styles.sectionTitle}>Fotoğraflar (En fazla 3)</Text>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photoList}
            >
              {photos.map((item) => (
                <View key={item.id} style={styles.photoItem}>
                  <Image source={{ uri: item.url }} style={styles.photo} />
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => removePhoto(item.id)}
                  >
                    <Ionicons name="close-circle" size={24} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ))}
              {photos.length < 3 && (
                <TouchableOpacity 
                  style={styles.addPhotoButton} 
                  onPress={pickImage}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator color="#4A90E2" />
                  ) : (
                    <Ionicons name="camera" size={32} color="#4A90E2" />
                  )}
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>

          <View style={styles.tagsContainer}>
            <Text style={styles.sectionTitle}>Etiketler (İsteğe Bağlı)</Text>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tagsList}
            >
              {predefinedTags.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={[
                    styles.tagButton,
                    selectedTags.includes(tag) && styles.tagButtonSelected
                  ]}
                  onPress={() => {
                    setSelectedTags(prev => 
                      prev.includes(tag) 
                        ? prev.filter(t => t !== tag)
                        : [...prev, tag]
                    );
                  }}
                >
                  <Text style={[
                    styles.tagText,
                    selectedTags.includes(tag) && styles.tagTextSelected
                  ]}>
                    {tag}
                  </Text>
                </TouchableOpacity>
              ))}
              
              <TouchableOpacity
                style={styles.addTagButton}
                onPress={() => setShowTagInput(true)}
              >
                <Ionicons name="add" size={20} color="#4A90E2" />
              </TouchableOpacity>
            </ScrollView>

            <Modal
              visible={showTagInput}
              transparent
              animationType="slide"
            >
              <View style={styles.tagInputModal}>
                <View style={styles.tagInputContainer}>
                  <Text style={styles.tagInputTitle}>Yeni Etiket Ekle</Text>
                  <TextInput
                    style={styles.tagInput}
                    value={newTag}
                    onChangeText={setNewTag}
                    placeholder="Etiket adı..."
                    maxLength={20}
                  />
                  <View style={styles.tagInputButtons}>
                    <TouchableOpacity 
                      style={styles.tagInputButton}
                      onPress={() => {
                        if (newTag.trim()) {
                          setSelectedTags(prev => [...prev, newTag.trim()]);
                          setNewTag('');
                        }
                        setShowTagInput(false);
                      }}
                    >
                      <Text style={styles.tagInputButtonText}>Ekle</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.tagInputButton, styles.cancelButton]}
                      onPress={() => {
                        setNewTag('');
                        setShowTagInput(false);
                      }}
                    >
                      <Text style={styles.tagInputButtonText}>İptal</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          </View>
        </View>
      </ScrollView>
      
      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelButtonText}>İptal</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.saveButton}
          onPress={handleSave}
        >
          <Text style={styles.saveButtonText}>Kaydet</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  titleInput: {
    fontSize: 20,
    fontWeight: '600',
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginBottom: 16,
  },
  contentInput: {
    fontSize: 16,
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    minHeight: 200,
  },
  bottomContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#4A90E2',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 16,
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dateButton: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  dateButtonLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  datePickerButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 8,
    backgroundColor: '#f8f8f8',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    marginBottom: 16,
  },
  datePickerButton: {
    padding: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  datePickerButtonText: {
    color: '#4A90E2',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  locationButton: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  locationButtonLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  locationPlaceholder: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
  },
  locationPickerContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  locationPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  locationPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: '#4A90E2',
    fontSize: 16,
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInput: {
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 12,
  },
  map: {
    flex: 1,
  },
  locationPickerButtons: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  confirmButton: {
    backgroundColor: '#4A90E2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  photoItem: {
    margin: 8,
    position: 'relative',
    width: 120,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  addPhotoButton: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#4A90E2',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 8,
  },
  tagsContainer: {
    marginVertical: 16,
  },
  tagsList: {
    paddingVertical: 8,
  },
  tagButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  tagButtonSelected: {
    backgroundColor: '#4A90E2',
  },
  tagText: {
    color: '#666',
    fontSize: 14,
  },
  tagTextSelected: {
    color: '#fff',
  },
  addTagButton: {
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagInputModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  tagInputContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    width: '80%',
  },
  tagInputTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  tagInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  tagInputButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  tagInputButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#4A90E2',
    marginLeft: 8,
  },
  tagInputButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
}); 