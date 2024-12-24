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
  Image,
  ActivityIndicator
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Memory, MemoryLocation, MemoryPhoto } from '../types/memories';
import DateTimePicker from '@react-native-community/datetimepicker';
import { formatDateToTurkish } from '../utils/date-utils';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';
import { colors, globalStyles } from '../constants/styles';

export default function EditMemoryModal() {
  const params = useLocalSearchParams();
  const [memory, setMemory] = useState<Memory>(JSON.parse(params.memory as string));
  
  const [title, setTitle] = useState(memory.title);
  const [content, setContent] = useState(memory.content);
  const [memoryDate, setMemoryDate] = useState(new Date(memory.memoryDate));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<MemoryLocation | null>(
    memory.location || null
  );
  const [region, setRegion] = useState({
    latitude: memory.location?.latitude || 41.0082,
    longitude: memory.location?.longitude || 28.9784,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [photos, setPhotos] = useState<MemoryPhoto[]>(memory?.photos || []);
  const [uploading, setUploading] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>(memory?.tags || []);
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
    if (params.memory) {
      const parsedMemory = JSON.parse(params.memory as string);
      
      // Fotoğraf URL'lerini düzelt
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
      setTitle(parsedMemory.title);
      setContent(parsedMemory.content);
      setMemoryDate(new Date(parsedMemory.memoryDate));
      setSelectedLocation(parsedMemory.location || null);
      setPhotos(parsedMemory.photos || []);
      setSelectedTags(parsedMemory.tags || []);
    }
  }, [params.memory]);

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

  const searchLocation = async (searchText: string) => {
    try {
      const fullSearchText = searchText.includes('Turkey') ? searchText : `${searchText}, Turkey`;
      const results = await Location.geocodeAsync(fullSearchText);
      
      if (results && results.length > 0) {
        const { latitude, longitude } = results[0];
        
        const newRegion = {
          latitude,
          longitude,
          latitudeDelta: Platform.OS === 'android' ? 0.005 : 0.0922,
          longitudeDelta: Platform.OS === 'android' ? 0.005 : 0.0421,
        };
        
        setRegion(newRegion);

        const reverseResults = await Location.reverseGeocodeAsync({
          latitude,
          longitude
        });

        let locationName = searchText;
        if (reverseResults && reverseResults.length > 0) {
          const address = reverseResults[0];
          locationName = [
            address.street,
            address.district,
            address.city,
            address.region
          ].filter(Boolean).join(', ');
        }

        setSelectedLocation({
          latitude,
          longitude,
          name: locationName
        });
      } else {
        Alert.alert('Uyarı', 'Bu konum bulunamadı. Lütfen başka bir arama yapın.');
      }
    } catch (error) {
      console.error('Konum arama hatası:', error);
      Alert.alert('Hata', 'Lütfen internet bağlantınızı kontrol edin ve tekrar deneyin.');
    }
  };

  const pickImage = async () => {
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
          
          const filePath = `memories/${memory.relationId}/${timestamp}.jpg`;
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

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Hata', 'Lütfen başlık ve anı içeriğini doldurun');
      return;
    }

    try {
      const relationRef = doc(db, 'relations', memory.relationId);
      const relationDoc = await getDoc(relationRef);
      
      if (relationDoc.exists()) {
        const updatedMemory: Memory = {
          ...memory,
          title: title.trim(),
          content: content.trim(),
          memoryDate: memoryDate.getTime(),
          photos: photos.length > 0 ? photos : null,
          tags: selectedTags.length > 0 ? selectedTags : null
        };

        if (selectedLocation) {
          updatedMemory.location = selectedLocation;
        } else {
          updatedMemory.location = null;
        }

        const currentMemories = relationDoc.data().memories || [];
        const updatedMemories = currentMemories.map((m: Memory) => 
          m.id === memory.id ? updatedMemory : m
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
      console.error('Anı güncelleme hatası:', error);
      Alert.alert('Hata', 'Anı güncellenirken bir hata oluştu');
    }
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
            placeholderTextColor={colors.textLight}
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
            <Text style={styles.locationButtonLabel}>Konum</Text>
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
                <View style={styles.searchInputContainer}>
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
                    returnKeyType="search"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity 
                    style={styles.searchButton}
                    onPress={() => {
                      if (selectedLocation?.name) {
                        searchLocation(selectedLocation.name);
                      }
                    }}
                  >
                    <Text style={styles.searchButtonText}>Ara</Text>
                  </TouchableOpacity>
                </View>
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
            placeholderTextColor={colors.textLight}
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
    padding: 16,
  },
  content: {
    flex: 1,
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
  searchInputContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 12,
  },
  searchButton: {
    backgroundColor: '#4A90E2',
    padding: 10,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  map: {
    flex: 1,
  },
  locationPickerButtons: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
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
  photosContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  photoList: {
    gap: 8,
  },
  photoItem: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
    borderRadius: 8,
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#f8f8f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagsContainer: {
    marginBottom: 16,
  },
  tagsList: {
    gap: 8,
  },
  tagButton: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  tagButtonSelected: {
    backgroundColor: '#4A90E2',
  },
  tagText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
  },
  tagTextSelected: {
    color: '#fff',
  },
  addTagButton: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
}); 